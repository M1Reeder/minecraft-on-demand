'use strict';
var socket = io();

var waiting = false;
$(document).ready(function(){
    $('#join-game-btn').click(function(e){
        $('#join-game-btn').attr('disabled', 'disabled');
        $('#delete-team-btn').attr('disabled', 'disabled');
        if(waiting){
           return;
        }
        waiting = true;
        var getIp;
        $('span#append').after('<br><div class="waiting-div"><i class="fa fa-spinner fa-spin" style="font-size:1.5em;"></i> Searching for opponents... <p style="padding-right: 5px; font-size:.7em;"> - This my take several minutes - </p></div>');
        $.post('/find-game', function(d){
            getIp = setInterval(function(){
                $.post('/active-games', function(data){
                    if(data.ip !== undefined){
                        clearInterval(getIp);
                        $('.waiting-div').remove();
                        $('#game-created').prepend('<div class="panel callout text-center"><h3>Game Created (IP: <i>' + data.ip + '</i>)</h3></div>');
                        $('#game-created').css('display', '');
                        socket.emit('follow', data.ip);
                        socket.on('teamUpdate', function(teams){
                            renderTeams(JSON.parse(teams));
                            console.log(teams);
                        });
                        socket.on('gameData', function(gameData){
                            $('#game-data').prepend('<p>' + gameData + '</p>');
                        });
                        socket.on('endGame', function(winningTeamName){
                            $('#game-created').before('<h2> Team ' + winningTeamName.winningTeamName + ' Won!</h2><a href="/profile" class="button success">Play again?</a>');
                            $('#game-created').css('display', 'none');
                        });
                    }
                });
            }, 5000);
        });
    });
});

function renderTeams(teams){
    $('.render-teams').empty();
    for (var i = 0; i < teams.length; i++) {
        var team = teams[i];
        var teamContainer = '<div class="panel"><h3>'+team.teamName+'</h3><p>'+team.players+'</p></div>';
        $('.render-teams').append('<li>' + teamContainer  + '</li>');
    }
}
