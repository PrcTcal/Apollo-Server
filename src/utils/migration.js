const MusicModel = require('../database/music');
const Mongoose = require('mongoose');
const Dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const readline = require('readline');
const fs = require('fs');

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
                ProvisionedThroughput: {       
                    ReadCapacityUnits: 5, 
                    WriteCapacityUnits: 5
                },
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
                    //await sleep(5000);
                    //console.log('creating table process terminated');
                    dynamodb.waitFor('tableExists', { TableName: table }, (we, wd) => {
                        if(we){
                            console.error(we);
                        } else {
                            console.log('creating table process terminated');
                            return resolve(true);
                        }
                    });
                    //return resolve(true);
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
                    //await sleep(5000);
                    //console.log('deleting table process terminated');
                    dynamodb.waitFor('tableNotExists', { TableName: table }, (we, wd) => {
                        if(we){
                            console.error(we);
                        } else {
                            console.log('deleting table process terminated');
                            return resolve(true);
                        }
                    });
                    //return resolve(true);
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
            let params = {
                TableName: table,
                KeyConditionExpression: "dummy = :dummy",
                ExpressionAttributeValues: { ":dummy" : 0 }
            };
            let docClient = new AWS.DynamoDB.DocumentClient();
            docClient.query(params, (err, data) => {
                if(err){
                    return reject(err);
                } else {
                    if(data.LastEvaluatedKey != null){
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        docClient.query(params, (e, d) => {
                            if(e){
                                return reject(e);
                            } else {
                                return resolve(data.Count + d.Count);
                            }
                        });
                    } else {
                        return resolve(data.Count);
                    }
                }
            });
        }
    });  
}

const exportData = (src, table) => {
    return new Promise(async (resolve, reject) => {
        let params = {}, music, mongo_music, dynamo_music;
        let docClient = new AWS.DynamoDB.DocumentClient();
        let rs = [];

        if(src == 'mongo'){
            mongo_music = await Mongoose.model(table, MusicModel.mongo_schema);
            music = await mongo_music.find().select('-_id');
            // mongo 6808개 -> mongo 백만개 export할 때
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
            
           /*
            rs = music;
            try{
                for(let m = 0 ; m < 10 ; m++){
                    console.log(m);
                    music = await mongo_music.find().select('-_id').limit(100000).skip(100000*m);
                    fs.writeFileSync(`../../migrationData/export${m}.json`, JSON.stringify(music), 'utf8');
                }
                console.log('writeFileSync completed');
                return resolve(true);
            } catch(e){
                return reject(e);
            }
            */
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
            } else {
                params = {
                    TableName: table,
                    KeyConditionExpression: "dummy = :dummy",
                    ExpressionAttributeValues: { ":dummy" : 0 },
                    ProjectionExpression: "id, Artist, songTitle, info, idx, actv"
                };

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
                        }
                    });
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
        
    });
}

