'use strict';
var config = require('./config.js');

var ObjApi = require('digitalocean').Api;
var api = new ObjApi('x', 'y');
var token = 'z';
var exec = require('child_process').exec;
var image_id = 5450496;

var matchmakingQueue = [];
var activeGames = [];

var colors = require('colors');
// {
//     id: newDroplet.id,
//     ip: []
//     teams: []
// }

setInterval(function(){
    if(matchmakingQueue.length >= config.NUM_TEAMS){
        var team1 = matchmakingQueue.shift();
        var team2 = matchmakingQueue.shift();
        console.log(('Found Match for: ' + team1 + ' vs ' + team2).magenta);
        createGame([team1, team2]);
    }
}, 5000);

module.exports = function() {
    return {
        checkIfTeamIsActive: function(team){
            if(!team){return false;}
            var resObj = {};
            for (var i = 0; i < activeGames.length; i++) {
                var game = activeGames[i];
                var teams = game.config.teams;
                for( var j = 0; j < teams.length; j++){
                    var foundTeam = teams[j];
                    if(foundTeam.teamName == team.teamName){
                        resObj.ip = game.ip;
                        resObj.teams = teams;
                        return resObj;
                    }
                }
            }
            return false;
        },
        findTeam: function( teamName ){
            // search matchmaking queue and active games bag
        },
        removeTeam: function( teamName ){
            // remove team from matchmakingQueue
        },
        teamUpdate: function( ip, teams ){
            // find ip in activeGames
            // game.teams = teams

        },
        getTeamState: function( ip ){
            // find game in activeGames[ip]
            // return game.teams
        },
        addTeamToMatchmakingPool: function( team ){
            // find first config.NUM_TEAMS in matchmaking queue
            var alreadyInQueue = false;
            matchmakingQueue.forEach(function(t){
                if(team.teamName == t.teamName){
                    alreadyInQueue = true;
                }
            });
            if(this.checkIfTeamIsActive(team)){
                alreadyInQueue = true;
            }
            if(!alreadyInQueue){
                matchmakingQueue.push(team);
            }
        },
        createMatch: function(){

        },
        getGameConfig: function( ip ){
            // find mc droplet ip in activeGames
            // return the config
            var reqIP = ip;
            var resMsg = {};
            for (var i = 0; i < activeGames.length; i++) {
                var droplet = activeGames[i];
                if(droplet.ip == reqIP){
                    resMsg = JSON.stringify(droplet.config);
                }
            }
            if(!resMsg){
                console.log('ERROR: Game config not found for IP: ' + ip);
            }
            return resMsg;
        },
        endMatch: function( ip ){
            // Remove match from  active games
            // Shut down digital ocean box
            var gameToShutdown;
            for (var i = 0; i < activeGames.length; i++) {
                var game = activeGames[i];
                if(game.ip == ip){
                    gameToShutdown = activeGames[i];
                    activeGames.splice(i, 1);
                    break;
                }
            }
            if(gameToShutdown){
                var dropletId = gameToShutdown.id;
                console.log('Destroying: ' + dropletId);
                api.droplets.get(dropletId, function(droplet) {
                    droplet.destroy(function() {
                        console.log('Destroyed Droplet: ' + gameToShutdown.ip);
                    });
                });
            }
        }
    };
};

function createGame(teams){
    var config = {
        'serverUrl': 'https://s3.amazonaws.com/Minecraft.Download/versions/14w34b/minecraft_server.14w34b.jar',
        'worldUrl': 'local',
        'size': 1000,
        'teams': teams,
        'difficulty': 1
    };
    api.droplets.new({
        name: 'UHC',
        size_id: 64,
        image_id: image_id,
        region_id: 4,
        ssh_key_ids: [171452]
    }, function(newDroplet) {
        var inter = setInterval(function(){
            api.droplets.get(newDroplet.id, function(droplet){
                if(droplet.status == 'active'){
                    clearInterval(inter);
                    var cmd = 'curl -X GET "https://api.digitalocean.com/v2/droplets/'+droplet.id+'" -H "Authorization: Bearer '+token+'"';
                    exec(cmd, function(err, stdout, stderr){
                        if( err || stderr ){
                            console.error('Errors: ' + err + ' \n Stderr: ' + stderr);
                        }
                        var resp = JSON.parse(stdout);
                        var ip = resp.droplet.networks.v4[0].ip_address;

                        console.log('droplet: '+ droplet.name +' is now active. IP ' + ip);
                        // ip = '127.0.0.1';
                        activeGames.push({
                            id: newDroplet.id,
                            name: newDroplet.name,
                            ip: ip,
                            config: config
                        });
                    });
                }
            });
        }, 5000);
        //setTimeout(check droplet status)
    });
}
