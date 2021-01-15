const MusicModel = require('../database/music');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');

class SDK{
    constructor(){
        this.getMusic = (id, artist, song) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params;
                
                if(id){
                    params = {
                        TableName: config.aws_table_name,
                        FilterExpression: "#key = :key",
                        ExpressionAttributeNames: {
                            "#key": "id"
                        },
                        ExpressionAttributeValues: {
                            ":key": id
                        }
                    };
                } else if(artist && song){
                    params = {
                        TableName: config.aws_table_name,
                        FilterExpression: "#aname = :an and #bname = :bn",
                        ExpressionAttributeNames: {
                            "#aname": "Artist",
                            "#bname": "songTitle"
                        },
                        ExpressionAttributeValues: {
                            ":an": artist,
                            ":bn": song
                        }
                    }
                }
                docClient.scan(params, (err, data) => {
                    if(err){
                        return reject(err);
                    } else {
                        console.log(data['Items'][0]);
                        return resolve(data['Items'][0]);
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

        this.searchMusic = (id, stype, dir, page, artist, song) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let aName, aValue;
                let params;
                if(id){
                    aName = "id";
                    aValue = id;
                } else if(artist){
                    aName = "Artist";
                    aValue = artist;
                } else if(song){
                    aName = "songTitle";
                    aValue = song;
                }
                if(id || artist || song){
                    params = {
                        TableName: config.aws_table_name,
                        FilterExpression: "#name = :nn",
                        ExpressionAttributeNames: {
                            "#name": aName,
                        },
                        ExpressionAttributeValues: {
                            ":nn": aValue
                        }
                    };
                } else {
                    params = {
                        TableName: config.aws_table_name
                    };
                }
                
                docClient.scan(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        if(dir){
                            data['Items'].sort((a, b) => {
                                if(stype == 'id'){
                                    if(dir == 'ASC'){
                                        return a.id > b.id ? 1 : -1;
                                    } else {
                                        return a.id < b.id ? 1 : -1;
                                    }
                                } else if(stype == 'Artist'){
                                    if(dir == 'ASC'){
                                        return a.Artist > b.Artist ? 1 : -1;
                                    } else {
                                        return a.Artist < b.Artist ? 1 : -1;
                                    }
                                } else if(stype == 'songTitle'){
                                    if(dir == 'ASC'){
                                        return a.songTitle > b.songTitle ? 1 : -1;
                                    } else {
                                        return a.songTitle < b.songTitle ? 1 : -1;
                                    }
                                }
                            });
                        }
                        if(page){
                            let temp = new Array();
                            let endIndex = data['Items'].length > page * 5 ? page * 5 : data['Items'].length;
                            for(let i = (page - 1) * 5 ; i < endIndex  ; i++){
                                temp.push(data['Items'][i]);
                            }
                            data['Items'] = temp;
                        }
                        console.log(data['Items']);
                        return resolve(data['Items']);
                    }
                });
            });
        }
    }
}

module.exports = {SDK};