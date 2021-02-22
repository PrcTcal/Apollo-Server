const MusicModel = require('../database/music');
const Mongoose = require('mongoose');
const Dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const readline = require('readline');
const fs = require('fs');
const ProgressBar = require('progress');
const testModule = require('./testmodule');

const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const createTable = (db, table) => {
    return new Promise(async (resolve, reject) => {
        if(db == 'mongo'){
            // dest가 mongoDB일 경우
            console.log('waiting for creating table for a moment...');
            console.log('creating table process terminated');
            return resolve(true);
        } else {
            let dynamodb = new AWS.DynamoDB();
            
            let params = {
                TableName : table,
                KeySchema: [       
                    { AttributeName: "dummy", KeyType: "HASH"},  //Partition key
                    { AttributeName: "id", KeyType: "RANGE"}  //Sort key
                ],
                AttributeDefinitions: [
                    { AttributeName: "dummy", AttributeType: "N" },
                    { AttributeName: "id", AttributeType: "S" },
                    { AttributeName: "Artist", AttributeType: "S" },
                    { AttributeName: "songTitle", AttributeType: "S" },
                    { AttributeName: "idx", AttributeType: "N" }
                ],
                BillingMode: 'PAY_PER_REQUEST',
                LocalSecondaryIndexes: [
                    { 
                        IndexName: "Artist-index", 
                        KeySchema: [
                            { AttributeName: "dummy", KeyType: "HASH"},  //Partition key
                            { AttributeName: "Artist", KeyType: "RANGE"}  //Sort key
                        ],
                        Projection: { ProjectionType: "ALL" }
                    },
                    { 
                        IndexName: "songTitle-index", 
                        KeySchema: [
                            { AttributeName: "dummy", KeyType: "HASH"},  //Partition key
                            { AttributeName: "songTitle", KeyType: "RANGE" }  //Sort key
                        ],
                        Projection: { ProjectionType: "ALL" }
                    },
                    { 
                        IndexName: "idx-index", 
                        KeySchema: [
                            { AttributeName: "dummy", KeyType: "HASH" },  //Partition key
                            { AttributeName: "idx", KeyType: "RANGE" }  //Sort key
                        ],
                        Projection: { ProjectionType: "ALL" }
                    }
                ]
            };
            dynamodb.createTable(params, async (err, data) => {
                if(err){
                    console.log('create table failed: ' + err.code);
                    if(err.code == 'ResourceInUseException') {
                        return resolve(true);
                    } else {
                        return reject(err);
                    }
                } else {
                    console.log('created table successfully: ' + JSON.stringify(data, null, 2));
                    console.log('waiting for creating table for a moment...');
                    dynamodb.waitFor('tableExists', { TableName: table }, (we, wd) => {
                        if(we){
                            console.error(we);
                        } else {
                            console.log('creating table process terminated');
                            return resolve(true);
                        }
                    });
                }
            });    
        } 
    });
}

const deleteTable = (db, table) => {
    return new Promise(async (resolve, reject) => {
        if(db == 'mongo'){
            try{
                let mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
                music = await mongo_music.deleteMany({});
                console.log('delete data success : ' + music);
                console.log('waiting for deleting table for a moment...');
                music = await Mongoose.connection.db.dropCollection(table + 's');
                if(music) {
                    console.log('deleting table process terminated');
                    return resolve(true);
                }
            } catch(e) {
                return reject(e);
            }
            
        } else {
            let dynamodb = new AWS.DynamoDB();
            let params = {
                TableName : table
            };
            dynamodb.deleteTable(params, async (err, data) => {
                if(err){
                    console.log('delete table failed: ' + err.code);
                    return reject(err);
                } else {
                    console.log('delete table success: ' + JSON.stringify(data, null, 2));
                    console.log('waiting for deleting table for a moment...');
                    dynamodb.waitFor('tableNotExists', { TableName: table }, (we, wd) => {
                        if(we){
                            console.error(we);
                        } else {
                            console.log('deleting table process terminated');
                            return resolve(true);
                        }
                    });
                }
            });    
        }
    });
}

