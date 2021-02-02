const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');
const uuid = require('uuid');
const Mongoose = require('mongoose');


// MongoDB 연결
Mongoose.connect(config.mongo_local_config, config.mongo_config)
.then(() => console.log('Successfully connected to MongoDB'))
.catch(e => console.error(e));
Mongoose.Promise = global.Promise;
console.log('DB : MongoDB');

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
}, {
    versionKey: false
});

let music = Mongoose.model(config.mongo_collection_name, schema);

let itemIdx = 4200;
let idx = 0;
function setDate(d){
    let y = d.getFullYear();
    let m = (d.getMonth()+1) < 10 ? "0" + (d.getMonth()+1) : (d.getMonth()+1);
    let dd = d.getDate() < 10 ? "0" + d.getDate() : d.getDate();
    return y + "-" + m + "-" + dd;
}

let getHtml = (ii, k) => {
    return new Promise(async (resolve, reject) => {
        try{
            let itemList = [];
            console.log("page index : " + ii);
            
            //let html = await axios.get("https://www.melon.com/chart/age/list.htm?idx=1&chartType=YE&chartGenre=KPOP&chartDate=" + ii + "&moved=Y");
            let html = await axios.get("https://www.melon.com/chart/age/list.htm?idx=1&chartType=YE&chartGenre=POP&chartDate=" + ii + "&moved=Y");
            let $ = cheerio.load(html.data);
            let $bodyList = $("tbody").children("tr");
            $bodyList.each(function (i, elem) {
                itemList[i] = {
                    id: uuid.v4(),
                    songTitle: $(this).find('.rank01 a').text(),
                    Artist: $(this).find('.rank02 .checkEllipsis a').text(),
                    info: {
                        album: $(this).find('.rank03 a').text(),
                        release: setDate(new Date(ii, 1, 1)),
                    },
                    actv: true,
                    idx: k++
                }
            });
            
            return resolve(itemList);
        } catch(err){
            return reject(err);
        }
    })
    
};
/*
getHtml(2, itemIdx).then(function(data){
    console.log(data);
    
});
*/

for(let i = 1 ; i <= 57 ; i++){
    getHtml(2013 - i, itemIdx).then(async function(data){
        console.log(data[0]);
        await music.insertMany(data);
        console.log('insertion terminated');
        
    });
    itemIdx += 50;
}
/*
해외 : 2019 ~ 2013 : 100개 -> 2020 - i, i <= 7 itemIdx 7049까지
      2012 ~ 1955 : 50개  -> 2013 - i, i <= 57 
국내 : 2019 ~ 1985 : 100개 -> 2020 - i, i <= 35 itemIdx 3499까지
*/