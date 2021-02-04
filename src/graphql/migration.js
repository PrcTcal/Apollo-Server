const MusicModel = require('../database/music');
const Mongoose = require('mongoose');
const Dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const readline = require('readline');
const fs = require('fs');

//const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

/*
const createTable = (settings) => {
    return new Promise(async (resolve, reject) => {
        if (settings.srcDB == 'mongo') {
            const mongo_music = Mongoose.model(settings.src, MusicModel.mongo_schema);
            let music = await mongo_music.find().limit(1);

            if(settings.destDB == 'mongo'){
                // dest가 mongoDB일 경우
            } else {
                
                AWS.config.update(config.aws_remote_config);
                let dynamodb = new AWS.DynamoDB();
                
                let params = {
                    TableName : "test01-temp",
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
                    } else {
                        console.log('created table success: ' + JSON.stringify(data, null, 2));
                        return resolve(true);
                    }
                });    
            }
        } else {
            // source가 dynamoDB일 경우
        }
        
    })
}
*/

const count = () => {
    return new Promise((resolve, reject) => {
        let params = {
            TableName: "test01-temp",
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
                    console.log(data);
                    return resolve(data.Count);
                }
            }
        });
    });  
}

const exportData = (src, table, total) => {
    return new Promise(async (resolve, reject) => {
        let cur = 0;
        let params = {}, music, mongo_music, dynamo_music;
        let docClient = new AWS.DynamoDB.DocumentClient();

        if(src == 'mongo'){

        } else {
            if(src == 'dynamoose'){
                dynamo_music = Dynamoose.model(table, MusicModel.dynamo_schema);
                music = dynamo_music.query("dummy").eq(0);
                let temp = music, rs = [];
                music = await music.exec();
                for(let item of music){
                    rs.push(item);
                }
                if(music.count == 0) {
                    return reject(new Error("There is No Data or Table"));
                } else if(music.lastKey != null){
                    while(music.lastKey != null){
                        music = await temp.startAt(music.lastKey).exec();
                        for(let item of music){
                            rs.push(item);
                        }
                    }
                    console.log(rs.length);
                    fs.writeFileSync('../../migrationData/export.json', JSON.stringify(rs), 'utf8');
                    console.log('writeFileSync completed');
                    
                }

            } else {

            }
        }
    });
}