const count = (db, table) => {
    return new Promise(async (resolve, reject) => {
        if(db == 'mongo'){
            let mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
            let music = await mongo_music.find();
            return resolve(music.length);
        } else {
            let cnt = 0;
            let dynamo_music = Dynamoose.model(table, MusicModel.dynamo_schema);
            music = dynamo_music.scan();
            let temp = music;
            music = await music.exec();
            console.log(music.count);
            cnt += music.count;
            while(music.lastKey != null){
                music = await temp.startAt(music.lastKey).exec();
                cnt += music.count;
                console.log(cnt);
            }
            console.log('total : ' + cnt);
            
            return resolve(cnt);
        }
    });  
}

// mongoDB에 원본 데이터(tests 컬렉션) 갯수 뻥튀기용 더미 데이터 생성용 메서드
const createDummyData = async (table) => {
    mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
    music = await mongo_music.find().select('-_id');
    let rs = [];
            
    // mongo 6808개 -> mongo 백만개 export할 때 => dummy data 생성용
    for(let i = 0 ; i < 147 ; i++){
        console.log(i);
        for(let k = 0 ; k < 6808 && rs.length < 1000000 ; k++){
            rs.push({
                id: uuid.v4(),
                Artist: music[k].Artist,
                songTitle: music[k].songTitle,
                info: music[k].info,
                actv: music[k].actv,
                idx: music[k].idx
            });
        }
    }
    console.log(rs.length);
    try{
        console.log("exported data size : " + rs.length);
        if(rs.length == 0) return reject(new Error('There is No Data or Table'));
        fs.writeFileSync('../../migrationData/export.json', JSON.stringify(rs), 'utf8');
        console.log('writeFileSync completed');
        return resolve(true);
    } catch(e){
        return reject(e);
    }
}

const exportData = (src, table, bar) => {
    return new Promise(async (resolve, reject) => {
        let start = new Date();
        let params = {}, music, mongo_music, dynamo_music;
        let docClient = new AWS.DynamoDB.DocumentClient();
        let rs = [];

        if(src == 'mongo'){
            mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
           
            try{
                for(let fileNum = 0 ; fileNum < 10 ; fileNum++){
                    console.log(fileNum);
                    music = await mongo_music.find().select('-_id').limit(100000).skip(100000 * fileNum);
                    fs.writeFileSync(`../../tempData/export${fileNum}.json`, JSON.stringify(music), 'utf8');
                }
                console.log('writeFileSync completed');
                return resolve((new Date() - start));
            } catch(e){
                return reject(e);
            }
            
        } else {
            if(src == 'dynamoose'){
                dynamo_music = Dynamoose.model(table, MusicModel.dynamo_schema);
                music = dynamo_music.query("dummy").eq(0);
                let temp = music;
                music = await music.attributes(["id", "Artist", "songTitle", "info", "idx", "actv"]).exec();
                for(let item of music){
                    rs.push(item);
                }
                if(music.count == 0) {
                    return reject(new Error("There is No Data or Table"));
                } else if(music.lastKey != null){
                    while(music.lastKey != null){
                        music = await temp.startAt(music.lastKey).attributes(["id", "Artist", "songTitle", "info", "idx", "actv"]).exec();
                        for(let item of music){
                            rs.push(item);
                        }
                    } 
                }
                try{
                    console.log("exported data size : " + rs.length);
                    if(rs.length == 0) return reject(new Error('There is No Data or Table'));
                    fs.writeFileSync('../../migrationData/export.json', JSON.stringify(rs), 'utf8');
                    console.log('writeFileSync completed');
                    return resolve(true);
                } catch(e){
                    return reject(e);
                }

            } else {
                // using scan
                params = {
                    TableName: table,
                    //ProjectionExpression: "id, Artist, songTitle, info, idx, actv"
                };
                
                let checking = (doc, par) => {
                    return new Promise((resolve, reject) => {
                        doc.scan(par, (err, data) => {
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(data);
                            }
                        });
                    });
                }
                let startKey = {}, fileNum = 0;
                while(startKey != null){
                    await checking(docClient, params).then(function(data){
                        if(data.Count == 0) return reject(new Error("There is No Data or Table"));
                        if(data.LastEvaluatedKey != null) {
                            params.ExclusiveStartKey = data.LastEvaluatedKey;
                            startKey = data.LastEvaluatedKey;
                        } else {
                            startKey = null;
                        }
                        for(let item of data.Items){
                            delete item.dummy;
                            delete item.srchArtist;
                            delete item.srchsongTitle;
                            delete item.srchidx;
                            rs.push(item);
                            if(rs.length % 10000 == 0) bar.tick();
                            if(rs.length == 100000){
                                //console.log(fileNum + " exported data size : " + rs.length);
                                if(rs.length == 0) return reject(new Error('There is No Data or Table'));
                                fs.writeFileSync(`../../tempData/export${fileNum++}.json`, JSON.stringify(rs), 'utf8');
                                rs = [];
                                //console.log('writeFileSync completed');
                            }
                        }
                        //console.log(rs.length);
                    });
                } 
                
                return resolve((new Date() - start));   
            }
        }
    });
}

