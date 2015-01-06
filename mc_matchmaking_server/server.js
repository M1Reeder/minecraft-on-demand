
/**
 * Module dependencies.
 */
'use strict';
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var ejsLocals = require('ejs-locals');
var path = require('path');

var configDB = require('./config/database.js');

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser.urlencoded({
    extended:true
})); // get information from html forms
app.use(bodyParser.json());
app.engine('ejs', ejsLocals);
app.set('view engine', 'ejs'); // set up ejs for templating
// required for passport
app.use(session({
    secret: 'secretssecretsarenofun',
    saveUninitialized: true,
    resave: true
})); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash()); // use connect-flash for flash messages stored in session

// routes ======================================================================
require('./app/routes.js')(app, passport, io); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
http.listen(3000, function(){
  console.log('listening on *:3000');
});
console.log('The magic happens on port ' + port);




// 	app = express(),
// 	http = require('http'),
// 	path = require('path'),
//     ejsLocals = require('ejs-locals'),
// 	passport = require('passport'),
// 	LocalStrategy = require('passport-local').Strategy,

// 	db = require('./model/db')(),
// 	auth = require('./model/auth')(passport, LocalStrategy, db),

// 	userController = require('./controller/UserController')(db),
//     gameController = require('./controller/GameController')(db);

// var session = require('express-session');
// var RedisStore = require('connect-redis')(session);

// // all environments
// app.set('port', process.env.PORT || 3000);
// app.set('views', __dirname + '/views');
// app.engine('ejs', ejsLocals);
// app.set('view engine', 'ejs');
// app.use(express.favicon());
// app.use(express.logger('dev'));
// app.use(express.bodyParser());
// app.use(express.cookieParser());
// app.use(session({
//     store: new RedisStore({
//         host: 'localhost',
//         port: 6379,
//         db: 2,
//         pass: 'RedisPass'
//     }),
//     secret: 'some secret',
//     saveUninitialized: true,
//     resave: true
// }));
// app.use(express.methodOverride());
// app.use(passport.initialize());
// app.use(passport.session());
// app.use(app.router);
// app.use(express.static(path.join(__dirname, 'public')));

// // development only
// if ('development' == app.get('env')) {
// 	app.use(express.errorHandler());
// }
// app.get('/',function(req, res){
//     res.render('index');
// });
// app.get('/create-account', function(req, res){
//     res.render('create-account');
// });
// app.post('/create-account', userController.createAccount);
// app.get('/login', function(req, res){
//     res.render('login');
// });
// app.post('/login', auth.authenticate('/', '/profile'), userController.login);

// app.get('/logout', userController.logout);

// app.get('/profile', auth.ensureAuthenticated, function(req, res){
//     res.render('profile');
// });


// app.get('/bug', auth.ensureAuthenticated, function(req, res){

// });


// app.get('/uhc', function(req, res){
//     res.render('uhc-index');
// });

// app.post('/alive', gameController.alive);

// app.post('/log', gameController.log);

// app.post('/active-games', function(req, res){
//     console.log('IP: ' + req.ip + '\nBody: ' + JSON.stringify(req.body));
//     res.send('You did it');
// });

// app.get('/active-games', function(req, res){
//     gameController.activeGames(req, res);
// });

// app.post('/create', function(req, res){
//     console.log(req.body);
//     var options = {};
//     options.config = req.body;

//     gameController.create(options);

//     res.writeHead(200, {'Content-Type': 'text/html'});
//     res.end('worked');
// });

// // Bootstrap routes
// // require('./config/routes')(app, passport)


// http.createServer(app).listen(app.get('port'), function(){
// 	console.log('Express server listening on port ' + app.get('port'));
// });
