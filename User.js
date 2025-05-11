const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {type: String , require: true , unique : true},
    password: {type: String , require: true},
    friendList: { type: [String], default: ['Alex' ,'Regina Lavaren' ,'Bob'] },
})

module.exports = mongoose.model('User' , UserSchema)