const PeopleModel = require('../database/mongo');
const PagesModel = require('../database/pages');
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

class Pages{
    constructor(){
        this.retrieveData = (srchType, srchWord, pnum, sname, sage, saddr) => {
           let pages;

           // 검색어가 없을시
            if(srchWord == null){
                pages = PagesModel.find({}, (err, data) => {
                    if(err) console.error(err);
                    console.log(data);
                    return data;
                });
            // 검색어가 있을시 검색어로 검색
            } else {
                if(srchType == 'name') pages = PagesModel.find({'name' : srchWord});
                else if(srchType == 'age') pages = PagesModel.find({'age' : Number.parseInt(srchWord)});
                else if(srchType == 'addr') pages = PagesModel.find({'addr' : srchWord});
            }

            // Pagination(3개 단위)
            // 이름, 나이, 주소로 정렬입력이 들어왔을 때 정렬(오름차순은 1, 내림차순은 -1)
            // 정렬 순서는 고정적(이름 - 나이 - 주소 순) -> 가변적으로 하는 방법은 못찾음
            pages.limit(3).skip((pnum-1) * 3).sort({'name':sname, 'age':sage, 'addr':saddr});
            return pages;
        }
    }
}

module.exports = {People, Pages};