const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const uuid = require('uuid');

class Dynamoose{
    constructor(){
        this.getMusic = async (id) => {
            const music = await MusicModel.scan({'id':id}).exec();
            return music[0];
        }

        this.createMusic = (Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                MusicModel.scan({'Artist':Artist, 'songTitle':songTitle}).exec((scanerr, result) => {
                    if(!scanerr){
                        if(result.count == 0){
                            MusicModel.create({'id':uuid.v4(), 'Artist':Artist, 'songTitle':songTitle, 'info':info, 'actv':actv, 'idx':idx}, (creerr)=>{
                                if(creerr){
                                    return reject(creerr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error('Duplicated Data'));
                        }
                    } else {
                        return reject(scanerr);
                    }
                });
            });
        }

        this.updateMusic = async (id, Artist, songTitle, info, actv, idx) => {
            let entity, music;
            let setVal = {};
            if(Artist) setVal['Artist'] = Artist;
            if(songTitle) setVal['songTitle'] = songTitle;
            if(info) setVal['info'] = info;
            if(actv != null) setVal['actv'] = actv;
            if(idx) setVal['idx'] = idx;
            try{
                entity = await MusicModel.scan({'id':id}).exec();
                console.log(setVal);
                if(entity.count > 0){
                    music = await MusicModel.update({'id':id}, {"$SET": setVal});
                    return true;
                } else {
                    return new Error('No data found');
                }
            } catch(err) {
                console.error(err);
                return false;
            }
        }

        this.removeMusic = async (id) => {
            let entity;
            try{
                entity = await MusicModel.scan({'id':id}).exec();
                if(entity.count > 0){
                    await MusicModel.delete(entity[0].id);
                    return true;
                } else {
                    return new Error("No data found");
                }
            } catch(err){
                console.error(err);
                return false;
            }
        }

        this.searchMusic = async (id, stype, dir, page, Artist, songTitle) => {
            let music;
            if(id){
                music = await MusicModel.scan({"id":id}).exec();
            } else if(Artist || songTitle){
                music = await MusicModel.scan({"Artist":Artist, "songTitle":songTitle}).exec();
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