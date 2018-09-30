require('dotenv').config()

// Libs
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const bodyParser = require('body-parser');

// Setup
const express = require('express')
const app = express()
const app_controller = require('./api/controller/app_controller');
const auth_controller = require('./api/controller/auth_controller');
const user_controller = require('./api/controller/user_controller');
const spotify_controller = require('./api/controller/spotify_controller');
const port = process.env.PORT || 5000;

app.use(bodyParser.json()); // for parsing application/json
app.use(cors());
app.use(cookieParser());

// Routes
app.get('/api/login', auth_controller.login);

app.get('/api/callback', auth_controller.callback);

app.get('/api/refresh_token', auth_controller.refreshToken);

app.post('/api/fetch_user', user_controller.getInfo);

app.get('/api/hello', app_controller.helloWorld);

app.get('/api/redis_test', app_controller.redisTest);

app.get('/api/all_genres', spotify_controller.allGenres);

// Serve any static files
app.use(express.static(path.join(__dirname, 'client/build')));
// Handle React routing, return all requests to React app
app.get('*', function (req, res) {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(port, () => console.log(`Listening on port ${port}`));