const importData = (dest, table, total, m) => {
    return new Promise(async (resolve, reject) => {
        let start = new Date();
        console.log(total);
        let cur = 0, count = 0;
        let maxCount = total % 25 == 0 ? Math.floor(total / 25) : Math.floor(total / 25) + 1;
        let params = {}, music, mongo_music, dynamo_music, retry = 0;
        let rs = JSON.parse(fs.readFileSync("../../migrationData/export.json", {encoding: "utf8"}));
        //if(rs.length == 0) return reject(new Error("There is no Data or Table"));
        if(dest == 'mongo'){
            mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
            for(let i = 0 ; i < 100 ; i++){
                console.log(i);
                let arr = [];
                for(let k = 0 ; k < 10000 ; k++){
                    arr.push(rs[k + (i * 10000)]);
                }
                music = await mongo_music.insertMany(arr);
            }
            //music = await mongo_music.insertMany(rs);
            if(music.length < rs.length) console.log('Data Migration did not completed well for some reason');
            return resolve(true);
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
                    
                    // 비동기식 batch
                    if(cur % 400 == 0) await sleep(5000);
                    /*
                    let processItemCallback = async (perr, pdata) => {
                        if(perr){
                            return reject(perr);
                        } else {
                            console.log(pdata);
                            if(pdata.unprocessedItems.length != 0){
                                console.log("unprocessed : " + pdata.unprocessedItems + ", start rebatching");
                                //await sleep(Math.min(Math.pow(2, retry++), 500));
                                await sleep(500);
                                dynamo_music.batchPut(pdata.unprocessedItems, processItemCallback);
                            } else {
                                count++;
                                console.log('batch success => ' + count);
                                if(count == maxCount) return resolve(true);
                            }
                        }
                    }
                    dynamo_music.batchPut(arr, processItemCallback);
                    
                    music = dynamo_music.batchPut(arr, async (err, data) => {
                        if(err){
                            console.log('callback error');
                            return reject(err);
                        } else {
                            console.log(data);
                            if(data.unprocessedItems.length != 0){
                                console.log('batch failed : ' + data);
                                await sleep(500);
                                dynamo_music.batchPut(data.unprocessedItems);
                            } else {
                                count++;
                                console.log('batch success => ' + count);
                                if(count == maxCount) return resolve(true);
                            }
                        }
                    });
                    */
                    // 동기식 batch
                    
                    music = await dynamo_music.batchPut(arr);
                    count++;
                    if(music.unprocessedItems.length > 0) console.log(music);
                    console.log(count + ' batch success');
                    
                }
                return resolve(true);
            } else {
                let dynamodb = new AWS.DynamoDB();
                    let rs = JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"}));
                    cur = 0; 
                    count = 0;
                    total = 100000;
                    console.log(`inserting export${m}.json===================================`);
                    while(total > 0){
                        let req = {}, Item = {};
                        req[table] = [];
                        for(let i = 0 ; i < (total > 25 ? 25 : total) ; i++){
                            Item = {
                                "dummy": { "N": "0" },
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
                        }
                        total = total >= 25 ? total -= 25 : 0;
                        params = {
                            RequestItems: req
                        };
    
                        let processItemCallback = async function(perr, pdata){
                            if(perr){
                                return reject(perr);
                            } else {
                                if(Object.keys(pdata.UnprocessedItems).length != 0){
                                    console.log("unprocessed : " + pdata.UnprocessedItems + ", start rebatching");
                                    await sleep(500);
                                    dynamodb.batchWriteItem({RequestItems: pdata.UnprocessedItems}, processItemCallback);
                                } else {
                                    count++;
                                    console.log('batch success => ' + count);
                                    if(count == maxCount) {
                                        let end = new Date();
                                        console.log(end - start);
                                        return resolve(true);
                                    }
                                }
                            }
                        };
                        if(cur % 400 == 0) await sleep(6000);
                        dynamodb.batchWriteItem(params, processItemCallback);
                    }
                

            }
        }
    })
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
            const result = await exportData(arr[1], arr[2]);
            if(result) console.log('exporting process terminated successfully');
            else console.log('error occurred while executing export process');
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> export [source DB] [source Table Name]');
        }

    } else if(arr[0] == 'import'){
        if(arr.length == 3){
            const result = await importData(arr[1], arr[2], JSON.parse(fs.readFileSync("../../migrationData/export.json", {encoding: "utf8"})).length, 0);
            /*
            for(let m = 0 ; m < 10 ; m++){
                const result = await importData(arr[1], arr[2],JSON.parse(fs.readFileSync("../../migrationData/export0.json", {encoding: "utf8"})).length, m);
                if(result) console.log('importing process terminated successfully');

            }*/
            if(result) console.log('importing process terminated successfully');
            else console.log('error occurred while executing import process');        
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> import [dest DB] [dest Table Name]');
        }

    } else if(arr[0] == 'migrate'){
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
    
    } else if(arr[0] == 'copy') {
        await createTable(arr[3], arr[4]);

        const ex = await exportData(arr[1], arr[2]);
        if(ex) console.log('exporting process terminated successfully');
        else console.log('error occurred while executing export process');

        const total = await count(arr[1], arr[2]);
        const im = await importData(arr[3], arr[4], total);
        if(im) console.log('importing process terminated successfully');
        else console.log('error occurred while executing import process');
    
    } else if(arr == 'exit'){
        r1.close();
        process.exit();
    } else if(arr = 'ct'){
        for(let m = 0 ; m < 10 ; m++){
            let rs = JSON.parse(fs.readFileSync(`../../migrationData/export${m}.json`, {encoding: "utf8"}));
            console.log(rs.length);
        }
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

