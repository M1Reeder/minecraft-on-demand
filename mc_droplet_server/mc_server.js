#!/usr/local/bin/node

/*

*/

'use strict';
var fs = require('fs');
var gameConfigFile = __dirname + '/gameConfig.json';
var exec = require('child_process').exec;
var mcServerDir = __dirname + '/server';
var async;
var gameManager;
var needle;

exec('npm install', function(err, stdout, stderr){
    // if server exists skip to starting mc server
    gameManager = require('./GameManager');
    needle = require('needle');
    async = require('async');

    fs.readFile(gameConfigFile, 'utf8', function (err, config) {
        if (err) { console.log('Error: ' + err); return; }
        config = JSON.parse(config);
        console.log(config);
        if(!mkdir(mcServerDir)){
            config.serverUrl = 'test';
        }

        if(config.worldUrl == 'create'){
            mkdir(mcServerDir + '/craftbukkit');
            mkdir(mcServerDir + '/craftbukkit/plugins');
        }

        var tasks = createServerTasks( config );
        async.series( tasks, function(err, result){
            console.log('End of tasks');
            console.log(result);
        });

    });
});

function createServerTasks( config ){
    var serverTasks = [];
    if( config.serverUrl == 'test'){
        // var result = sh.exec('rm -r ' + mcServerDir + '/world/playerdata/');
        // console.log('rm result: ' + JSON.stringify(result));
    }else{
        serverTasks.push(initDownload( config ));
        serverTasks.push(writeServerFiles( config ));
    }
    serverTasks.push(startServer( config ));
    // serverTasks.push(createWorld());
    serverTasks.push(function(callback){console.log('ready for next call'); callback(null);});
    return serverTasks;
}

function startServer( config ){
    return function( callback ){
        config.mcServerDir = mcServerDir;
        gameManager(config, callback);
    };
}

function writeServerFiles( config ){
    return function( callback ){
        var whitelist = [];
        config.teams.forEach(function(team){
            team.players.forEach(function(player){
                whitelist.push(player);
            });
        });
        //fs.writeFileSync(mcServerDir + '/whitelist.json', JSON.stringify(whitelist));

        var maxPlayers = whitelist.length;

        fs.writeFileSync(mcServerDir + '/server.properties', '#Minecraft server properties\n' +
        '#Wed Jul 30 08:48:35 EDT 2014\n' +
        'generator-settings=\n' +
        'op-permission-level=1\n' +
        'allow-nether=false\n' +
        'level-name=world\n' +
        'enable-query=false\n' +
        'announce-player-achievements=true\n' +
        'allow-flight=false\n' +
        'server-port=25565\n' +
        'max-world-size=' + (config.size * 5) + '\n' +
        'level-type=DEFAULT\n' +
        'enable-rcon=false\n' +
        'force-gamemode=true\n' +
        'level-seed=\n' +
        'server-ip=\n' +
        'network-compression-threshold=256\n' +
        'max-build-height=256\n' +
        'max-connections=1\n' +
        'spawn-npcs=true\n' +
        'white-list=true\n' +
        'spawn-animals=true\n' +
        'texture-pack=\n' +
        'snooper-enabled=false\n' +
        'resource-pack=\n' +
        'hardcore=false\n' +
        'online-mode=true\n' +
        'enable-command-block=false\n' +
        'pvp=true\n' +
        'difficulty=' + config.difficulty + '\n' +
        'gamemode=0\n' +
        'player-idle-timeout=0\n' +
        'max-players=' + maxPlayers + '\n' +
        'spawn-monsters=true\n' +
        'generate-structures=true\n' +
        'view-distance=8\n' +
        'spawn-protection=0\n' +
        'motd=UHC', 'utf8');
        callback(null);
    };
}

function createWorld(){
    return function(callback){
        console.log('create world');
        callback();
    };
}

function initDownload( config ){
    return function(callback){
            var urlCmds = [];
            urlCmds.push(config.serverUrl + ' -P ' + mcServerDir);
            urlCmds.push(createWorldUrlArray(config.worldUrl));
            urlCmds = [].concat.apply([], urlCmds);
            // Download server and create world
            createDownloadTasks(urlCmds, function(err, result){
                if( err ){ return err; }
                async.parallel(result, function(err){
                    if( err ){ callback(err); }
                    //rename files?
                    renameJars(mcServerDir, 'minecraft.jar');
                    if(config.worldUrl == 'create'){
                        renameJars(mcServerDir + '/craftbukkit', 'craftbukkit.jar');
                    }
                    // write eula agreement
                    fs.writeFileSync(mcServerDir + '/eula.txt',
                    '#By changing the setting below to TRUE you are' +
                    'indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\n' +
                    '#Wed Jul 30 20:55:04 EDT 2014\n' +
                    'eula=TRUE');
                    needle.post(config.masterUrl + '/active-games', {'msg':'Server Downloaded'});
                    console.log('Everything downloaded');
                    callback(null, result);
                });
            });
    };
}

function renameJars(path, name){
    var files = fs.readdirSync(path);
    files.forEach(function(file){
        if( file.indexOf('.jar') > -1 ){
            var filePath = path + '/' + file;
            fs.renameSync(filePath, path + '/' + name);
        }
    });
}

function createWorldUrlArray( worldConfig ){
    var craftbukkitUrl = 'https://dl.bukkit.org/downloads/craftbukkit/get/02631_1.7.9-R0.2/craftbukkit-beta.jar';
    var worldBorderUrl = 'http://dev.bukkit.org/media/files/793/351/WorldBorder.jar';

    var worldDLCmds = [];

    // Use local world file
    if( worldConfig == 'local'){ return worldDLCmds; }

    if( worldConfig == 'create'){
        var craftbukkitFolderPath = mcServerDir + '/craftbukkit';
        worldDLCmds.push(craftbukkitUrl + ' -P ' + craftbukkitFolderPath);
        worldDLCmds.push(worldBorderUrl + ' -P ' + craftbukkitFolderPath + '/plugins');
    } else {
        worldDLCmds.push(worldConfig + ' -P ' + mcServerDir);
    }
    return worldDLCmds;
}

function createDownloadTasks( urls, callback ){
    async.map(urls, wrapUrl, function(err, result){
        if( err ){ callback(err); }
        callback(null, result);
    });
}

function wrapUrl( url, cb ){
    cb( null, function(callback){
        console.log('Downloading ' + url);
        download(url, callback);
    });
}

function download( url, callback ){
    var cmd = 'wget ' + url;
    exec( cmd, function (error, stdout, stderr) {
        if (error !== null) {
          console.log('exec error: ' + error);
          callback(error);
        }else{
            callback(null);
        }
    });
}

function mkdir(path){
    try {
        fs.mkdirSync(path);
    }catch(e){
        console.log(path + ' already esists');
        return false;
    }
    return true;
}

// var program = require('commander');
// program
//   .version('0.0.1')
//   .option('-s, --server [url]', 'Download URL for server')
//   .option('-w, --world [url]','Download URL for world. Use "local" to generate new world.')
//   .option('-s, --size [size]', 'How large the world border should be.')
//   .option('-t, --teams [teams]', 'Array of team objects')
//   .parse(process.argv);

// console.log(program.teams);

// console.log('You started up with:');
// if( program.server ) console.log('Server URL: ' + program.server);
// if( program.world ) console.log('Server World: ' + program.world);
// if( program.size ) console.log('Server size: ' + program.size);
// console.log('  - %s cheese', program.size);
