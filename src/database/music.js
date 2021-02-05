const config = require('../config/config.js');
const Dynamoose = require('dynamoose');
const Mongoose = require('mongoose');

let music, mongo_music, dynamo_music;

if(config.db_select == 'all') {
    const dynamo_schema = new Dynamoose.Schema({
        dummy: {
            type: Number,
            hashKey: true
        },
        id: {
            type: String,
            rangeKey:true
        },
        Artist: String,
        songTitle: String,
        hometown: String,
        birth: String,
        album: String,
        release: String,
        actv: Boolean,
        idx: Number,
        srchArtist: String,
        srchidx: Number,
        srchsongTitle: String
    },
    {
        useDocumentTypes: true,
        saveUnknown: true
    });
    
    const mongo_schema = Mongoose.Schema({
        id: String,
        Artist: String,
        songTitle: String,
        info: {
            hometown: String,
            birth: String,
            album: String,
            release: String
        },
        actv: Boolean,
        idx: Number
    },
    {
        versionKey:false
    });

    module.exports = {mongo_schema, dynamo_schema};
} else {
    if(config.db_select == 'dynamo'){

        const schema = new Dynamoose.Schema({
            dummy: {
                type: Number,
                hashKey: true
            },
            id: {
                type: String,
                rangeKey:true
            },
            Artist: String,
            songTitle: String,
            hometown: String,
            birth: String,
            album: String,
            release: String,
            actv: Boolean,
            idx: Number,
            srchArtist: String,
            srchidx: Number,
            srchsongTitle: String
        },
        {
            useDocumentTypes: true,
            saveUnknown: true
        });
        
        music = Dynamoose.model(config.aws_table_name, schema);
    } else if(config.db_select == 'mongo'){
    
        const schema = Mongoose.Schema({
            id: String,
            Artist: String,
            songTitle: String,
            info: {
                hometown: String,
                birth: String,
                album: String,
                release: String
            },
            actv: Boolean,
            idx: Number
        },
        {
            versionKey:false
        });
    
        music = Mongoose.model(config.mongo_collection_name, schema);
    }
    
    module.exports = {music, dynamo_music, mongo_music};

}

