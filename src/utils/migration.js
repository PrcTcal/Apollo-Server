const MusicModel = require('../database/music');
const Mongoose = require('mongoose');
const Dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const readline = require('readline');
const fs = require('fs');
const ProgressBar = require('progress');

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
                    ProjectionExpression: "id, Artist, songTitle, info, idx, actv"
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
                
                /*
                // using query
                let checking = (doc, par) => {
                    return new Promise((resolve, reject) => {
                        doc.query(par, (err, data) => {
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(data);
                            }
                        });
                    });
                }
                let fileNum = 0;
                for(let i = 0 ; i < 5000 ; i++){
                    params = {
                        TableName: 'test01-music',
                        KeyConditionExpression: 'dummy = :dummy',
                        ExpressionAttributeValues: {
                            ':dummy' :  i
                        },
                        ProjectionExpression: "id, Artist, songTitle, info, idx, actv"
                    };
                    console.log(i);
                    let startKey = {};
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
                                rs.push(item);
                                if(rs.length == 100000){
                                    console.log(fileNum + " exported data size : " + rs.length);
                                    if(rs.length == 0) return reject(new Error('There is No Data or Table'));
                                    fs.writeFileSync(`../../tempData/export${fileNum++}.json`, JSON.stringify(rs), 'utf8');
                                    rs = [];
                                    console.log('writeFileSync completed');
                                }
                                
                            }
                            //console.log(rs.length);
                        });
                    }
                }
                */

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
                let rs = JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"}));
                cur = 0; 
                count = 0;
                console.log(`inserting export${m}.json===================================`);
                while(total > 0){
                    let req = {}, Item = {};
                    req[table] = [];

                    for(let i = 0 ; i < (total > 25 ? 25 : total) ; i++){
                        Item = {
                            "dummy": { "N": String(dummyVal++) },
                            "id": { "S": rs[cur].id },
                            "Artist": { "S": rs[cur].Artist },
                            "songTitle": { "S": rs[cur].songTitle },
                            "info": { 
                                "M": {
                                    "album": { "S": rs[cur].info.album },
                                    "release": { "S": rs[cur].info.release }
                                } 
                            },
                            "actv": { "BOOL": rs[cur].actv },
                            "idx": { "N": String(rs[cur].idx) },
                            "srchArtist": { "S": rs[cur].Artist },
                            "srchsongTitle": { "S": rs[cur].songTitle },
                            "srchidx": { "N": String(rs[cur].idx) }
                        };
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
                                console.log("unprocessed : " + pdata.UnprocessedItems + ", start rebatching");
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
                    if(semaphore == 16) console.log('stopped');
                    while(semaphore >= 16){
                        await sleep(200);
                    }
                    
                }

            }
        }
    })
}



