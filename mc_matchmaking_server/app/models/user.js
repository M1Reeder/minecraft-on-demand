'use strict';
// app/models/user.js
// load the things we need
var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var teamSchema = mongoose.Schema({
    teamName: {type: String, required:true},
    players: [String],
    bannerPattern: {type: String}
});

// define the schema for our user model
var userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true},
    minecraft_name: { type: String, required: true },
    teams: [teamSchema]
});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);