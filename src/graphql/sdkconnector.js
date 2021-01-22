const MusicModel = require('../database/music');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const sutil = require('../utils/sort.js');

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
                                    dummy: 0,
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
                                    // test01-music 테이블용
                                    "id": result['Items'][0].id

                                    // test01-music2 테이블용
                                    //"dummy": 0,
                                    //"d2": result['Items'][0].d2
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
                                    // test01-music 테이블용
                                    "id": result['Items'][0].id

                                    // test01-music2 테이블용
                                    //"dummy": 0,
                                    //"d2": result['Items'][0].d2
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

        this.searchMusic = (Artist, songTitle, info, actv, idx, settings) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name,
                };
                let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
                let filterExp = '', attName = {}, attVal = {};
                for(let item in input){
                    if(item == 'info'){
                        if(input[item] != null){
                            if(Object.keys(input[item]).length > 0) attName['#info'] = 'info';
                            for(let it in input[item]){
                                if(input[item][it]){
                                    if(filterExp != ''){
                                        if(settings != null) { 
                                            filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                                        } else {
                                            filterExp += ' and ';
                                        }
                                    } 
                                    filterExp += '#info.#' + it + ' = :' + it;
                                    attName['#' + it] = it;
                                    attVal[':' + it] = input[item][it];
                                }
                            }
                        }    
                    } else {
                        if(input[item] != null){
                            if(filterExp != '') {
                                if(settings != null){
                                    filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                                } else {
                                    filterExp += ' and ';
                                }
                            }
                            filterExp += '#' + item + ' = :' + item;
                            attName['#' + item] = item;
                            attVal[':' + item] = input[item];
                        }
                    }
                }
                if(filterExp) {
                    params.FilterExpression = filterExp;
                    params.ExpressionAttributeNames = attName;
                    params.ExpressionAttributeValues = attVal;
                }
                docClient.scan(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        if(settings != null){
                            if(settings.dir != null){
                                data['Items'].sort((a, b) => {
                                    return settings.dir == 'ASC' ? (a[settings.stype] > b[settings.stype] ? 1 : -1) : (a[settings.stype] < b[settings.stype] ? 1 : -1);
                                });
                            }
                            if(settings.page != null){
                                let temp = new Array();
                                let endIndex = data['Items'].length > settings.page * 5 ? settings.page * 5 : data['Items'].length;
                                for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                                    temp.push(data['Items'][i]);
                                }
                                data['Items'] = temp;
                            }
                        }
                        
                        return resolve(data['Items']);
                    }
                });
            });
        }

        this.queryMusic = (Artist, songTitle, info, actv, idx, settings) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name,
                    KeyConditionExpression: "dummy = :dummy"
                };
                let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
                let filterExp = '', attName = {}, attVal = {};
                if(settings != null){
                    if(settings.stype != null) params.IndexName = settings.stype + '-index';
                    if(settings.dir != null) params.ScanIndexForward = settings.dir == 'ASC' ? true : false;
                    if(settings.page != null) params.Limit = settings.page > 1 ? 5 * (settings.page-1) : 5;
                }
                attVal[':dummy'] = 0;
                for(let item in input){
                    if(item == 'info'){
                        if(input[item] != null){
                            if(Object.keys(input[item]).length > 0) attName['#info'] = 'info';
                            for(let it in input[item]){
                                if(input[item][it]){
                                    if(filterExp != '') {
                                        if(settings != null){
                                            filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                                        } else {
                                            filterExp += ' and ';
                                        }
                                    }
                                    filterExp += '#info.#' + it + ' = :' + it;
                                    attName['#' + it] = it;
                                    attVal[':' + it] = input[item][it];
                                }
                            }
                        }  
                    } else {
                        if(input[item] != null){
                            if(filterExp != '') {
                                if(settings != null){
                                    filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                                } else {
                                    filterExp += ' and ';
                                }
                            }
                            filterExp += '#' + item + ' = :' + item;
                            attName['#' + item] = item;
                            attVal[':' + item] = input[item];
                        }
                    }
                }
                if(filterExp) {
                    params.FilterExpression = filterExp;
                    params.ExpressionAttributeNames = attName;
                }
                params.ExpressionAttributeValues = attVal;
                

                docClient.query(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        console.log(data.LastEvaluatedKey);
                        if(settings != null){
                            if(settings.page != null && data.LastEvaluatedKey != null){
                                if(settings.page > 1) params.ExclusiveStartKey = data.LastEvaluatedKey;
                                params.Limit = 5;
                            }
                        }
                        console.log(params);
                        docClient.query(params, (reserr, result) => {
                            if(reserr){
                                return reject(reserr);
                            } else {
                                return resolve(result['Items']);
                            }
                        });
                    }
                });
            });
        }
    }
}

module.exports = {SDK};