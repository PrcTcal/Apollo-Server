const Mongoose = require('mongoose');

const schema = Mongoose.Schema({
    name : String,
    age : Number,
    addr : String
});

const pages = Mongoose.model('page', schema);
module.exports = pages;