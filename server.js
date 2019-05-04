require('dotenv').config()

// Libs
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Setup
const express = require('express')
const app = express()
const app_controller = require('./api/controller/app_controller');
const auth_controller = require('./api/controller/auth_controller');
const spotify_controller = require('./api/controller/spotify_controller');
const port = process.env.PORT || 5000;

app.use(bodyParser.json()); // for parsing application/json
app.use(cors());
app.use(cookieParser());

// Routes
app.get('/api/login', auth_controller.login);

app.get('/api/callback', auth_controller.callback);

app.get('/api/refresh_token', auth_controller.refreshToken);

app.get('/api/hello', app_controller.helloWorld);

app.post('/api/get_songs', spotify_controller.recommendedSongSelection)

app.listen(port, () => console.log(`Listening on port ${port}`));