const importData = (dest, table, total, m) => {
    return new Promise(async (resolve, reject) => {
        let start = new Date();
        console.log(total);
        let cur = 0, count = 0;
        let maxCount = total % 25 == 0 ? Math.floor(total / 25) : Math.floor(total / 25) + 1;
        let params = {}, music, mongo_music, dynamo_music;
        if(total == 0) return reject(new Error("There is no Data or Table"));

        if(dest == 'mongo'){
            mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
            let rs = JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"}));
            music = await mongo_music.insertMany(rs);
            if(music.length < rs.length) console.log('Data Migration did not completed well for some reason');
            return resolve((new Date() - start));

        } else {

            if(dest == 'dynamoose'){
                dynamo_music = Dynamoose.model(table, MusicModel.dynamo_schema);
                console.log('executing batch...');
                while(total > cur){
                    let arr = [];
                    for(let i = 0 ; i < 25 && total > cur ; i++){
                        rs[cur].dummy = 0;
                        rs[cur].srchArtist = rs[cur].Artist;
                        rs[cur].srchsongTitle = rs[cur].songTitle;
                        rs[cur].srchidx = rs[cur].idx;
                        arr.push(rs[cur++]);
                    }

                    // 동기식 batch
                    music = await dynamo_music.batchPut(arr);
                    count++;
                    if(music.unprocessedItems.length > 0) console.log(music);
                    console.log(count + ' batch success');
                    
                }
                return resolve(true);

            } else {
                AWS.events.on('retry', function(resp) {
                    if(resp.retryCount > 5) console.log(resp.error.requestId + ' - current retry count : ' + resp.retryCount);
                });

                let dynamodb = new AWS.DynamoDB();
                let semaphore = 0, dummyVal = 0;
                let later = [];
                let rs = JSON.parse(fs.readFileSync(`../../tempData/export${m}.json`, {encoding: "utf8"}));
                const getMap = (obj) => {
                    let result = {};
                    for(let mkey in obj){
                        if(typeof(obj[mkey]) == 'string'){
                            result[mkey] = { "S" : obj[mkey] };
                        } else if(typeof(obj[mkey]) == 'number'){
                            result[mkey] = { "N" : String(obj[mkey]) };
                        } else if(typeof(obj[mkey]) == 'boolean'){
                            result[mkey] = { "BOOL" : obj[mkey] };
                        } else if(typeof(obj[mkey]) == 'object') {
                            result[mkey] = { "M" : getMap(obj[mkey]) };
                        }
                    }
                    return result;
                }
                cur = 0; 
                count = 0;
                console.log(`inserting export${m}.json===================================`);
                while(total > 0){
                    let req = {}, Item = {};
                    req[table] = [];

                    for(let i = 0 ; i < (total > 25 ? 25 : total) ; i++){
                        
                        Item = getMap(rs[cur]);
                        // partition key와 LSI는 Item객체에 직접 할당을 해줘야한다(table schema).
                        Item["dummy"] = { "N": String(dummyVal++) };
                        Item["srchArtist"] = { "S": rs[cur].Artist };
                        Item["srchsongTitle"] = { "S": rs[cur].songTitle };
                        Item["srchidx"] = { "N": String(rs[cur].idx) };
                        
                        req[table].push({PutRequest : { "Item": Item }});
                        cur++;
                        if(dummyVal % 5000 == 0) dummyVal = 0;
                    }

                    total = total >= 25 ? total -= 25 : 0;
                    params = {
                        RequestItems: req
                    };
                    
                    let processItemCallback = async function(perr, pdata){
                        if(perr){
                            if(perr.code == 'ProvisionedThroughputExceededException') {
                                // perr에 requestId가 있음.
                                // batch를 할 당시에 리턴값인 AWS request를 map에 저장해놓고 여기서 불러오면 파라메터를 전달할 수 있지 않을까?
                                // perr에 code, time, requestId, statusCode, retryable이 있는데 time은 에러 발생 시간이라 AWSRequest에 없고
                                // requestId도 왠지모르겠는데 AWSRequest에서 찾을 수가 없음
                                console.log('Excpetion occurred : ' + perr.code);
                                later.push({requestId: perr.requestId});
                                semaphore--;
                                console.log('semaphore : ' + semaphore);
                                console.log(later.length);
                                count++;
                                console.log('batch failed : ' + count);
                                if(count == maxCount) {
                                    let end = new Date();
                                    console.log(end - start);
                                    return resolve(end - start);
                                }
                            } else {
                                return reject(perr);
                            }
                        } else {
                            if(Object.keys(pdata.UnprocessedItems).length != 0){
                                //console.log("unprocessed : " + pdata.UnprocessedItems + ", start rebatching");
                                await sleep(500);
                                dynamodb.batchWriteItem({RequestItems: pdata.UnprocessedItems}, processItemCallback);
                            } else {
                                semaphore--;
                                console.log('semaphore : ' + semaphore);
                                count++;
                                console.log('batch success => ' + count);
                                if(count % 250 == 0) console.log("time consumed : " + (new Date() - start));
                                if(count == maxCount) {
                                    let end = new Date();
                                    console.log(end - start);
                                    return resolve(end - start);
                                }
                            }
                        }
                    };
                    
                    semaphore++;
                    dynamodb.batchWriteItem(params, processItemCallback);
                    //if(semaphore == 16) console.log('stopped');
                    while(semaphore >= 16){
                        await sleep(200);
                    }
                    
                }

            }
        }
    })
}


