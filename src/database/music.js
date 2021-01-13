/********************* Dynamoose  **************************/

const Dynamoose = require('dynamoose');

const schema = new Dynamoose.Schema({
    id: String,
    Artist: String,
    songTitle: String
});

const music = Dynamoose.model('test01-music', schema);
module.exports = music;