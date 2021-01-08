const PeopleModel = require('../database/mongo');
class People{
    constructor(){
        this.findPeople = () => {
            const pp = PeopleModel.find({}, (err, data) =>{
                if(err) console.error(err);
                //console.log(data);
                return data;
            });
            return pp;
        };

        this.findPerson = (name) => {
            const ps = PeopleModel.findOne({'name':name}, (err, data) => {
                if(err) console.error(err);
                //console.log(data);
                return data;
            });
            return ps;
        }

        this.addPerson = (name, age, score, skills) => {
            const person = PeopleModel({'name':name, 'age':age, 'score':score, 'skills':skills});
            PeopleModel.findOne({'name':name}, (err, data) => {
                if(data == null){
                    person.save((err) => {
                        if(err) console.error(err);
                        return ;
                    });
                }
            });
            return person;
        }

        this.updateAge = (name, age) => {
            const person = PeopleModel.findOne({'name':name}, (err, person) => {
                if(person != null){
                    person.age = age;
                    person.save((err) => {
                        if(err) console.error(err);
                        return;
                    });
                }
            });
            return person;
        }

        this.removePerson = (name) => {
            const person = PeopleModel.findOne({'name':name}, (err, person) => {

                if(person != null){
                    person.remove((err, cnt) => {
                        if(err) console.error(err);
                        return;
                    });
                }
            });
            return person;
        }
    }
}

module.exports = {People};