/*
const migrateMusic = (settings) => {
    return new Promise(async (resolve, reject) => {
        let total = 6808, cur = 0;
        let params = {}, music, mongo_music, dynamo_music;
        let docClient = new AWS.DynamoDB.DocumentClient();

        // **************** 테이블 존재 여부 및 데이터 존재 여부 체크 ***********************
        if (settings.srcDB == 'mongo') {
            // source가 mongoDB일 경우
            mongo_music = Mongoose.model(settings.src, MusicModel.mongo_schema);
            music = await mongo_music.find().limit(1);
            if(music.length == 0) return reject(new Error("There is No Data or Table"));
        } else {
            // source가 dynamoDB일 경우

            if(settings.srcDB == 'dynamoose'){
                // ****************** Dynamoose ************************
                dynamo_music = Dynamoose.model(settings.src, MusicModel.dynamo_schema);
                music = await dynamo_music.query("dummy").eq(0).limit(1).exec();
                if(music.count == 0) return reject(new Error("There is No Data or Table"));
            } else {
                // ******************* AWS_SDK *************************
                params = {
                    TableName: "test01-temp",
                    KeyConditionExpression: "dummy = :dummy",
                    ExpressionAttributeValues: { ":dummy" : 0 },
                    Limit: 1
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
                await checking(docClient, params).then(function(data){
                    if(data.Count == 0) return reject(new Error("There is No Data or Table"));
                });
            }
        }
        
        // ****************** Data migration Logic *********************
        if(settings.destDB == 'mongo'){
            // dest가 mongoDB일 경우
            // dynamoDB의 Query는 최대 1MB까지 가져올 수 있다.
            // 추가적으로 가져오기 위해선 LastEvaluatedKey를 사용해야 하는데,
            // 문제는 LastKey가 query의 response에 담겨져 있기 때문에 반복하여 query를 사용할 수 없다는 점이다.
            // 따라서 AWS_SDK로 구현은 일단 보류한다.
            if(settings.srcDB == 'dynamoose'){
                music = await dynamo_music.query("dummy").eq(0);
                let temp = music;
                if(music.lastKey != null){
                    
                }
            }
            
        } else {
            // source에서의 scan 결과가 있어야만 아래 로직을 수행해야 한다.
            // 없을 경우 reject해서 막아주자.

            if(settings.destDB == 'aws_sdk'){
                // *************** mongoDB --(AWS_SDK)--> dynamoDB data migration Logic ******************** //
                AWS.config.update(config.aws_remote_config);
                let dynamodb = new AWS.DynamoDB();
                let count = 0;
                music = await mongo_music.find().limit(total);
                while(total > 0){
                    let req = {}, Item = {};
                    req[settings.dest] = [];
                    for(let i = 0 ; i < (total > 25 ? 25 : total) ; i++){
                        Item = {
                            "dummy": { "N": "0" },
                            "id": { "S": music[cur].id },
                            "Artist": { "S": music[cur].Artist },
                            "songTitle": { "S": music[cur].songTitle },
                            "info": { 
                                "M": {
                                    "album": { "S": music[cur].info.album },
                                    "release": { "S": music[cur].info.release }
                                } 
                            },
                            "actv": { "BOOL": music[cur].actv },
                            "idx": { "N": String(music[cur].idx) },
                            "srchArtist": { "S": music[cur].Artist },
                            "srchsongTitle": { "S": music[cur].songTitle },
                            "srchidx": { "N": String(music[cur].idx) }
                        };
                        req[settings.dest].push({PutRequest : { "Item": Item }});
                        cur++;
                    }
                    total = total >= 25 ? total -= 25 : 0;
                    params = {
                        RequestItems: req
                    };

                    let processItemCallback = function(perr, pdata){
                        if(perr){
                            if(perr.code == 'ResourceNotFoundException') console.log('batch failed : ResourceNotFoundException');
                        } else {
                            if(Object.keys(pdata.UnprocessedItems).length != 0){
                                console.log("unprocessed : " + pdata.UnprocessedItems + ", start rebatching");
                                dynamodb.batchWriteItem({RequestItems: pdata.UnprocessedItems}, processItemCallback);
                            } else {
                                count = count + 1;
                                console.log('batch success => ' + count);
                            }
                        }
                    };
                    dynamodb.batchWriteItem(params, processItemCallback);
                    await sleep(500);
                    console.log('current process : ' + cur);
                }
            } else {

            }
               

            // ************** dynamoDB --(AWS_SDK)--> dynamoDB data migration Logic ******************** //
            // 미구현
        }
        console.log('===========<< Migrating data terminated >>============');
        
        /*
        if(settings.srcDB == 'mongo'){
            console.log('===========<< delete process executed >>===========');
            music = await mongo_music.deleteMany();
            console.log(music);
        } else {
            // dynamoDB에서 데이터 삭제
        }
        
        return resolve(true);
    })
}
*/

const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const answerCallback = async (answer) => {
    let arr = answer.indexOf(' ') > 0 ? answer.split(' ') : answer;
    console.log(arr);
    if(arr == 'count'){
        const cnt = await count();
        console.log('total count : ' + cnt);
    } else if(arr[0] == 'export'){
        await exportData(arr[1], arr[2], arr[3]);
    
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
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch(e => console.error(e));
    Mongoose.Promise = global.Promise;
    console.log('DB : MongoDB');

    //AWS_SDK 연결 세팅
    AWS.config.update(config.aws_remote_config);
    // Create the DynamoDB service object
    var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    console.log('DB : DynamoDB - AWS_SDK');

    r1.question('Data Migration CLI\n', answerCallback);
} catch(e) {
    console.error(e);
}

