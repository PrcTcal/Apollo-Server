const MusicModel = require('../database/music');
const uuid = require('uuid');

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

module.exports = {Mongo};