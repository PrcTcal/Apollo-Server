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

class Music{
    constructor(){
        /********************* Dynamoose CRUD *************************************/
        this.findMusic = async (pnum) => {
            const music = await MusicModel.scan().limit(3 * (pnum - 1)).exec();
            const result = await MusicModel.scan().startAt(music.lastKey).limit().exec();
            console.log(result);
            return result;
        }

        this.addMusic = async (artist, song) => {
            let music;
            try{
                music = await MusicModel.create({'id':uuid.v4(), 'Artist':artist, 'songTitle':song});
                console.log(music);
            } catch(err){
                console.error(err);
            }
            return music;
        }

        this.updateMusic = async (artist, song, title) => {
            let entity, music;
            try{
                entity = await MusicModel.scan({'Artist':artist, 'songTitle':song}).exec();
                music = await MusicModel.update({'id':entity[0].id}, {"$SET": {'songTitle':title}});
                console.log('update success!');
            } catch(err) {
                console.error(err);
            }
            return music;
        }

        this.deleteMusic = async (artist, song) => {
            let music;
            const entity = await MusicModel.scan({'Artist':artist, 'songTitle':song}).exec();
            if(entity != null){
                music = MusicModel.delete(entity[0].id, (err) => {
                    if(err) console.error(err);
                    return;
                });
            }
            return entity[0];
        }

        /************************ AWS_SDK CRUD ***********************************/
        this.sdkMusic = () => {
            return new Promise((resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
                    TableName: config.aws_table_name
                };
                docClient.scan(params, function(err, data) {
                    if (err) {
                      return reject(err);
                    } else {
                        console.log(data);
                      return resolve(data['Items']);
                    }
                });
            });
        }

        this.addSdkMusic = (artist, song) => {
            return new Promise(async (resolve, reject) => {
                AWS.config.update(config.aws_remote_config);
                let docClient = new AWS.DynamoDB.DocumentClient();
                let params = {
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
                        return reject(err);
                    } else {
                        return resolve(result['Item']);
                    }
                });
                
            });
        }

        this.updateSdkMusic = (artist, song, title) => {
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
                                console.log('targetId : ' + targetId);
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
                        docClient.update(params, (err, data) => {
                            if(err){
                                return reject(err);
                            } else {
                                return resolve(data);
                            }
                        });
                    }
                });   
            });
        }

        this.deleteSdkMusic = async (artist, song) => {
            AWS.config.update(config.aws_remote_config);
            let docClient = new AWS.DynamoDB.DocumentClient();
            let targetId;
            let params = {
                TableName: config.aws_table_name
            }
            const music = await docClient.scan(params);
            console.log(music);
            for(let item of result['Items']){
                if(item.Artist == artist && item.songTitle == song){
                    targetId = item.id;
                    console.log(targetId);
                }
            }
            params = {
                TableName: config.aws_table_name,
                Key: {
                    "id": targetId
                }
            };
            const rs = await docClient.delete(params);
            console.log(rs);
            return rs;
        }
    }
}

module.exports = {People, Pages, Music};