// 명령어로 입력하여 json object에 field 추가 및 값 수정하는 메서드
// deprecated code
const recurConvert = (json, option) => {
    return new Promise((resolve, reject) => {
        console.clear();
        console.log('=============================================<< commands >>=============================================');
        console.log('[type - m] [Field Name]                                            : add a single non-existing map field');
        console.log('[type - s | n | b] [Field Name] [Field Value]                      : add string, number, bool type field');
        console.log('[type - s | n | b] [Map Route] [Field Name] [Field Value]          : add string, number, bool type field in designated existing map field');
        console.log('[type - m] [Map Route - ex) info.final.correct] [Field Type - s | n | b] [Field Name] [Field Value]');
        console.log('                               : add string, number, bool type field in designated non-existing map field');
        console.log('                                 both the last field in Map Route and adding Field Name should be non-existing field');
        console.log('                                 contrary to all the other fields which in Map Route must be existing one');
        console.log('done                                                               : terminating input process');
        console.log('========================================================================================================\n');
        const getObject = (jsonObject, key, mapRoute, idx, isMap) => {
            if(isMap){
                if(idx < mapRoute.length-2){
                    return getObject(jsonObject[key], mapRoute[idx+1], mapRoute, (idx+1), isMap);
                } else {
                    return jsonObject[key];
                }
            } else {
                if(idx < mapRoute.length-1){
                    return getObject(jsonObject[key], mapRoute[idx+1], mapRoute, (idx+1), isMap);
                } else {
                    return jsonObject[key];
                }
            }  
        };
        const recurMapAddCallback = (answer) => {
            console.log(json);
            let inputArr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
            if(inputArr.length > 1) console.log(inputArr);
            let map = inputArr[1].split('.');
            if(inputArr == 'done'){
                return resolve(json);
            }
            if(inputArr.length == 4){
                // 현존하는 map object에 S, N, B타입 데이터를 삽입할때
                if(inputArr[0] == "s"){
                    getObject(json, map[0], map, 0, false)[inputArr[2]] = inputArr[3];
                } else if(inputArr[0] == "n"){
                    getObject(json, map[0], map, 0, false)[inputArr[2]] = Number(inputArr[3]);
                } else if(inputArr[0] == "b"){
                    getObject(json, map[0], map, 0, false)[inputArr[2]] = inputArr[3].toLowerCase() == 'true' ? true : false;
                }
            } else if(inputArr.length == 5){
                // 현존하는 map object에 M타입 데이터를 삽입할때
                if(inputArr[0] == "m"){
                    let temp = {};
                    if(inputArr[2] == 's'){
                        temp[inputArr[3]] = inputArr[4];
                    } else if(inputArr[2] == 'n'){
                        temp[inputArr[3]] = Number(inputArr[4]);
                    } else if(inputArr[2] == 'b'){
                        temp[inputArr[3]] = inputArr[4].toLowerCase() == 'true' ? true : false;;
                    }
                    getObject(json, map[0], map, 0, true)[map[map.length - 1]] = temp;
                }
            // depth 0에서 S, N, B 데이터를 추가할때
            } else if(inputArr.length == 3){
                if(inputArr[0] == "s"){
                    json[inputArr[1]] = inputArr[2];
                } else if(inputArr[0] == "n"){
                    json[inputArr[1]] = Number(inputArr[2]);
                } else if(inputArr[0] == "b"){
                    json[inputArr[1]] = inputArr[2].toLowerCase() == "true" ? true : false;
                }

            // depth 0에서 M 데이터를 추가할때
            } else if(inputArr.length == 2){
                if(inputArr[0] == "m"){
                    json[inputArr[1]] = {};
                }
            
            }
            console.log(json);
            r1.question(`[System] ${option}할 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>`, recurMapAddCallback);
        };
        
        r1.question(`[System] ${option}할 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>`, recurMapAddCallback);
        
    });
}

