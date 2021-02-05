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
            dynamodb.createTable(params, (err, data) => {
                if(err){
                    console.log('create table failed: ' + err.code);
                    return reject(err);
                } else {
                    console.log('created table success: ' + JSON.stringify(data, null, 2));
                    return resolve(true);
                }
            });    
        } 
    });
}

const deleteTable = (db, table) => {
    return new Promise(async (resolve, reject) => {
        if(db == 'mongo'){
            let mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
            music = await mongo_music.deleteMany({});
            console.log(music);
            return resolve(true);
        } else {
            let dynamodb = new AWS.DynamoDB();
            let params = {
                TableName : table
            };
            dynamodb.deleteTable(params, (err, data) => {
                if(err){
                    console.log('delete table failed: ' + err.code);
                    return reject(err);
                } else {
                    console.log('delete table success: ' + JSON.stringify(data, null, 2));
                    return resolve(true);
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
            rs = music;
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
            console.log(rs.length);
            fs.writeFileSync('../../migrationData/export.json', JSON.stringify(rs), 'utf8');
            console.log('writeFileSync completed');
            return resolve(true);
        } catch(e){
            return reject(e);
        }
        
    });
}

const importData = (dest, table, total) => {
    return new Promise(async (resolve, reject) => {
        console.log(total);
        let cur = 0, count = 0;
        let maxCount = total % 25 == 0 ? Math.floor(total / 25) : Math.floor(total / 25) + 1;
        let params = {}, music, mongo_music, dynamo_music;
        let docClient = new AWS.DynamoDB.DocumentClient();
        let rs = JSON.parse(fs.readFileSync("../../migrationData/export.json", {encoding: "utf8"}));
        if(rs.length == 0) return reject(new Error("There is no Data or Table"));
        if(dest == 'mongo'){
            mongo_music = Mongoose.model(table, MusicModel.mongo_schema);
            music = await mongo_music.insertMany(rs);
            if(music.length == rs.length) {
                console.log('Data Migration success');
            } else {
                console.log('Data Migration did not completed well for some reason');
            }
            return resolve(true);
        } else {
            if(dest == 'dynamoose'){
                dynamo_music = Dynamoose.model(table, MusicModel.dynamo_schema);
                
                while(total > cur){
                    let arr = [];
                    for(let i = 0 ; i < 25 && total > cur ; i++){
                        rs[cur].dummy = 0;
                        rs[cur].srchArtist = rs[cur].Artist;
                        rs[cur].srchsongTitle = rs[cur].songTitle;
                        rs[cur].srchidx = rs[cur].idx;
                        arr.push(rs[cur++]);
                    }
                    console.log('current process : ' + cur);
                    // 비동기식 batch
                    /*
                    music = dynamo_music.batchPut(arr, async (err, data) => {
                        if(err){
                            return reject(err);
                        } else {
                            console.log(data);
                            if(data.unprocessedItems.length != 0){
                                console.log('batch failed : ' + data);
                                await sleep(500);
                                dynamo_music.batchPut(data.unprocessedItems);
                            } else {
                                count++;
                                console.log(count + ' batch success');
                                if(count == maxCount) return resolve(true);
                            }
                        }
                    });
                    if(cur % 500 == 0) await sleep(2000);
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
                                if(count == maxCount) return resolve(true);
                            }
                        }
                    };
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
            console.log('total count : ' + cnt);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> count [target DB] [Table Name]');
        }

    } else if(arr[0] == 'create'){
        if(arr.length == 3){
            const result = await createTable(arr[1], arr[2]);
            console.log('result : ' + result);
            console.log('waiting for creating table for a moment...');
            await sleep(5000);
            console.log('finished!');
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> create [target DB] [Table Name]');
        }        
    
    } else if(arr[0] == 'delete'){
        if(arr.length == 3){
            const result = await deleteTable(arr[1], arr[2]);
            console.log('result : ' + result);
            console.log('waiting for deleting table for a moment...');
            await sleep(5000);
            console.log('finished!');
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> delete [target DB] [Table Name]');
        } 
    
    } else if(arr[0] == 'export'){
        if(arr.length == 3){
            const result = await exportData(arr[1], arr[2]);
            console.log('result : ' + result);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> export [source DB] [source Table Name]');
        }

    } else if(arr[0] == 'import'){
        if(arr.length == 3){
            const total = arr[1] == 'mongo' ? await count('dynamo', config.aws_table_name) : await count('mongo', config.mongo_collection_name);
            const result = await importData(arr[1], arr[2], total);
            console.log('import result : ' + result);
        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> import [dest DB] [dest Table Name]');
        }

    } else if(arr[0] == 'migrate'){
        if(arr.length == 5){
            const cr = await createTable(arr[3], arr[4]);
            console.log('result : ' + cr);
            console.log('waiting for creating table for a moment...');
            await sleep(5000);
            console.log('destination Table created');

            const ex = await exportData(arr[1], arr[2]);
            console.log('export result : ' + ex);

            const total = await count(arr[1], arr[2]);
            const im = await importData(arr[3], arr[4], total);
            console.log('import result : ' + im);

            const dl = await deleteTable(arr[1], arr[2]);
            console.log('result : ' + dl);
            console.log('waiting for deleting table for a moment...');
            await sleep(5000);
            console.log('source Table deleted');

        } else {
            console.log('명령어 형식이 올바르지 않습니다.');
            console.log('=> migrate [source DB] [source Table Name] [Dest DB] [Dest Table Name]');
        }
    
    } else if(arr[0] == 'copy') {
        const cr = await createTable(arr[3], arr[4]);
        console.log('result : ' + cr);
        console.log('waiting for creating table for a moment...');
        await sleep(5000);
        console.log('destination Table created');

        const ex = await exportData(arr[1], arr[2]);
        console.log('export result : ' + ex);

        const total = await count(arr[1], arr[2]);
        const im = await importData(arr[3], arr[4], total);
        console.log('import result : ' + im);
    
    } else if(arr == 'exit'){
        r1.close();
        process.exit();
    }
    r1.question('order : \n', answerCallback);

};

try{
    console.clear();
    
    // MongoDB 연결
    Mongoose.connect(config.mongo_local_config, config.mongo_config)
    .then(() => console.log('Successfully connected to MongoDB\n'))
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

    r1.question('Data Migration CLI\n', answerCallback);
} catch(e) {
    console.error(e);
}

