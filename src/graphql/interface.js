const config = require('../config/config.js');
//const context = require('./connector');
const dynaConn = require('./dynaconnector');
const sdkConn = require('./sdkconnector');
const mongoConn = require('./mongoconnector');

function createMusic(artist, song){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.createMusic(artist, song);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.createMusic(artist, song);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.createMusic(artist, song);
    }
}

function readMusic(pnum){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.readMusic(pnum);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.readMusic(pnum);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.readMusic(pnum);
    }
}

function updateMusic(artist, song, title){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.updateMusic(artist, song, title);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.updateMusic(artist, song, title);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.updateMusic(artist, song, title);
    }
}

function deleteMusic(artist, song){
    if(config.db_select == 'dynamo'){
        if(config.db_mapper == 'dynamoose'){
            const music = new dynaConn.Dynamoose();
            return music.deleteMusic(artist, song);
        } else if(config.db_mapper == 'aws_sdk'){
            const music = new sdkConn.SDK();
            return music.deleteMusic(artist, song);
        }
    } else if(config.db_select == 'mongo'){
        const music = new mongoConn.Mongo();
        return music.deleteMusic(artist, song);
    }
}

module.exports = {createMusic, readMusic, updateMusic, deleteMusic};