const MusicModel = require('../database/music');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');

class SDK{
    constructor(){
        this.getMusic = (id) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();  
                const params = {
                    TableName: config.aws_table_name,
                    FilterExpression: "#key = :key",
                    ExpressionAttributeNames: {
                        "#key": "id"
                    },
                    ExpressionAttributeValues: {
                        ":key": id
                    }
                };
            
                docClient.scan(params, (err, data) => {
                    if(err){
                        return reject(err);
                    } else {
                        return resolve(data['Items'][0]);
                    }
                });
            });
        }

        this.createMusic = (Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name,
                    FilterExpression: "#aname = :an and #bname = :bn",
                    ExpressionAttributeNames: {
                        "#aname": "Artist",
                        "#bname": "songTitle"
                    },
                    ExpressionAttributeValues: {
                        ":an": Artist,
                        ":bn": songTitle
                    }
                }
                docClient.scan(params, (scanerr, result) => {
                    if(!scanerr){
                        if(result.Count == 0){   
                            params = {
                                TableName: config.aws_table_name,
                                Item: {
                                    id: uuid.v4(),
                                    Artist: Artist,
                                    songTitle: songTitle,
                                    info: info,
                                    actv: actv,
                                    idx: idx
                                }
                            };
                            docClient.put(params, (puterr) => {
                                if(puterr){
                                    return reject(puterr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("duplicated insertion"));
                        }      
                    } else {
                        return reject(scanerr);
                    }
                });
            });
        }

        this.updateMusic = (id, Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let updFields = {};
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name,
                    FilterExpression: "#key = :key",
                    ExpressionAttributeNames: {
                        "#key": "id"
                    },
                    ExpressionAttributeValues: {
                        ":key": id
                    }
                }
                docClient.scan(params, (scanerr, result) => {
                    if(!scanerr){
                        if(result.Count > 0){
                            let updExpression = '';
                            if(Artist) {updFields[':Artist'] = Artist; updExpression += 'Artist = :Artist ';}
                            if(songTitle) {updFields[':songTitle'] = songTitle; updExpression += updExpression != '' ? ', songTitle = :songTitle ' : 'songTitle = :songTitle '; }  
                            if(info) {updFields[':info'] = info; updExpression += updExpression != '' ? ', info = :info ' : 'info = :info ';}
                            if(actv != null) {updFields[':actv'] = actv; updExpression += updExpression != '' ? ', actv = :actv ' : 'actv = :actv ';}
                            if(idx) {updFields[':idx'] = idx; updExpression += updExpression != '' ? ', idx = :idx ' : 'idx = :idx ';}

                            params = {
                                TableName: config.aws_table_name,
                                Key: {
                                    "id": result['Items'][0].id
                                },
                                UpdateExpression: "set " + updExpression
                            };
                            params.ExpressionAttributeValues = updFields

                            docClient.update(params, (upderr) => {
                                if(upderr){
                                    return reject(upderr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("No data found"));
                        }
                    } else {
                        return reject(scanerr);
                    }
                });   
            });
        }

        this.removeMusic = (id) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params;
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
                
                docClient.scan(params, (scanerr, result) => {
                    if(!scanerr){
                        if(result.Count > 0){
                            params = {
                                TableName: config.aws_table_name,
                                Key: {
                                    "id": result['Items'][0].id
                                }
                            };
                            docClient.delete(params, (delerr) => {
                                if(delerr){
                                    return reject(delerr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("No data found"));
                        }
                    } else {
                        return reject(scanerr);
                    }       
                });
            });    
        }

        this.searchMusic = (id, stype, dir, page, Artist, songTitle) => {
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
                } else if(Artist){
                    if(songTitle){
                        params = {
                            TableName: config.aws_table_name,
                            FilterExpression: "#aname = :an and #bname = :bn",
                            ExpressionAttributeNames: {
                                "#aname": "Artist",
                                "#bname": "songTitle"
                            },
                            ExpressionAttributeValues: {
                                ":an": Artist,
                                ":bn": songTitle
                            }
                        };
                    } else {
                        params = {
                            TableName: config.aws_table_name,
                            FilterExpression: "#aname = :an",
                            ExpressionAttributeNames: {
                                "#aname": "Artist"
                            },
                            ExpressionAttributeValues: {
                                ":an": Artist
                            }
                        }
                    }
                } else if(songTitle){
                    params = {
                        TableName: config.aws_table_name,
                        FilterExpression: "#bname = :bn",
                        ExpressionAttributeNames: {
                            "#bname": "songTitle"
                        },
                        ExpressionAttributeValues: {
                            ":bn": songTitle
                        }
                    }
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
                                } else if(stype == 'idx'){
                                    if(dir == 'ASC'){
                                        return a.idx > b.idx ? 1 : -1;
                                    } else {
                                        return a.idx < b.idx ? 1 : -1;
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
                        return resolve(data['Items']);
                    }
                });
            });
        }
    }
}

module.exports = {SDK};