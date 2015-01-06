'use strict';
// app/routes.js
var User = require('../app/models/user');
// var teamQueue = require('../app/models/teamQueue')();
var matchmaking = require('./matchmaking')();

module.exports = function(app, passport, io) {

    // And now I have websockets... bitches.
    io.sockets.on('connection', function (socket) {
        socket.on('follow', function( ip ){
            // ip = '127.0.0.1';
            socket.join(ip);
        });
    });

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs', {user: req.user}); // load the index.ejs file
    });

    // Comes from mc droplet
    // Remove from activeGames
    app.post('/kill', function(req, res){
        io.to('' + req.ip).emit('endGame', {winningTeamName: req.body.winningTeamName});
        matchmaking.endMatch(req.ip);
        // teamQueue.removeActiveGame(req.ip);
        res.send('shuting down');
    });

    // Comes from mc droplet
    app.post('/game-updates', function(req, res) {
        if(req.body.type == 'teamUpdate'){
            matchmaking.teamUpdate(req.body.teams);
            io.to('' + req.ip).emit('teamUpdate', JSON.stringify(req.body.teams));
        }else{
            io.to('' + req.ip).emit('gameData', JSON.stringify(req.body.msg));
            console.log('room: ' + req.ip + ' body:' + JSON.stringify(req.body));
        }
        res.send('hello');
    });

    // Comes from User
    app.post('/active-games', isLoggedIn, function(req, res){
        var userTeam = req.user.teams[0] || undefined;
        // var activeGames = teamQueue.getActiveGames();
        var resObj = matchmaking.checkIfTeamIsActive(userTeam) || {'ip': undefined};
        return res.send(resObj);
    });

    // Comes from User
    // POST when adding yourself to the pool
    app.post('/find-game', isLoggedIn, function(req, res){
        if(req.user.teams.length != 1){
            res.send('You must have at least one team created');
        } else {
            var userTeam = req.user.teams[0];
            matchmaking.addTeamToMatchmakingPool(userTeam);
            res.send('Added you to the team queue');
        }
    });

    // Comes from MC_DROPLET
    // Should be called '/get-config'
    app.post('/alive', function(req, res){
            //NEED TO FIX THIS AT SOME POINT
            var resMsg = matchmaking.getGameConfig(req.ip);
            res.send(resMsg);
    });

    app.post('/create-team', isLoggedIn, function(req, res){
        var players = [req.body.players];
        players = [].concat.apply([], players);
        console.log(players);
        if( players.indexOf(req.user.minecraft_name) < 0||
            players.length != 2 ||
            req.body.teamName.length === 0){
            res.render('profile/profile.ejs', { user: req.user, message: 'There was an error creating this team. Hint: You must be on your team.' });
        } else {
            if( req.body.teamName.indexOf(' ') > -1 ){
                res.render('profile/profile.ejs', { user: req.user, message: 'Team Name must not contain spaces.' });
                return;
            }
            console.log(req.body);
            User.findOne({'username': req.user.username}, function(err, user){
                if(user.teams.length > 0){
                    res.redirect('/profile');
                }
                user.teams.push({
                    'teamName': req.body.teamName,
                    'players': players,
                    'bannerPattern': req.body.banner
                });
                user.save(function(err) {
                    if (err)
                        throw err;
                    res.redirect('/profile');
                });
            });
        }
    });

    app.post('/delete-team', isLoggedIn, function(req, res){
        User.findOne({'username': req.user.username}, function(err, user){
            user.teams = [];
            user.save(function(err){
                if(err)
                    throw err;
                res.redirect('/profile');
            });
        });
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {
        if(req.isAuthenticated()){
            res.redirect('/profile');
            return;
        }
        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage'), user: req.user });
    });

    // process the login form
    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage'), user: req.user });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        var alreadyPlaying = matchmaking.checkIfTeamIsActive(req.user.teams[0]);
        if(alreadyPlaying){
            res.render('profile/profile.ejs', {user : req.user, message: 'You already have an active game. You must wait till that one is over to become eligible again. This should be fixed in beta.'});
        }else{
            res.render('profile/profile.ejs', {user : req.user});
        }

    });

    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}