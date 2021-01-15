const MusicModel = require('../database/music');
const uuid = require('uuid');

class Mongo{
    constructor(){
        this.getMusic = (id, artist, song) => {
            return new Promise((resolve, reject) => {
                let srchType;
                if(id){ 
                    srchType = {"id":id};
                } else if(artist) { 
                    srchType = {"Artist":artist, "songTitle": song};
                } 
                MusicModel.find(srchType, (err, data) => {
                    if(err) return reject(err);
                    console.log(data[0]);
                    return resolve(data[0]);
                });
            });
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

        this.searchMusic = (id, stype, dir, page, artist, song) => {
            let music, srchType, sortType;
            const sort = dir == 'ASC' ? 1 : -1;
            if(id){
                srchType = {'id':id};
            } else if(artist){
                srchType = {'Artist':artist};
            } else if(song){
                srchType = {'songTitle': song};
            }
           
            if(stype == 'id'){
                sortType = {"id": sort};
            } else if(stype == 'Artist'){
                sortType = {"Artist": sort};
            } else if(stype == 'songTitle'){
                sortType = {"songTitle": sort};
            }
            music = MusicModel.find(srchType);
            
            music.limit(5).skip((page-1) * 5).sort(sortType);
            return music;
        }

    }
}

module.exports = {Mongo};