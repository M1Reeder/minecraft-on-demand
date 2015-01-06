// {
//     'action1': ['Server Message1', 'Server Message 2']
// }
'use strict';
var spawn = require('child_process').spawn;
// needle.post(aliveConfig.serverBaseUrl + '/game-updates', data);
var mc;

module.exports = function( config, callback ){
    var updater = require('./updater')(config);
    var gameStarted = false;
    var dir = config.mcServerDir;
    var checkDeathsInterval;
    var titleInterval;
    var titleQueue = [];
    config.teamsAlive = [];

    //Used to create the initial whitelist
    config.playersTemp = [];
    config.teams.forEach(function(team){
        team.players.forEach(function(player){
            config.playersTemp.push(player);
        });
    });

    updater.message('Starting up minecraft', function(err, resp){
        process.chdir(dir);
        // mc = spawn('nohup', [ 'java', '-jar', '-Xincgc', '-Xmx2G', 'minecraft.jar', 'nogui']);
        mc = spawn('nohup', [ 'java', '-jar', '-Xincgc', '-Xmx2G', 'minecraft.jar']);
        mc.stdin.setEncoding = 'utf8';
        mc.stderr.setEncoding = 'utf8';
        mc.stdout.setEncoding = 'utf8';

        mc.stdout.on('data',function(data){
            var output = String(data);
            //remove minecraft boilerplate
            var outputarray = output.split('\n');
            outputarray.forEach(function(output){
                // If not form the server (java error for example) ignore
                if(!check(output, ['Server thread', 'INFO'])){
                    return;
                }

                output = output.replace(/\[Server thread\/INFO\]: /g, '');
                output = output.replace(/\[[0-9]+:[0-9]+:[0-9]+\] /g,'');

                console.log('%s', output);
                //filter out user input
                if(output.match(/<[A-Za-z0-9_]+>/)){
                    console.log('ignored player input');
                    return;
                } else if (output.match(/java/)){

                }
                handle(output);
            });
        });

        mc.stderr.on('data',function(data){
            console.log(String(data));
        });

        mc.on('close', function(close){
            //take down this server on digital ocean
            updater.message('Game Complete');
            mc.stdin.end();

            callback(null);
        });
    });

    function handle(output){
        if(check(output, ['Done', 'For help, type "help" or "?"'])){
            createLobby();
            createWhiteList();
        } else if(whitelistOutput(output)){
            var realNames = output.replace(/ /g,'');
            realNames = realNames.replace('and', ',');
            realNames = realNames.replace(/(\r\n|\n|\r)/gm,'');
            realNames = realNames.split(',');
            correctConfigNames(realNames);
            updater.teamUpdate(config.teams);
        } else if (check(output, 'joined the game')){
            // updater.message(Player + '');
            cmd('list');
        } else if (check(output, ['There are', 'players online:']) && !gameStarted){
            var part = output.split('/');
            var currentNumPlayers = part[0].slice(-1);
            var totalNumPlayers = part[1].charAt(0);
            console.log('Player count: ' + currentNumPlayers + ', ' + totalNumPlayers);
            if(currentNumPlayers == totalNumPlayers){
                updater.message('Game Started');
                cmd('say Waiting on 0 more player(s) to join');
                cmd('say Begin');
                initGame();
                gameStarted = true;
            }else{
                title('title @a times 0 60 0');
                title('title @a title {text:"- Lobby -"}');
                cmd('say Waiting on ' + (totalNumPlayers - currentNumPlayers) + ' more player(s) to join');
            }
        } else if (check(output, ['Found '])) {
            console.log('* * FOUND: * *' + JSON.stringify(config.teamsAlive));
            var playerName = output.replace('Found ', '');
            playerName = playerName.replace(/(\r\n|\n|\r)/gm,'').replace('/ /g','');

            var index = config.playersAlive.indexOf(playerName);
            if(index > -1){
                title('title @a title {text:""}');
                title('title @a subtitle {text:"' + playerName + ' Died!"}');
                cmd('say ' + playerName + ' Died.');
                console.log(playerName + ' being removed');
                config.playersAlive.splice(index, 1);
                cmd('kick '+playerName);
                cmd('whitelist remove '+playerName);

                config.teamsAlive.forEach(function(team){
                    //Find which team player is on
                    if(team.players.indexOf(playerName) > -1){
                        //Find the index of the team
                        var teamIndex = config.teamsAlive.indexOf(team);

                        var playerIndex = config.teamsAlive[teamIndex].players.indexOf(playerName);
                        if(playerIndex > -1){
                            config.teamsAlive[teamIndex].players.splice(playerIndex, 1);
                        }
                        if(config.teamsAlive[teamIndex].players.length === 0){
                            config.teamsAlive.splice(teamIndex, 1);
                            console.log('Team ' + team.teamName + ' is out of people');
                        }
                    }
                });

                if(config.teamsAlive.length === 1){
                    var winningTeam = config.teamsAlive[0].teamName;
                    cmd('say ' + winningTeam + ' wins');
                    console.log(winningTeam + ' WINS!');
                    title('title @a title {text:"' + winningTeam + ' Wins!"}');
                    cmd('/particle mobSpell ~ ~ ~ 1 1 1 3 1000 @a');
                    cmd('say server shutting down in 20 seconds.');

                    updater.message(winningTeam + ' wins');
                    clearInterval(checkDeathsInterval);
                    setTimeout(function(){
                        console.log('stopping server');
                        updater.kill(winningTeam, function(){
                            cmd('stop');
                        });
                    }, 20000);
                }
                updater.teamUpdate(config.teamsAlive);
                console.log('\n* * * Teams Alive * * *\n' + JSON.stringify(config.teamsAlive));
            }
        }
    }

    // function indexOfLowerCase(players, name){
    //     var isIn = false;
    //     var tempAry = [];
    //     players.forEach(function(player){
    //         tempAry.push(player.toLowerCase());
    //     });

    //     tempAry.forEach(function(player){
    //         if(player.indexOf(name) > -1){
    //             isIn = true;
    //         }
    //     });
    //     return isIn;
    // }


    function title( str ){
        cmd(str);
        //titleQueue.push(str.toString());
    }

    function initGame(){
        var size = config.size;

        cmd('setworldspawn 0 100 0');

        //set up teams
        config.teamsAlive.forEach(function(team){
            var teamName = team.teamName;
            var players = team.players;
            cmd('scoreboard teams add ' + teamName);
            cmd('scoreboard teams option ' + teamName + ' color ' + randomColor());
            players.forEach(function(player){
                cmd('scoreboard teams join ' + teamName + ' ' + player);
            });
        });



        cmd('time set day');
        cmd('worldborder set ' + (size * 5));
        cmd('clear @a');
        cmd('spreadplayers 0 0 ' + (size - (size * 0.6)) + ' ' + (size / 2.0) + ' true @a');
        cmd('worldborder center 0 0');
        cmd('worldborder set ' + (size));

        cmd('effect @a clear');
        cmd('effect @a minecraft:instant_health 1 100');
        cmd('effect @a minecraft:saturation 1 20');
        cmd('effect @a minecraft:blindness 7 100');
        cmd('effect @a minecraft:mining_fatigue 7 100');
        cmd('effect @a minecraft:slowness 7 100');
        cmd('effect @a minecraft:jump_boost 7 128');



        // while anyone has taken damage,
        //      /spreadplayers
        //
        //{BlockEntityTag:{Patterns:[{Color:15,Pattern:"bs"},{Color:10,Pattern:"mc"}]}}
        //{AttributeModifiers:[{Operation:0,UUIDLeast:1,UUIDMost:1,Amount:5.0,AttributeName:generic.movementSpeed,Name:whee}],display:{Name:”Anvil of Wheeeee”}}
        config.teamsAlive.forEach(function(team){
            if(team.bannerPattern){
                var bannerPattern = team.bannerPattern;
                console.log('BannerPattern: ' + bannerPattern);
                cmd('give @a[team='+ team.teamName +'] minecraft:banner 1 0 {BlockEntityTag:{Patterns:['+bannerPattern+']}}');
            }
        });

        //research these a bit more:
        cmd('scoreboard objectives add Health health');
        cmd('scoreboard objectives setdisplay list Health');
        cmd('scoreboard objectives add Deaths deathCount');
        cmd('scoreboard players reset *'); // setsets objectives

        checkDeathsInterval = setInterval(function(){
            config.playersAlive.forEach(function(player){
                cmd('testfor @a[name='+player+',score_Deaths=1]');
            });
        }, 50);

        title('title @a times 0 40 0');
        title('title @a title {text: "Welcome To UCH", color:red}');
        title('title @a subtitle {text: "Good Luck!"}');

        cmd('worldborder warning distance 20');
        cmd('worldborder set 120 6000');
        cmd('worldborder get');

        //slowly worldborder in in
    }

    function createLobby(){
        titleInterval = setInterval(function(){
            if(titleQueue.length > 0){
                console.log('Doing title: '+ titleQueue[0]);
                cmd(titleQueue.shift());
            }
        }, 2000);

        var bufferSize = 300;
        var point = parseInt(config.size) + bufferSize;

        cmd('setworldspawn ' + point + ' 255 ' + point);
        cmd('worldborder center ' + point + ' ' + point);
        cmd('worldborder set 10');
        cmd('gamerule naturalRegeneration false');

    }

    function createWhiteList(){
        config.playersTemp.forEach(function(player){
            cmd('whitelist add ' + player);
        });
        cmd('whitelist list');

        updater.message('Whitelist Created');
    }

    function check( out, arrayOfStr ){
        var match = false;
        arrayOfStr = [arrayOfStr];
        arrayOfStr = [].concat.apply([], arrayOfStr);
        for (var i = 0; i < arrayOfStr.length; i++) {
            var str = arrayOfStr[i];
            if(out.indexOf(str) > -1){
                match = true;
            } else {
                match = false;
                break;
            }
        }
        return match;
    }



    function cmd( str ){
        str = str + '\n';
        mc.stdin.write(str);
        idle();
    }

    function randomColor(){
        var colors = [
            'black', 'dark_blue', 'dark_green',
            'dark_aqua', 'dark_red', 'dark_purple',
            'gold', 'gray', 'dark_gray', 'blue',
            'green', 'aqua', 'red', 'light_purple',
            'yellow', 'white'
        ];
        return colors[Math.floor(Math.random() * (colors.length - 1)) + 0];
    }

    function idle(){
        // sleep.sleep(1);
    }

    function correctConfigNames(realNames){
        for (var i = 0; i < config.teams.length; i++) {
            var team = config.teams[i];
            config.teamsAlive.push(team);
            for (var j = 0; j < team.players.length; j++) {
                var player = team.players[j];
                player = player.replace(' ','');
                for (var k = 0; k < realNames.length; k++) {
                    var name = realNames[k];
                    if(player.toLowerCase() == name.toLowerCase()){
                        config.teams[i].players[j] = name;
                    }
                }
            }
        }
        config.players = realNames;
        config.playersAlive = realNames;
        console.log('correctConfigNames:' + JSON.stringify(config.teamsAlive));

    }

    function whitelistOutput(output){
        var outlower = output.toLowerCase();
        var all = true;
        config.teams.forEach(function(team){
            team.players.forEach(function(player){
                var lowerPlayer = player.toLowerCase();
                if(outlower.indexOf(lowerPlayer) < 0){
                    all = false;
                }
            });
        });
        if(output.indexOf('and') < 0){
            all = false;
        }
        return all;
    }
};


// function Timer(callback, delay) {
//     var timerId, start, remaining = delay;

//     this.pause = function() {
//         window.clearTimeout(timerId);
//         remaining -= new Date() - start;
//     };

//     this.resume = function() {
//         start = new Date();
//         timerId = window.setTimeout(callback, remaining);
//     };

//     this.resume();
// }

// var timer = new Timer(function() {
//     alert("Done!");
// }, 1000);

// timer.pause();
// // Do some stuff...
// timer.resume();
