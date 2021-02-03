const MusicModel = require('../database/music');
const Mongoose = require('mongoose');
const Dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');

class Migration{
    constructor(){
        this.createTable = (settings) => {
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

        this.migrateMusic = (settings) => {
            return new Promise(async (resolve, reject) => {
                if (settings.srcDB == 'mongo') {
                    const mongo_music = Mongoose.model(settings.src, MusicModel.mongo_schema);
                    let music = await mongo_music.find().limit(1);

                    if(settings.destDB == 'mongo'){
                        // dest가 mongoDB일 경우
                    } else {
                        
                        AWS.config.update(config.aws_remote_config);
                        let dynamodb = new AWS.DynamoDB();
                        
                        
                       let total = 1000, cur = 0;
                       let params = {};
                       
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
                                    params.RequestItems = pdata.UnprocessedItems;

                                    if(Object.keys(params.RequestItems).length != 0){
                                        console.log('unprocessed : ' + pdata.UnprocessedItems);
                                        dynamodb.batchWriteItem(params, processItemCallback);
                                    } else {
                                        console.log('batch success');
                                    }
                               }
                           } 

                           dynamodb.batchWriteItem(params, processItemCallback);
                        }
                           
                    }
                } else {
                    // source가 dynamoDB일 경우
                }
                return resolve(true);
            })
        }
    }
}

module.exports = Migration;