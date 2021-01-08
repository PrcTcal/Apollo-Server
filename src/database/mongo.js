const Mongoose = require('mongoose');

const schema = Mongoose.Schema({
    name : String,
    age : Number,
    score : Number,
    skills : Array 
});

const people = Mongoose.model('person', schema);
module.exports = people;