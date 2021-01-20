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
                            MusicModel.create({'dummy':0, 'd2':result.scannedCount.toString(), 'id':uuid.v4(), 'Artist':Artist, 'songTitle':songTitle, 'info':info, 'actv':actv, 'idx':idx}, (creerr)=>{
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
                if(entity.count > 0){
                    // test01-music 테이블용
                    //music = await MusicModel.update({'id':id}, {"$SET": setVal});

                    // test01-music2 테이블용
                    music = await MusicModel.update({'dummy':0, 'd2':entity[0].d2}, {"$SET": setVal});
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
                console.log(entity);
                if(entity.count > 0){
                    // test01-music 테이블용
                    //await MusicModel.delete(entity[0].id);

                    // test01-music2 테이블용
                    await MusicModel.delete({'dummy':0, 'd2':entity[0].d2});
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
            if(settings.and || settings.and == null){
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
                if(Artist) music = music != null ? music.or().where('Artist').eq(Artist) : MusicModel.scan('Artist').eq(Artist);
                if(songTitle) music = music != null ? music.or().where('songTitle').eq(songTitle) : MusicModel.scan('songTitle').eq(songTitle);
                if(info){
                    if(info.hometown) music = music != null ? music.or().where('info.hometown').eq(info.hometown) : MusicModel.scan('info.hometown').eq(info.hometown);
                    if(info.birth) music = music != null ? music.or().where('info.birth').eq(info.birth) : MusicModel.scan('info.birth').eq(info.birth);
                    if(info.album) music = music != null ? music.or().where('info.album').eq(info.album) : MusicModel.scan('info.album').eq(info.album);
                    if(info.release) music = music != null ? music.or().where('info.release').eq(info.release) : MusicModel.scan('info.release').eq(info.release);
                }
                if(actv != null) music = music != null ? music.or().where('actv').eq(actv) : MusicModel.scan('actv').eq(actv);
                if(idx) music = music != null ? music.or().where('idx').eq(idx) : MusicModel.scan('idx').eq(idx);
                if(!music) music = MusicModel.scan();
                music = await music.exec();
            }
            
            if(settings.dir){
                music.sort((a, b) => {
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
                let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                    temp.push(music[i]);
                }
                music = temp;
            }
            return music;
        }

        this.queryMusic = async (id, Artist, songTitle, info, actv, idx, settings) => {
            let music = await MusicModel.query("dummy").eq(0);            
            if(settings.and || settings.and == null){
                if(id) music.and().where('id').eq(id);
                if(Artist) music.and().where('Artist').eq(Artist);
                if(songTitle) music.and().where('songTitle').eq(songTitle);
                if(info){
                    if(info.hometown) music.and().where('info.hometown').eq(info.hometown);
                    if(info.birth) music.and().where('info.birth').eq(info.birth);
                    if(info.album) music.and().where('info.album').eq(info.album);
                    if(info.release) music.and().where('info.release').eq(info.release);
                }
                if(actv != null) music.and().where('actv').eq(actv);
                if(idx) music.and().where('idx').eq(idx);
            } else {
                let orExp = new dynamoose.Condition();
                if(id) orExp.or().where('id').eq(id);
                if(Artist) orExp.or().where('Artist').eq(Artist);
                if(songTitle) orExp.or().where('songTitle').eq(songTitle);
                if(info){
                    if(info.hometown) orExp.or().where('info.hometown').eq(info.hometown);
                    if(info.birth) orExp.or().where('info.birth').eq(info.birth);
                    if(info.album) orExp.or().where('info.album').eq(info.album);
                    if(info.release) orExp.or().where('info.release').eq(info.release);
                }
                if(actv != null) orExp.or().where('actv').eq(actv);
                if(idx) orExp.or().where('idx').eq(idx);
                if(orExp.settings.conditions.length > 0) music.and().parenthesis(orExp);
            }
            music = await music.exec();
            
            if(settings.dir){
                music.sort((a, b) => {
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
                let endIndex = music.length > settings.page * 5 ? settings.page * 5 : music.length;
                for(let i = (settings.page - 1) * 5 ; i < endIndex  ; i++){
                    temp.push(music[i]);
                }
                music = temp;
            }
            return music;
        }
    }
}

module.exports = {Dynamoose};