const recurAdd = (param, field) => {
    return new Promise((resolve, reject) => {
        let json = {}
        const getObject = (j, key, pp, m) => {
            if(m < pp.length-1){
                return getObject(j[key], pp[m], pp, (m+1));
            } else {
                return j[key];
            }
        }
        const recurMapAddCallback = (answer) => {
            let arr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
            console.log(arr);
            let map = arr[1].split('.');
            console.log(map);
            if(arr.length == 4){
                if(arr[0] == "s"){
                    getObject(json, map[0], map, 0)[arr[2]] = arr[3];
                } else if(arr[0] == "n"){
                    getObject(json, map[0], map, 0)[arr[2]] = arr[3];
                } else if(arr[0] == "b"){
                    getObject(json, map[0], map, 0)[arr[2]] = arr[3];
                }
                r1.question('[System] 의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurMapAddCallback);
            } else if(arr.length == 3){
                // info에 album, release가 있고, 그 안에 final이라는 object를 넣고 그 안에 다시 {goal : "gg"}를 넣어야함
                //Object.assign(getObject(json, map[0], map, 0), new Object());
                r1.question('[System] 의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurMapAddCallback);
            } else if(arr == 'done'){
                r1.question('[System] 의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurAddCallback);
            }
        };
        const recurAddCallback = (answer) => {
            let arr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
            if(arr.length == 3){
                if(arr[0] == "s"){
                    json[arr[1]] = arr[2];
                } else if(arr[0] == "n"){
                    json[arr[1]] = arr[2];
                } else if(arr[0] == "b"){
                    json[arr[1]] = arr[2];
                }
                r1.question('[System] 의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurAddCallback);
            } else if(arr.length == 2){
                if(arr[0] == "m"){
                    json[arr[1]] = {};
                }
                r1.question('[System] ' + arr[1] + '의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurMapAddCallback);
            } else if(arr == 'done'){
                return resolve(json);
            }
        };
        
        r1.question('[System] 의 항목을 입력하세요 : [type] [Field Name] [Field Value]. 입력을 중단하려면 done을 입력하세요.\n>>', recurAddCallback);
        
    });
}

const convert = (option) => {
    return new Promise(async (resolve, reject) => {
        let jsonArray = JSON.parse(fs.readFileSync('../../tempData/export0.json', 'utf8'));
        console.log('read finished - item count : ' + jsonArray.length);
        
        let idx = 0;
    
        if(option == 'add'){
            let json = await recurAdd();
            json.id = uuid.v4();
            console.log('json : ');
            console.log(json);
            return resolve(true);
        } else if(option == 'edit'){
            let tt = {
                Artist: "qwe",
                songTitle: "asd",
                info: {
                    album: "zvcxvz",
                    release: "oejowgei"
                }
            };
            let pp = ["info"];
            let m = 0;
            const getObject = (json, key) => {
                if(m < pp.length-1){
                    return getObject(json[key], pp[m++]);
                } else {
                    return json[key];
                }
            }
            getObject(tt, pp[0])["final"] = "qwerty";
            console.log(tt);
            
            
            //console.log(tt);
            
        } else if(option == 'delete'){
    
        }
    })
    
    //fs.writeFileSync(`../../tempData/export${fileNum++}.json`, JSON.stringify(rs), 'utf8');
}

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const answerCallback = async (answer) => {  
    let arr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
    console.log(arr);


    if(arr[0] == 'count'){
        if(arr.length == 3){
            const cnt = await count(arr[1], arr[2]);
            if(cnt > 0) console.log('total count : ' + cnt);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> count [target DB] [Table Name]');
        }

    } else if(arr[0] == 'create'){
        if(arr.length == 3){
            await createTable(arr[1], arr[2]);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> create [target DB] [Table Name]');
        }        
    
    } else if(arr[0] == 'delete'){
        if(arr.length == 3){
            await deleteTable(arr[1], arr[2]);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> delete [target DB] [Table Name]');
        } 
    
    } else if(arr[0] == 'export'){
        if(arr.length == 3){
            const bar = new ProgressBar('Exporting - [:percent]', {total:100});
            const result = await exportData(arr[1], arr[2], bar);
            if(result) {
                console.log('consumed time : ' + result);
                console.log('exporting process terminated successfully');
            }
            else console.log('error occurred while executing export process');
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> export [source DB] [source Table Name]');
        }

    } else if(arr[0] == 'import'){
        if(arr.length == 3){
            let total = 0;
            for(let m = 0 ; m < 10 ; m++){
                const result = await importData(arr[1], arr[2],JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"})).length, m);
                if(result) {
                    console.log('importing process terminated successfully');
                    total += result;
                }
            }
            console.log('total consumed time : ' + total);       
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
        let result = await convert(arr[1]);
        console.log('convert result : ' + json);
    }

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
    console.log('create [DB type] [Table name]              : creating table');
    console.log('count [DB type] [Table name]               : return total count of data in table');
    console.log('export [source DB type] [Table name]       : retrieve data from source DB and save it as JSON file');
    console.log('import [destination DB type] [Table name]  : read data from JSON file and insert it into destination DB');
    console.log('exit                                       : terminating CLI process');
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