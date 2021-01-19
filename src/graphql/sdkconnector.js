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

        this.searchMusic = (id, Artist, songTitle, info, actv, idx, settings) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name
                };
                let filterExp = '', attName = {}, attVal = {};
                if(id){ 
                    filterExp += '#key = :key';
                    attName['#key'] = 'id';
                    attVal[':key'] = id;
                }
                if(Artist){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#Artist = :Artist';
                    attName['#Artist'] = 'Artist';
                    attVal[':Artist'] = Artist;
                }
                if(songTitle){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#songTitle = :songTitle';
                    attName['#songTitle'] = 'songTitle';
                    attVal[':songTitle'] = songTitle;
                }
                
                if(info){
                    if(info.hometown){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#hometown = :hometown';
                        attName['#info'] = 'info';           
                        attName['#hometown'] = 'hometown';
                        attVal[':hometown'] = info.hometown;                    
                    }
                    if(info.birth){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#birth = :birth';
                        attName['#info'] = 'info'; 
                        attName['#birth'] = 'info.birth';
                        attVal[':birth'] = info.birth;
                    }
                    if(info.album){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#album = :album';
                        attName['#info'] = 'info'; 
                        attName['#album'] = 'album';
                        attVal[':album'] = info.album;
                    }
                    if(info.release){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#release = :release';
                        attName['#info'] = 'info'; 
                        attName['#release'] = 'info.release';
                        attVal[':release'] = info.release;
                    }
                }
                
                if(actv != null){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#actv = :actv';
                    attName['#actv'] = 'actv';
                    attVal[':actv'] = actv;
                }
                if(idx){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#idx = :idx';
                    attName['#idx'] = 'idx';
                    attVal[':idx'] = idx;
                }
                if(filterExp){
                    params.FilterExpression = filterExp;
                    params.ExpressionAttributeNames = attName;
                    params.ExpressionAttributeValues = attVal;
                    
                }
                
                docClient.scan(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        if(settings.dir){
                            data['Items'].sort((a, b) => {
                                if(settings.stype == 'id'){
                                    if(settings.dir == 'ASC'){
                                        return a.id > b.id ? 1 : -1;
                                    } else {
                                        return a.id < b.id ? 1 : -1;
                                    }
                                } else if(settings.stype == 'Artist'){
                                    if(settings.dir == 'ASC'){
                                        return a.Artist > b.Artist ? 1 : -1;
                                    } else {
                                        return a.Artist < b.Artist ? 1 : -1;
                                    }
                                } else if(settings.stype == 'songTitle'){
                                    if(settings.dir == 'ASC'){
                                        return a.songTitle > b.songTitle ? 1 : -1;
                                    } else {
                                        return a.songTitle < b.songTitle ? 1 : -1;
                                    }
                                } else if(settings.stype == 'hometown'){
                                    if(a.info.hometown && b.info.hometown){
                                        if(settings.dir == 'ASC'){
                                            return a.info.hometown > b.info.hometown ? 1 : -1;
                                        } else {
                                            return a.info.hometown < b.info.hometown ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.hometown) return -1;
                                            if(!b.info.hometown) return 1;
                                        } else {
                                            if(!a.info.hometown) return 1;
                                            if(!b.info.hometown) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'birth'){
                                    if(a.info.birth && b.info.birth){
                                        if(settings.dir == 'ASC'){
                                            return a.info.birth > b.info.birth ? 1 : -1;
                                        } else {
                                            return a.info.birth < b.info.birth ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.birth) return -1;
                                            if(!b.info.birth) return 1;
                                        } else {
                                            if(!a.info.birth) return 1;
                                            if(!b.info.birth) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'album'){
                                    if(a.info.album && b.info.album){
                                        if(settings.dir == 'ASC'){
                                            return a.info.album > b.info.album ? 1 : -1;
                                        } else {
                                            return a.info.album < b.info.album ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.album) return -1;
                                            if(!b.info.album) return 1;
                                        } else {
                                            if(!a.info.album) return 1;
                                            if(!b.info.album) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'release'){
                                    if(a.info.release && b.info.release){
                                        if(settings.dir == 'ASC'){
                                            return a.info.release > b.info.release ? 1 : -1;
                                        } else {
                                            return a.info.release < b.info.release ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.release) return -1;
                                            if(!b.info.release) return 1;
                                        } else {
                                            if(!a.info.release) return 1;
                                            if(!b.info.release) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'idx'){
                                    if(settings.dir == 'ASC'){
                                        return a.idx > b.idx ? 1 : -1;
                                    } else {
                                        return a.idx < b.idx ? 1 : -1;
                                    }
                                } 
                            });
                        }
                        if(settings.page){
                            let temp = new Array();
                            let endIndex = data['Items'].length > settings.page * 5 ? settings.page * 5 : data['Items'].length;
                            for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                                temp.push(data['Items'][i]);
                            }
                            data['Items'] = temp;
                        }
                        
                        return resolve(data['Items']);
                    }
                });
            });
        }

        this.queryMusic = (id, Artist, songTitle, info, actv, idx, settings) => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name,
                    KeyConditionExpression: "#id = :id"
                };
                let filterExp = '', attName = {}, attVal = {};
                
                attName['#id'] = 'id';
                attVal[':id'] = id;
                
                if(Artist){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#Artist = :Artist';
                    attName['#Artist'] = 'Artist';
                    attVal[':Artist'] = Artist;
                }
                if(songTitle){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#songTitle = :songTitle';                    
                    attName['#songTitle'] = 'songTitle';
                    attVal[':songTitle'] = songTitle;
                }
                
                if(info){
                    if(info.hometown){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#hometown = :hometown';
                        attName['#info'] = 'info';           
                        attName['#hometown'] = 'hometown';
                        attVal[':hometown'] = info.hometown;                    
                    }
                    if(info.birth){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#birth = :birth';
                        attName['#info'] = 'info'; 
                        attName['#birth'] = 'info.birth';
                        attVal[':birth'] = info.birth;
                    }
                    if(info.album){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#album = :album';
                        attName['#info'] = 'info'; 
                        attName['#album'] = 'album';
                        attVal[':album'] = info.album;
                    }
                    if(info.release){
                        if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                        filterExp += '#info.#release = :release';
                        attName['#info'] = 'info'; 
                        attName['#release'] = 'info.release';
                        attVal[':release'] = info.release;
                    }
                }
                
                if(actv != null){
                    if(filterExp != '') filterExp += settings.and ? ' and ' : ' or ';
                    filterExp += '#actv = :actv';
                    attName['#actv'] = 'actv';
                    attVal[':actv'] = actv;
                }
                if(idx){
                    params.KeyConditionExpression += settings.and ? ' and #idx = :idx' : ' and #idx between :v1 and :v2';
                    attName['#idx'] = 'idx';
                    
                    if(!settings.and){
                        attVal[':v1'] = 1;
                        attVal[':v2'] = 13;
                    } else {
                        attVal[':idx'] = idx;
                    }
                }
                if(filterExp) params.FilterExpression = filterExp;
                params.ExpressionAttributeNames = attName;
                params.ExpressionAttributeValues = attVal;
                console.log(params);
                
                docClient.query(params, function(err, data) {
                    if (err) {
                        return reject(err);
                    } else {
                        if(settings.dir){
                            data['Items'].sort((a, b) => {
                                if(settings.stype == 'id'){
                                    if(settings.dir == 'ASC'){
                                        return a.id > b.id ? 1 : -1;
                                    } else {
                                        return a.id < b.id ? 1 : -1;
                                    }
                                } else if(settings.stype == 'Artist'){
                                    if(settings.dir == 'ASC'){
                                        return a.Artist > b.Artist ? 1 : -1;
                                    } else {
                                        return a.Artist < b.Artist ? 1 : -1;
                                    }
                                } else if(settings.stype == 'songTitle'){
                                    if(settings.dir == 'ASC'){
                                        return a.songTitle > b.songTitle ? 1 : -1;
                                    } else {
                                        return a.songTitle < b.songTitle ? 1 : -1;
                                    }
                                } else if(settings.stype == 'hometown'){
                                    if(a.info.hometown && b.info.hometown){
                                        if(settings.dir == 'ASC'){
                                            return a.info.hometown > b.info.hometown ? 1 : -1;
                                        } else {
                                            return a.info.hometown < b.info.hometown ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.hometown) return -1;
                                            if(!b.info.hometown) return 1;
                                        } else {
                                            if(!a.info.hometown) return 1;
                                            if(!b.info.hometown) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'birth'){
                                    if(a.info.birth && b.info.birth){
                                        if(settings.dir == 'ASC'){
                                            return a.info.birth > b.info.birth ? 1 : -1;
                                        } else {
                                            return a.info.birth < b.info.birth ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.birth) return -1;
                                            if(!b.info.birth) return 1;
                                        } else {
                                            if(!a.info.birth) return 1;
                                            if(!b.info.birth) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'album'){
                                    if(a.info.album && b.info.album){
                                        if(settings.dir == 'ASC'){
                                            return a.info.album > b.info.album ? 1 : -1;
                                        } else {
                                            return a.info.album < b.info.album ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.album) return -1;
                                            if(!b.info.album) return 1;
                                        } else {
                                            if(!a.info.album) return 1;
                                            if(!b.info.album) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'release'){
                                    if(a.info.release && b.info.release){
                                        if(settings.dir == 'ASC'){
                                            return a.info.release > b.info.release ? 1 : -1;
                                        } else {
                                            return a.info.release < b.info.release ? 1 : -1;
                                        }
                                    } else {
                                        if(settings.dir == 'ASC'){
                                            if(!a.info.release) return -1;
                                            if(!b.info.release) return 1;
                                        } else {
                                            if(!a.info.release) return 1;
                                            if(!b.info.release) return -1;
                                        }
                                    }
                                } else if(settings.stype == 'idx'){
                                    if(settings.dir == 'ASC'){
                                        return a.idx > b.idx ? 1 : -1;
                                    } else {
                                        return a.idx < b.idx ? 1 : -1;
                                    }
                                } 
                            });
                        }
                        if(settings.page){
                            let temp = new Array();
                            let endIndex = data['Items'].length > settings.page * 5 ? settings.page * 5 : data['Items'].length;
                            for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
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