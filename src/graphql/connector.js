const PeopleModel = require('../database/mongo');
const PagesModel = require('../database/pages');
const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const config = require('../config/config.js');
const AWS = require('aws-sdk');
const uuid = require('uuid');
class People{
    constructor(){
        this.findPeople = () => {
            const pp = PeopleModel.find({}, (err, data) =>{
                if(err) console.error(err);
                //console.log(data);
                return data;
            });
            return pp;
        };

        this.findPerson = (name) => {
            const ps = PeopleModel.findOne({'name':name}, (err, data) => {
                if(err) console.error(err);
                //console.log(data);
                return data;
            });
            return ps;
        }

        this.addPerson = (name, age, score, skills) => {
            const person = PeopleModel({'name':name, 'age':age, 'score':score, 'skills':skills});
            PeopleModel.findOne({'name':name}, (err, data) => {
                if(data == null){
                    person.save((err) => {
                        if(err) console.error(err);
                        return ;
                    });
                }
            });
            return person;
        }

        this.updateAge = (name, age) => {
            const person = PeopleModel.findOne({'name':name}, (err, person) => {
                if(person != null){
                    person.age = age;
                    person.save((err) => {
                        if(err) console.error(err);
                        return;
                    });
                }
            });
            return person;
        }

        this.removePerson = (name) => {
            const person = PeopleModel.findOne({'name':name}, (err, person) => {

                if(person != null){
                    person.remove((err, cnt) => {
                        if(err) console.error(err);
                        return;
                    });
                }
            });
            return person;
        }
    }
}

class Pages{
    constructor(){
        this.retrieveData = (srchType, srchWord, pnum, sname, sage, saddr) => {
           let pages;

           // 검색어가 없을시
            if(srchWord == null){
                pages = PagesModel.find({}, (err, data) => {
                    if(err) console.error(err);
                    console.log(data);
                    return data;
                });
            // 검색어가 있을시 검색어로 검색
            } else {
                if(srchType == 'name') pages = PagesModel.find({'name' : srchWord});
                else if(srchType == 'age') pages = PagesModel.find({'age' : Number.parseInt(srchWord)});
                else if(srchType == 'addr') pages = PagesModel.find({'addr' : srchWord});
            }

            // Pagination(3개 단위)
            // 이름, 나이, 주소로 정렬입력이 들어왔을 때 정렬(오름차순은 1, 내림차순은 -1)
            // 정렬 순서는 고정적(이름 - 나이 - 주소 순) -> 가변적으로 하는 방법은 못찾음
            pages.limit(3).skip((pnum-1) * 3).sort({'name':sname, 'age':sage, 'addr':saddr});
            return pages;
        }
    }
}


class Dynamoose{
    constructor(){
        this.readMusic = async (pnum) => {
            const music = await MusicModel.scan().limit(5 * (pnum - 1)).exec();
            const result = await MusicModel.scan().startAt(music.lastKey).limit(5).exec();
            console.log(result);
            return result;
        }

        this.createMusic = (artist, song) => {
            return new Promise((resolve, reject) => {
                let music;
                let isDup = false;
                MusicModel.scan({'Artist':artist, 'songTitle':song}).exec((err, result) => {
                    for(let item of result){
                        if(item.Artist == artist && item.songTitle == song){
                            isDup = true;
                        }
                    }
                    if(!isDup){
                        MusicModel.create({'id':uuid.v4(), 'Artist':artist, 'songTitle':song}, (err, data)=>{
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(true);
                            }
                        });
                        
                    } else {
                        return reject(new Error('Duplicated Data'));
                    }
                });
            });
        }

        this.updateMusic = async (artist, song, title) => {
            let entity, music;
            try{
                entity = await MusicModel.scan({'Artist':artist, 'songTitle':song}).exec();
                if(entity.count > 0){
                    music = await MusicModel.update({'id':entity[0].id}, {"$SET": {'songTitle':title}});
                    return true;
                } else {
                    return new Error('No data found');
                }
                
                //console.log('update success!');
            } catch(err) {
                console.error(err);
                return false;
            }
        }

        this.deleteMusic = async (artist, song) => {
            let music;
            try{
                const entity = await MusicModel.scan({'Artist':artist, 'songTitle':song}).exec();
                if(entity.count > 0){
                    music = await MusicModel.delete(entity[0].id);
                    return true;
                } else {
                    return new Error("No data found");
                }
            } catch(err){
                console.error(err);
                return false;
            }
        }
    }
}

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

class Mongo{
    constructor(){
        this.readMusic = (pnum) => {
            const pages = MusicModel.find({}, (err, data) => {
                if(err) console.error(err);
                console.log(data);
                return data;
            });
            pages.limit(5).skip((pnum-1) * 5).sort({'Artist':1});
            return pages;
        }

        this.createMusic = (artist, song) => {
            return new Promise((resolve, reject) => {
                const music = MusicModel({'id':uuid.v4(), 'Artist':artist, 'songTitle':song});
                MusicModel.findOne({'Artist': artist, 'songTitle':song}, (err, data) => {
                    if(data == null){
                        music.save((err) => {
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(true);
                            }
                        });
                    } else {
                        return reject(new Error("Duplicated Data"));
                    }
                });
            });            
        }

        this.updateMusic = (artist, song, title) => {
            return new Promise((resolve, reject) => {
                const music = MusicModel.findOne({'Artist':artist, 'songTitle':song}, (err, data) => {
                    if(data != null){
                        data.songTitle = title;
                        data.save((err) => {
                            if(err) {
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

        this.deleteMusic = (artist, song) => {
            return new Promise((resolve, reject) => {
                const music = MusicModel.findOne({'Artist':artist, 'songTitle':song}, (err, data) => {
                    if(data != null){
                        data.remove((err) => {
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

module.exports = {People, Pages, Dynamoose, SDK, Mongo};