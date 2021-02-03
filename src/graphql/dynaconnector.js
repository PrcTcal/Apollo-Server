const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const uuid = require('uuid');

class Dynamoose{
    constructor(){
        this.getMusic = async (id) => {
            const music = await MusicModel.music.scan({'id':id}).exec();
            return music[0];
        }

        this.createMusic = (Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                MusicModel.music.scan({'Artist':Artist, 'songTitle':songTitle}).exec((scanerr, result) => {
                    if(!scanerr){
                        if(result.count == 0){
                            MusicModel.music.create({'dummy':0, 'id':uuid.v4(), 'Artist':Artist, 'songTitle':songTitle, 'info':info, 'actv':actv, 'idx':idx, 'srchArtist':Artist, 'srchidx':idx, 'srchsongTitle':songTitle}, (creerr, data)=>{
                                if(creerr){
                                    return reject(creerr);
                                } else {
                                    return resolve(data);
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
            if(Artist) { setVal['Artist'] = Artist; setVal['srchArtist'] = Artist; }
            if(songTitle) { setVal['songTitle'] = songTitle; setVal['srchsongTitle'] = songTitle; }
            if(info) setVal['info'] = info;
            if(actv != null) setVal['actv'] = actv;
            if(idx) { setVal['idx'] = idx; setVal['srchidx'] = idx; }
            try{
                entity = await MusicModel.music.scan({'id':id}).exec();
                if(entity.count > 0){
                    // test01-music 테이블용
                    //music = await MusicModel.update({'id':id}, {"$SET": setVal});

                    // test01-music2 테이블용
                    music = await MusicModel.music.update({'dummy':0, 'id':entity[0].id}, {"$SET": setVal});
                    return music;                    
                } else {
                    return new Error('No data found');
                }
            } catch(err) {
                return err;
            }
        }

        this.removeMusic = async (id) => {
            let entity;
            try{
                entity = await MusicModel.music.scan({'id':id}).exec();
                if(entity.count > 0){
                    // test01-music 테이블용
                    //await MusicModel.delete(entity[0].id);

                    // test01-music2 테이블용
                    await MusicModel.music.delete({'dummy':0, 'id':entity[0].id});
                    return entity[0];
                } else {
                    return new Error("No data found");
                }
            } catch(err){
                return err;
            }
        }

        this.searchMusic = async (Artist, songTitle, info, actv, idx, settings) => {
            let music, srchType = {};
            let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
            if(input != null){
                for(let item in input){
                    if(item == 'info'){
                        for(let it in input[item]){
                            if(settings != null){
                                if(settings.and || settings.and == null){
                                    srchType['info.' + it] = input[item][it];
                                } else {
                                    music = music != null ? music.or().where('info.' + it).eq(input[item][it]) : MusicModel.music.scan('info.' + it).eq(input[item][it]);
                                } 
                            } else {
                                srchType['info.' + it] = input[item][it];
                            }
                        }   
                    } else {
                        if(settings != null){
                            if(settings.and || settings.and == null){
                                if(input[item] != null) srchType[item] = input[item];
                            } else {
                                if(input[item] != null) music = music ? music.or().where(item).eq(input[item]) : MusicModel.music.scan(item).eq(input[item]);
                            }
                        } else {
                            if(input[item] != null) srchType[item] = input[item];
                        }
                    }
                }

                if(settings != null){
                    music = settings.and || settings.and == null ? await MusicModel.music.scan(srchType).exec() : (music ? await music.exec() : await MusicModel.music.scan.exec());
                } else {
                    music = await MusicModel.music.scan(srchType).exec();
                }
            } else {
                music = await MusicModel.music.scan().exec();
            }
       
            if(settings != null){
                if(settings.dir != null && settings.stype != null){
                    music.sort((a, b) => {
                        return settings.dir == 'ASC' ? (a[settings.stype] > b[settings.stype] ? 1 : -1) : (a[settings.stype] < b[settings.stype] ? 1 : -1);
                    });
                }

                if(settings.page != null){
                    let temp = new Array();
                    let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                    for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                        temp.push(music[i]);
                    }
                    music = temp;
                }
            }

            return music;
        }

        this.queryMusic = async (Artist, songTitle, info, actv, idx, settings) => {
            let rs = [];
            let music, temp;
            let cond = new dynamoose.Condition();
            let input = {"Artist":Artist, "songTitle":songTitle, "info":info, "actv":actv, "idx":idx};
            if(settings != null){
                music = settings.stype != null ? MusicModel.music.query("dummy").eq(0).using(settings.stype + '-index') : MusicModel.music.query("dummy").eq(0);
            }
            for(let item in input){
                if(input[item] != null){
                    if(item == 'info'){
                        for(let it in input[item]){
                            if(input[item][it] != null){
                                if(settings != null){
                                    settings.and || settings.and == null ? music.and().where('info.' + it).eq(input[item][it]) : cond.or().where('info.' + it).eq(input[item][it]);
                                } else {
                                    music.and().where('info.' + it).eq(input[item][it]);
                                }
                            }
                        }
                    } else {
                        if(settings != null && input[item] != null){
                            settings.and || settings.and == null ? music.and().where(item).eq(input[item]) : (settings.stype != item || settings.stype == null ? cond.or().where(item).eq(input[item]) : cond.or().where('srch' + item).eq(input[item]));
                        } else {
                            if(settings.stype != item) music.and().where(item).eq(input[item]);
                        }
                    }
                }
            }
            if(cond.settings.conditions.length > 0) music.and().parenthesis(cond);
            if(settings != null){
                if(settings.dir != null){
                    settings.dir == "ASC" ? music.sort("ascending") : music.sort("descending");
                }
                if(settings.page != null) {
                    if(Artist == null && songTitle == null && info == null && actv == null && idx == null){
                        music.limit(settings.page == 1 ? 5 : 5 * (settings.page - 1));
                        temp = music;
                    }
                }
            }
            
            music = await music.exec();
            if(settings != null && settings.page != null){
                if(Artist == null && songTitle == null && info == null && actv == null && idx == null){
                    if(settings.page > 1){
                        if(music.lastKey != null) { 
                            music = await temp.startAt(music.lastKey).exec();
                        } else {
                            music = [];
                        }
                    }
                } else {
                    for(let i = 5 * (settings.page - 1) ; i < settings.page * 5 && i < music.count ; i++){
                        rs.push(music[i]);
                    }
                    music = rs;
                }
            }
            
            return music;
        }
    }
}

module.exports = {Dynamoose};