const MusicModel = require('../database/music');
const dynamoose = require('dynamoose');
const uuid = require('uuid');

class Dynamoose{
    constructor(){
        this.readMusic = async (pnum) => {
            const music = await MusicModel.scan().limit(5 * (pnum - 1)).exec();
            const result = await MusicModel.scan().startAt(music.lastKey).limit(5).exec();
            console.log(result);
            return result;
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
    }
}

module.exports = {Dynamoose};