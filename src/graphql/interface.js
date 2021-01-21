const config = require('../config/config.js');
const dynaConn = require('./dynaconnector');
const sdkConn = require('./sdkconnector');
const mongoConn = require('./mongoconnector');

function createMusic(Artist, songTitle, info, actv, idx){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.createMusic(Artist, songTitle, info, actv, idx);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.createMusic(Artist, songTitle, info, actv, idx);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.createMusic(Artist, songTitle, info, actv, idx);
    }
}

function getMusic(id){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.getMusic(id);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.getMusic(id);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.getMusic(id);
    }
}

function updateMusic(id, Artist, songTitle, info, actv, idx){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.updateMusic(id, Artist, songTitle, info, actv, idx);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.updateMusic(id, Artist, songTitle, info, actv, idx);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.updateMusic(id, Artist, songTitle, info, actv, idx);
    }
}

function removeMusic(id){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.removeMusic(id);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.removeMusic(id);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.removeMusic(id);
    }
}

function searchMusic(Artist, songTitle, info, actv, idx, settings){
    if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.searchMusic(Artist, songTitle, info, actv, idx, settings);
    } else if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.searchMusic(Artist, songTitle, info, actv, idx, settings);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.searchMusic(Artist, songTitle, info, actv, idx, settings);
        }
    }
}

function queryMusic(Artist, songTitle, info, actv, idx, settings){
    if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.queryMusic(Artist, songTitle, info, actv, idx, settings);
    } else if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.queryMusic(Artist, songTitle, info, actv, idx, settings);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.queryMusic(Artist, songTitle, info, actv, idx, settings);
        }
    }
}


module.exports = {createMusic, getMusic, updateMusic, removeMusic, searchMusic, queryMusic};