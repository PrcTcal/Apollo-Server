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

        this.searchMusic = (id, stype, dir, page, Artist, songTitle) => {
            let music, srchType, sortType;
            const sort = dir == 'ASC' ? 1 : -1;
            if(id){
                srchType = {'id':id};
            } else if(Artist){
                srchType = {'Artist':Artist};
            } else if(songTitle){
                srchType = {'songTitle': songTitle};
            }
           
            if(stype){
                if(stype == 'id'){
                    sortType = {"id": sort};
                } else if(stype == 'Artist'){
                    sortType = {"Artist": sort};
                } else if(stype == 'songTitle'){
                    sortType = {"songTitle": sort};
                } else if(stype == 'idx'){
                    sortType = {"idx": sort};
                }
            }
            
            music = MusicModel.find(srchType)
            if(page){
                music.limit(5).skip((page-1) * 5).sort(sortType);
            } else {
                music.sort(sortType);
            }
            return music;
        }

    }
}

module.exports = {Mongo};