'use strict';
var needle = require('needle');

module.exports = function(config){
    var url = config.masterUrl;
    return {
        message: function(msg, callback){
            var options = {
                type: 'msg',
                msg: msg
            };
            needle.post(url + '/game-updates', options, callback);
        },
        teamUpdate: function(teams, callback){
            var options = {
                type: 'teamUpdate',
                teams: teams
            };
            needle.post(url + '/game-updates', options, callback);
        },
        kill: function(winningTeamName, callback){
            //tell parent to shut down this box
            needle.post(url + '/kill', {winningTeamName: winningTeamName}, callback);
        }
    };

};