const convert = (fileNum, option) => {
    return new Promise(async (resolve, reject) => {
        let jsonArray = JSON.parse(fs.readFileSync(`../../tempData/export${fileNum}.json`, 'utf8'));
        console.log('read finished - item count : ' + jsonArray.length);
        const bar = new ProgressBar(':percent', {total:100});
        let output = [];
        let progress = 0;

        for(let json of jsonArray){
            if(option == 'add') output.push(testModule.addFunc(json));
            if(option == 'edit') output.push(testModule.editFunc(json));
            if(option == 'delete') output.push(testModule.deleteFunc(json));

            progress++;
            if(progress % 1000 == 0) bar.tick();
        }

        fs.writeFileSync(`../../tempData/export${fileNum}.json`, JSON.stringify(output), 'utf8');
        console.log(`converted export${fileNum}.json successfully`);
        return resolve(true);
        
    });
}

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const answerCallback = async (answer) => {  
    let arr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
    let result, operation;
    console.log(arr);


    if(arr[0] == 'count'){
        operation = 'count';
        if(arr.length == 3){
            result = await count(arr[1], arr[2]);
            if(cnt > 0) console.log('total count : ' + result);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> count [target DB] [Table Name]');
        }

    } else if(arr[0] == 'create'){
        operation = 'create';
        if(arr.length == 3){
            result = await createTable(arr[1], arr[2]);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> create [target DB] [Table Name]');
        }        
    
    } else if(arr[0] == 'delete'){
        operation = 'delete';
        if(arr.length == 3){
            result = await deleteTable(arr[1], arr[2]);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> delete [target DB] [Table Name]');
        } 
    
    } else if(arr[0] == 'export'){
        operation = 'export';
        if(arr.length == 3){
            const bar = new ProgressBar('Exporting - [:percent]', {total:100});
            result = await exportData(arr[1], arr[2], bar);
            
            if(result) {
                console.log('consumed time : ' + result + 'ms');
                console.log('exporting process terminated successfully');
            }
            else console.log('error occurred while executing export process');
            
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> export [source DB] [source Table Name]');
        }

    } else if(arr[0] == 'import'){
        operation = 'import';
        if(arr.length == 3){
            let total = 0;
            for(let m = 0 ; m < 10 ; m++){
                const time = await importData(arr[1], arr[2],JSON.parse(fs.readFileSync(`../../tempData/export${m}.json`, {encoding: "utf8"})).length, m);
                
                if(time) {
                    console.log('importing process terminated successfully');
                    total += time;
                }
                
            }
            console.log('total consumed time : ' + total + 'ms');       
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> import [dest DB] [dest Table Name]');
        }

    } else if(arr[0] == 'migrate'){
        console.log('This command is currently not available');
        /*
        if(arr.length == 5){
            await createTable(arr[3], arr[4]);
            const ex = await exportData(arr[1], arr[2]);
            if(ex) console.log('exporting process terminated successfully');
            else console.log('error occurred while executing export process');

            const total = await count(arr[1], arr[2]);
            const im = await importData(arr[3], arr[4], total);
            if(im) console.log('importing process terminated successfully');
            else console.log('error occurred while executing import process');

            await deleteTable(arr[1], arr[2]);

        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> migrate [source DB] [source Table Name] [Dest DB] [Dest Table Name]');
        }
        */

    } else if(arr[0] == 'copy') {
        console.log('This command is currently not available');
        /*
        await createTable(arr[3], arr[4]);

        const ex = await exportData(arr[1], arr[2]);
        if(ex) console.log('exporting process terminated successfully');
        else console.log('error occurred while executing export process');

        const total = await count(arr[1], arr[2]);
        const im = await importData(arr[3], arr[4], total);
        if(im) console.log('importing process terminated successfully');
        else console.log('error occurred while executing import process');
        */
    } else if(arr == 'exit'){
        r1.close();
        process.exit();
    } else if(arr == 'ct'){
        for(let m = 0 ; m < 10 ; m++){
            let rs = JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"}));
            console.log(rs.length);
        }
    } else if(arr == 'bar'){
        const bar = new ProgressBar(':percent', {total:10});
        await test(bar);
        console.log('process terminated');
    } else if(arr[0] == 'convert'){
        operation = 'convert';
        for(let i = 0 ; i < 10 ; i++){
            result = await convert(i, arr[1]);
        }
        
    }

    
    console.log('=============================================<< commands >>=============================================');
    console.log('create [DB type] [Table name]                  : creating table');
    console.log('count [DB type] [Table name]                   : return total count of data in table');
    console.log('export [source DB type] [Table name]           : retrieve data from source DB and save it as JSON file');
    console.log('import [destination DB type] [Table name]      : read data from JSON file and insert it into destination DB');
    console.log('convert [File Name] [add | edit | delete]      : add | edit | delete items in json file');
    console.log('exit                                           : terminating CLI process');
    console.log('========================================================================================================\n');

    r1.question('>> ', answerCallback);
};

