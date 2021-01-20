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
                                    dummy: 0,
                                    d2: result.ScannedCount.toString(),
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
                                    //"id": result['Items'][0].id

                                    // test01-music2 테이블용
                                    "dummy": 0,
                                    "d2": result['Items'][0].d2
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
                                    //"id": result['Items'][0].id

                                    // test01-music2 테이블용
                                    "dummy": 0,
                                    "d2": result['Items'][0].d2
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
                        attName['#birth'] = 'birth';
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
                        attName['#release'] = 'release';
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
                        console.log(data);
                        if(settings.dir){
                            data['Items'].sort((a, b) => {
                                if(settings.stype == 'id'){
                                    return settings.dir == 'ASC' ? (a.id > b.id ? 1 : -1) : (a.id < b.id ? 1 : -1);
                                } else if(settings.stype == 'Artist'){
                                    return settings.dir == 'ASC' ? (a.Artist > b.Artist ? 1 : -1) : (a.Artist < b.Artist ? 1 : -1);
                                } else if(settings.stype == 'songTitle'){
                                    return settings.dir == 'ASC' ? (a.songTitle > b.songTitle ? 1 : -1) : (a.songTitle < b.songTitle ? 1 : -1);
                                } else if(settings.stype == 'hometown'){
                                    if(a.info.hometown && b.info.hometown){
                                        return settings.dir == 'ASC' ? (a.info.hometown > b.info.hometown ? 1 : -1) : (a.info.hometown < b.info.hometown ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.hometown ? -1 : 1) : (!a.info.hometown ? 1 : -1);
                                    }
                                } else if(settings.stype == 'birth'){
                                    if(a.info.birth && b.info.birth){
                                        return settings.dir == 'ASC' ? (a.info.birth > b.info.birth ? 1 : -1) : (a.info.birth < b.info.birth ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.birth ? -1 : 1) : (!a.info.birth ? 1 : -1);
                                    }
                                } else if(settings.stype == 'album'){
                                    if(a.info.album && b.info.album){
                                        return settings.dir == 'ASC' ? (a.info.album > b.info.album ? 1 : -1) : (a.info.album < b.info.album ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.album ? -1 : 1) : (!a.info.album ? 1 : -1);
                                    }
                                } else if(settings.stype == 'release'){
                                    if(a.info.release && b.info.release){
                                        return settings.dir == 'ASC' ? (a.info.release > b.info.release ? 1 : -1) : (a.info.release < b.info.release ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.release ? -1 : 1) : (!a.info.release ? 1 : -1);
                                    }
                                } else if(settings.stype == 'actv'){
                                    if(settings.dir == 'ASC'){
                                        if(a.actv != b.actv) return a.actv ? 1 : -1;
                                    } else {
                                        if(a.actv != b.actv) return a.actv ? 1 : -1;
                                    }
                                } else if(settings.stype == 'idx'){
                                    return settings.dir == 'ASC' ? (a.idx > b.idx ? 1 : -1) : (a.idx < b.idx ? 1 : -1);
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
                    KeyConditionExpression: "dummy = :dummy"
                };
                let filterExp = '', attName = {}, attVal = {};
                attVal[':dummy'] = 0;
                
                if(id){
                    filterExp += '#id = :id';
                    attName['#id'] = 'id';
                    attVal[':id'] = id;
                }
                if(Artist){
                    if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                    filterExp += '#Artist = :Artist';
                    attName['#Artist'] = 'Artist';
                    attVal[':Artist'] = Artist;
                }
                if(songTitle){
                    if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                    filterExp += '#songTitle = :songTitle';                    
                    attName['#songTitle'] = 'songTitle';
                    attVal[':songTitle'] = songTitle;
                }
                
                if(info){
                    if(info.hometown){
                        if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                        filterExp += '#info.#hometown = :hometown';
                        attName['#info'] = 'info';           
                        attName['#hometown'] = 'hometown';
                        attVal[':hometown'] = info.hometown;                    
                    }
                    if(info.birth){
                        if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                        filterExp += '#info.#birth = :birth';
                        attName['#info'] = 'info'; 
                        attName['#birth'] = 'birth';
                        attVal[':birth'] = info.birth;
                    }
                    if(info.album){
                        if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                        filterExp += '#info.#album = :album';
                        attName['#info'] = 'info'; 
                        attName['#album'] = 'album';
                        attVal[':album'] = info.album;
                    }
                    if(info.release){
                        if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                        filterExp += '#info.#release = :release';
                        attName['#info'] = 'info'; 
                        attName['#release'] = 'release';
                        attVal[':release'] = info.release;
                    }
                }
                if(actv != null){
                    if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                    filterExp += '#actv = :actv';
                    attName['#actv'] = 'actv';
                    attVal[':actv'] = actv;
                }
                if(idx){
                    if(filterExp != '') filterExp += settings.and || settings.and == null ? ' and ' : ' or ';
                    filterExp += '#idx = :idx';
                    attName['#idx'] = 'idx';
                    attVal[':idx'] = idx;
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
                        if(settings.dir){
                            data['Items'].sort((a, b) => {
                                if(settings.stype == 'id'){
                                    return settings.dir == 'ASC' ? (a.id > b.id ? 1 : -1) : (a.id < b.id ? 1 : -1);
                                } else if(settings.stype == 'Artist'){
                                    return settings.dir == 'ASC' ? (a.Artist > b.Artist ? 1 : -1) : (a.Artist < b.Artist ? 1 : -1);
                                } else if(settings.stype == 'songTitle'){
                                    return settings.dir == 'ASC' ? (a.songTitle > b.songTitle ? 1 : -1) : (a.songTitle < b.songTitle ? 1 : -1);
                                } else if(settings.stype == 'hometown'){
                                    if(a.info.hometown && b.info.hometown){
                                        return settings.dir == 'ASC' ? (a.info.hometown > b.info.hometown ? 1 : -1) : (a.info.hometown < b.info.hometown ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.hometown ? -1 : 1) : (!a.info.hometown ? 1 : -1);
                                    }
                                } else if(settings.stype == 'birth'){
                                    if(a.info.birth && b.info.birth){
                                        return settings.dir == 'ASC' ? (a.info.birth > b.info.birth ? 1 : -1) : (a.info.birth < b.info.birth ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.birth ? -1 : 1) : (!a.info.birth ? 1 : -1);
                                    }
                                } else if(settings.stype == 'album'){
                                    if(a.info.album && b.info.album){
                                        return settings.dir == 'ASC' ? (a.info.album > b.info.album ? 1 : -1) : (a.info.album < b.info.album ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.album ? -1 : 1) : (!a.info.album ? 1 : -1);
                                    }
                                } else if(settings.stype == 'release'){
                                    if(a.info.release && b.info.release){
                                        return settings.dir == 'ASC' ? (a.info.release > b.info.release ? 1 : -1) : (a.info.release < b.info.release ? 1 : -1);
                                    } else {
                                        return settings.dir == 'ASC' ? (!a.info.release ? -1 : 1) : (!a.info.release ? 1 : -1);
                                    }
                                } else if(settings.stype == 'actv'){
                                    if(settings.dir == 'ASC'){
                                        if(a.actv != b.actv) return a.actv ? 1 : -1;
                                    } else {
                                        if(a.actv != b.actv) return a.actv ? 1 : -1;
                                    }
                                } else if(settings.stype == 'idx'){
                                    return settings.dir == 'ASC' ? (a.idx > b.idx ? 1 : -1) : (a.idx < b.idx ? 1 : -1);
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