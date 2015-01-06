'use strict';
process.chdir(__dirname);

var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var fs = require('fs');

// Set up alive.js dependencies
exec('npm install', init);
function init(err, stdout, stderr){
    var needle = require('needle');
    var async = require('async');
    var alive = require('commander');

    // Set up command line interface
    alive
        .version('0.0.0')
        .option('-n, --node [cmd]', 'Specify node.js command.', 'nodejs')
        .option('-t, --test','Use develop brach of mc_sever branch')
        .parse(process.argv);

    var aliveConfig;
    var gameConfig;
    async.series([
        function(callback){
            exec(clone('remote_configs'), function(err, stdout, stderr){
                aliveConfig = fs.readFileSync('remote_configs/alive_config.json', 'utf8');
                aliveConfig = JSON.parse(aliveConfig);
                aliveConfig.serverBaseUrl = 'http://' + aliveConfig.matchmakingUrl;
                callback(null, aliveConfig);
            });
        },
        function(callback){
            // Let mother server know we are up and running
            needle.post( aliveConfig.serverBaseUrl + '/alive', {msg: 'alive'}, function(err, resp, body){
                if( err ){ console.error('needle.post: ' + err); }
                gameConfig = getGameConfig( body );
                gameConfig = JSON.parse(gameConfig);
                gameConfig.masterUrl = aliveConfig.serverBaseUrl;
                gameConfig = JSON.stringify(gameConfig);
                callback(null, gameConfig);
            });
        },
        function(callback){
            // Get droplet server manager mc_server.js
            var mc_dropletUrl = clone('mc_droplet_server');
            if(alive.test){
                mc_dropletUrl = mc_dropletUrl + ' -b develop --single-branch';
            }
            exec(mc_dropletUrl, function(err, stdout, stderr){
                fs.writeFileSync('mc_droplet_server/gameConfig.json', gameConfig, 'utf8');
                callback(null);
            });
        },
        function(callback){
                // process.chdir('mc_droplet_server');
                // Start game manager and pipe stdin and stdout
                process.chdir('mc_droplet_server');
                var mc_server = spawn(alive.node, [ 'mc_server.js']);
                mc_server.stdin.setEncoding = 'utf-8';
                mc_server.stderr.setEncoding = 'utf-8';
                mc_server.stdout.setEncoding = 'utf-8';
                mc_server.stdout.pipe(process.stdout);
                mc_server.stderr.pipe(process.stderr);
                callback(null);
        }
    ],function(err, result){

    });
}



function log( logLevel ){
    if( logLevel > 0 ){
        var stdoutLog = fs.createWriteStream('./alive.stdout.log', {flags: 'a'});
        var stderrLog = fs.createWriteStream('./alive.stderr.log', {flags: 'a'});
        process.stdout.pipe(stdoutLog);
        process.stderr.pipe(stderrLog);
    }
}

function clone( repo ){
    return 'git clone https://m_reeder:*@bitbucket.org/m_reeder/'+repo+'.git';
}

function getGameConfig( body ){
    var config;
    try {
        config = JSON.parse(body);
        return JSON.stringify(config);
    }catch(err){
        console.error('Using test configutation');
        config = fs.readFileSync('test_config.json','utf8');
        return config;
    }
}
