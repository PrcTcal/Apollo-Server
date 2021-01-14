const MusicModel = require('../database/music');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');

class SDK{
    constructor(){
        this.readMusic = (pnum) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params;
                params = {
                    TableName: config.aws_table_name,
                    Limit: pnum == 1 ? 5 : 5 * (pnum - 1)
                };
                docClient.scan(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        if(pnum == 1){
                            //console.log(data);
                            return resolve(data['Items']);
                        } else {
                            //console.log(data);
                            params = {
                                TableName: config.aws_table_name,
                                Limit: 5,
                                ExclusiveStartKey: data['LastEvaluatedKey']
                            }
                            docClient.scan(params, (err, data) => {
                                if(err){
                                    return reject(err);
                                } else {
                                    //console.log(data);
                                    return resolve(data['Items']);
                                }
                            });
                        }
                    }
                });
            });
        }

        this.createMusic = (artist, song) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let isDup = false;
                let params = {
                    TableName: config.aws_table_name
                }
                docClient.scan(params, (err, result) => {
                    if(err){
                        console.error(err);
                    } else {
                        for(let item of result['Items']){
                            if(item.songTitle == song && item.Artist == artist){
                                isDup = true;
                            }
                        }
                        console.log("Duplication Check : " + isDup);
                        if(!isDup){
                            params = {
                                TableName: config.aws_table_name,
                                Item: {
                                    id: uuid.v4(),
                                    Artist: artist,
                                    songTitle: song
                                }
                            };
                            console.log(params);
                            docClient.put(params, (err, result) => {
                                if(err){
                                    console.error(err);
                                    return reject(err);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("duplicated insertion"));
                        }
                    }
                });
            });
        }

        this.updateMusic = (artist, song, title) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let targetId;
                let params = {
                    TableName: config.aws_table_name
                }
                docClient.scan(params, (err, result) => {
                    if(err){
                        console.error(err);
                    } else {
                        for(let item of result['Items']){
                            if(item.songTitle == song && item.Artist == artist){
                                targetId = item.id;
                            }
                        }
                        params = {
                            TableName: config.aws_table_name,
                            Key: {
                                "id": targetId
                            },
                            UpdateExpression: "set songTitle = :s",
                            ExpressionAttributeValues:{
                                ":s" : title
                            }
                        };
                        if(targetId != null){
                            docClient.update(params, (err, data) => {
                                if(err){
                                    return reject(err);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("No data found"));
                        }
                    }
                });   
            });
        }

        this.deleteMusic = (artist, song) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let targetId;
                let params = {
                    TableName: config.aws_table_name
                }
                const music = docClient.scan(params, (err, result) => {
                    for(let item of result['Items']){
                        if(item.Artist == artist && item.songTitle == song){
                            targetId = item.id;
                        }
                    }
                    params = {
                        TableName: config.aws_table_name,
                        Key: {
                            "id": targetId
                        }
                    };
                    if(targetId != null){
                        docClient.delete(params, (err) => {
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(true);
                            }
                        });
                    } else {
                        return reject(new Error("No data found"));
                    }
                });
            });
            
        }
    }
}

module.exports = {SDK};