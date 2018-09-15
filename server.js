require('dotenv').config()

// Libs
const cors = require('cors');
const request = require('request');
const cookieParser = require('cookie-parser');

// Setup
const express = require('express')
const app = express()
const app_controller = require('./api/controller/app_controller');
const auth_controller = require('./api/controller/auth_controller');
const port = process.env.PORT || 5000;
app.use(express.static(__dirname + '/public')).use(cors()).use(cookieParser());

// Routes
app.get('/api/login', auth_controller.login);

app.get('/api/callback', auth_controller.callback);

app.get('/api/refresh_token', auth_controller.refreshToken);

app.get('/api/hello', app_controller.helloWorld)

app.get('/', app_controller.helloWorld)

app.listen(port, () => console.log(`Listening on port ${port}`));
