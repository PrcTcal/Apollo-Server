const config = require('../config/config.js');

let music;
if(config.db_select == 'dynamo'){
    const Dynamoose = require('dynamoose');

    const schema = new Dynamoose.Schema({
        id: String,
        Artist: String,
        songTitle: String
    });
    
    music = Dynamoose.model(config.aws_table_name, schema);
} else if(config.db_select == 'mongo'){
    const Mongoose = require('mongoose');

    const schema = Mongoose.Schema({
        id: String,
        Artist: String,
        songTitle: String
    },
    {
        versionKey:false
    });

    music = Mongoose.model(config.mongo_collection_name, schema);
}

module.exports = music;