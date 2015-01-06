'use strict';
$(document).ready(function(){

    $('.add-team-btn').on('click',function(e){
        var newTeam = ''+
        '<div class="teamHolder"> ' +
            '<input class="team-name" type="text" placeholder="teamName">' +
            '<div class="margin-left player-holder"> ' +
                '<input class="player" type="text" placeholder="playerName">' +
                '<button class="button round tiny add-player-btn ">+ Player</button>' +
            '</div>' +
        '</div>'+
        '<hr>';
        $(this).before(newTeam);
    });
    $('body').on('click', 'button.add-player-btn',function(e){
        $(this).before('<input class="player" type="text" placeholder="playerName">');
    });
    $('.create-btn').click(function(){
        var teams = [];
        $('.teamHolder').each(function(){
            var context = $(this);
            var team = {};
            var teamName = context.children('.team-name').val();
            team.teamName = teamName;
            context.children('.player-holder').each(function(){
                var context = $(this);
                team.players = [];
                context.children('.player').each(function(){
                    var name = $(this).val();
                    team.players.push(name);
                });
            });
            teams.push(team);
        });
        console.log(teams);

        var size = 1000;
        var game = {
            'serverUrl': 'https://s3.amazonaws.com/Minecraft.Download/versions/14w32a/minecraft_server.14w32a.jar',
            'worldUrl': 'local',
            'size': size,
            'teams': teams,
            'difficulty': 1
        };


        $.ajax({
            type: 'POST',
            url: '/create',
            data: game
        }).done(function( msg ) {
            alert( 'Data Saved: ' + msg );
        });
    });
});