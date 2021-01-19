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

        this.searchMusic = async (id, Artist, songTitle, info, actv, idx, settings) => {
            let music, srchType = {};
            if(settings.and || !settings.and){
                if(id) srchType['id'] = id;
                if(Artist) srchType['Artist'] = Artist;
                if(songTitle) srchType['songTitle'] = songTitle;
                if(info){
                    if(info.hometown) srchType['info.hometown'] = info.hometown;
                    if(info.birth) srchType['info.birth'] = info.birth;
                    if(info.album) srchType['info.album'] = info.album;
                    if(info.release) srchType['info.release'] = info.release;
                }
                if(actv != null) srchType['actv'] = actv;
                if(idx) srchType['idx'] = idx;
                music = await MusicModel.scan(srchType).exec();

            } else {
                if(id) music = MusicModel.scan('id').eq(id);
                if(Artist){
                    if(music) music.or().where('Artist').eq(Artist);
                    else music = MusicModel.scan('Artist').eq(Artist);
                }
                if(songTitle){
                    if(music) music.or().where('songTitle').eq(songTitle);
                    else music = MusicModel.scan('songTitle').eq(songTitle);
                }
                if(info){
                    if(info.hometown){
                        if(music) music.or().where('info.hometown').eq(info.hometown);
                        else music = MusicModel.scan('info.hometown').eq(info.hometown);
                    }
                    if(info.birth){
                        if(music) music.or().where('info.birth').eq(info.birth);
                        else music = MusicModel.scan('info.birth').eq(info.birth);
                    }
                    if(info.album){
                        if(music) music.or().where('info.album').eq(info.album);
                        else music = MusicModel.scan('Artist').eq(info.album);
                    }
                    if(info.release) {
                        if(music) music.or().where('info.release').eq(info.release);
                        else music = MusicModel.scan('info.release').eq(info.release);
                    }
                }
                if(actv != null) {
                    if(music) music.or().where('actv').eq(actv);
                    else music = MusicModel.scan('actv').eq(actv);
                }
                if(idx) {
                    if(music) music.or().where('idx').eq(idx);
                    else music = MusicModel.scan('idx').eq(idx);
                }
                if(!music) music = MusicModel.scan();
                music = await music.exec();
            }
            
            if(settings.dir){
                music.sort((a, b) => {
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
                let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                    temp.push(music[i]);
                }
                music = temp;
            }
            return music;
        }

        this.queryMusic = async (id, Artist, songTitle, info, actv, idx, settings) => {
            let music;
            if(settings.and || settings.and == null){
                music = await MusicModel.query('id').eq(id).exec();
                //console.log(music);
                music = await music.filter('Artist').eq(Artist).exec();
                console.log(music);
                //if(Artist) music = music.and().where('Artist').eq(Artist);
                /*
                if(songTitle) music.and().where('songTitle').eq(songTitle);
                if(info){
                    if(info.hometown) music.and().where('info.hometown').eq(info.hometown);
                    if(info.birth) music.and().where('info.birth').eq(info.birth);
                    if(info.album) music.and().where('info.album').eq(info.album);
                    if(info.release) music.and().where('info.release').eq(info.release);
                }
                if(actv != null) music.and().where('actv').eq(actv);
                if(idx) music.and().where('idx').eq(idx);
                */
                
                //music = await music.exec();
                //console.log(music);
            } else {
                music = MusicModel.query('id').eq(id);
                console.log('1');
                if(Artist) music.or().where('Artist').eq(Artist);
                console.log('2');
                if(songTitle) music.or().where('songTitle').eq(songTitle);
                if(info){
                    if(info.hometown) music.or().where('info.hometown').eq(info.hometown);
                    if(info.birth) music.or().where('info.birth').eq(info.birth);
                    if(info.album) music.or().where('info.album').eq(info.album);
                    if(info.release) music.or().where('info.release').eq(info.release);
                }
                if(actv != null) music.or().where('actv').eq(actv);
                if(idx) music.or().where('idx').eq(idx);
                console.log('3');
                music = await music.exec();
                console.log('4');
            }
            /*
            if(settings.dir){
                music.sort((a, b) => {
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
                let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                    temp.push(music[i]);
                }
                music = temp;
            }*/
            return music;
        }
    }
}

module.exports = {Dynamoose};