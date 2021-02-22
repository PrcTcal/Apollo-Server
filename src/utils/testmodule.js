
const addFunc = (json) => {
    if(json.idx < 4000){
        json['upper'] = false;
    } else {
        json['upper'] = true;
    }

    if(json.idx < 1000){
        json['info']['final'] = {correct : true};
    }
    return json;
}

const editFunc = (json) => {
    if(json.upper == false){
        delete json.upper;
        json['lower'] = true;
    }
    return json;
}

const deleteFunc = (json) => {
    if(json.upper) delete json.upper;
    if(json.lower) delete json.lower;
    return json;
}


module.exports = {addFunc, editFunc, deleteFunc};