try{
    console.clear();
    
    // MongoDB 연결
    Mongoose.connect(config.mongo_local_config, config.mongo_config)
    .then(() => console.log('Successfully connected to MongoDB\n'))
    .then(() => r1.question('>> ', answerCallback))
    .catch(e => console.error(e));
    Mongoose.Promise = global.Promise;

    //AWS_SDK 연결 세팅
    AWS.config.update(config.aws_remote_config);
    // Create the DynamoDB service object
    var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    console.log('successfully connected to dynamoDB\n');
    console.log('=============================================<< commands >>=============================================');
    console.log('create [DB type] [Table name]                  : creating table');
    console.log('count [DB type] [Table name]                   : return total count of data in table');
    console.log('export [source DB type] [Table name]           : retrieve data from source DB and save it as JSON file');
    console.log('import [destination DB type] [Table name]      : read data from JSON file and insert it into destination DB');
    console.log('convert [add | edit | delete] [id : optional]  : add | edit | delete item in export.json file');
    console.log('exit                                           : terminating CLI process');
    console.log('========================================================================================================\n');
} catch(e) {
    console.error(e);
}

const test = (bar) => {
    return new Promise(async (resolve, reject) => {
        for(let i = 0 ; i < 10 ; i++){
            await sleep(1000);
            bar.tick();
        }
        return resolve(true);
    })
}