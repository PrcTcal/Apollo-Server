const MusicModel = require('../database/music');
const uuid = require('uuid');

class Mongo{
    constructor(){
        this.getMusic = (id) => {
            return new Promise((resolve, reject) => {
                MusicModel.find({"id":id}, (err, data) => {
                    if(err) return reject(err);
                    return resolve(data[0]);
                });
            });
        }

        this.createMusic = (Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                const music = MusicModel({'id':uuid.v4(), 'Artist':Artist, 'songTitle':songTitle, 'info':info, 'actv':actv, 'idx':idx});
                MusicModel.findOne({'Artist': Artist, 'songTitle':songTitle}, (finderr, data) => {
                    if(!finderr){
                        if(data == null){
                            music.save((saveerr) => {
                                if(saveerr) return reject(saveerr);
                                return resolve(true);
                            });
                        } else {
                            return reject(new Error("Duplicated Data"));
                        }
                    } else {
                        return reject(finderr);
                    }
                });
            });            
        }

        this.updateMusic = (id, Artist, songTitle, info, actv, idx) => {
            return new Promise((resolve, reject) => {
                MusicModel.findOne({'id':id}, (finderr, data) => {
                    if(!finderr){
                        if(data != null){
                            if(Artist) data.Artist = Artist;
                            if(songTitle) data.songTitle = songTitle;
                            if(info) data.info = info;
                            if(actv != null) data.actv = actv;
                            if(idx) data.idx = idx;
                            data.save((saveerr) => {
                                if(saveerr) {
                                    return reject(saveerr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("No data found"));
                        }
                    } else {
                        return reject(finderr);
                    }
                });
            });
        }

        this.removeMusic = (id) => {
            return new Promise((resolve, reject) => {
                MusicModel.findOne({'id':id}, (finderr, data) => {
                    if(!finderr){
                        if(data != null){
                            data.remove((remerr) => {
                                if(remerr){
                                    return reject(remerr);
                                } else {
                                    return resolve(true);
                                }
                            });
                        } else {
                            return reject(new Error("No data found"));
                        }
                    } else {
                        return reject(finderr);
                    }
                });
            });
        }

        this.searchMusic = (id, Artist, songTitle, info, actv, idx, settings) => {
            let music, srchType = {}, orParams = [], sortType;
            const sort = settings.dir == 'ASC' ? 1 : -1;
            if(settings.and || settings.and == null){
                if(id) srchType['id'] = id
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
            } else {
                if(id) orParams.push({"id":id});
                if(Artist) orParams.push({"Artist":Artist});
                if(songTitle) orParams.push({"songTitle":songTitle});
                if(info){
                    if(info.hometown) orParams.push({"info.hometown":info.hometown});
                    if(info.birth) orParams.push({"info.birth":info.birth});
                    if(info.album) orParams.push({"info.album":info.album});
                    if(info.release) orParams.push({"info.release":info.release});
                }
                if(actv != null) orParams.push({"actv":actv});
                if(idx) orParams.push({"idx":idx});
                if(orParams.length > 0) srchType = {$or: orParams};
            }
                       
            if(settings.stype){
                if(settings.stype == 'id') sortType = {"id": sort};
                else if(settings.stype == 'Artist') sortType = {"Artist": sort};
                else if(settings.stype == 'songTitle') sortType = {"songTitle": sort};
                else if(settings.stype == 'hometown') sortType = {"info.hometown": sort};
                else if(settings.stype == 'birth') sortType = {"info.birth": sort};
                else if(settings.stype == 'album') sortType = {"info.album": sort};
                else if(settings.stype == 'release') sortType = {"info.release": sort};
                else if(settings.stype == 'actv') sortType = {"actv": sort};
                else if(settings.stype == 'idx') sortType = {"idx": sort};
            }
            
            music = MusicModel.find(srchType)
            if(settings.page){
                music.limit(5).skip((settings.page-1) * 5).sort(sortType);
            } else {
                music.sort(sortType);
            }
            return music;
        }

    }
}

module.exports = {Mongo};