const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const uuid = require('uuid');

class Dynamoose{
    constructor(){
        this.getMusic = async (id, artist, song) => {
            let srchType;
            if(id){
                srchType = {'id':id};
            } else if(artist){
                srchType = {'Artist':artist, 'songTitle': song};
            }
            const music = await MusicModel.scan(srchType).exec();
            console.log(music);
            return music;
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

        this.searchMusic = async (id, stype, dir, page, artist, song) => {
            let music;
            if(id){
                music = await MusicModel.scan({"id":id}).exec();
            } else if(artist){
                music = await MusicModel.scan({"Artist":artist}).exec();
            } else if(song){
                music = await MusicModel.scan({"songTitle":song}).exec();
            } else {
                music = await MusicModel.scan().exec();
            }


            if(dir){
                music.sort((a, b) => {
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
                let endIndex = music.length > page * 5 ? page * 5 : music.length;
                for(let i = (page - 1) * 5 ; i < endIndex  ; i++){
                    temp.push(music[i]);
                }
                music = temp;
            }
            console.log(music);
            return music;
        }
    }
}

module.exports = {Dynamoose};