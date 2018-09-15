require('dotenv').config();

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const app_controller = require('./api/controller/app_controller');

app.get('/api/hello', app_controller.helloWorld);

app.listen(port, () => console.log(`Listening on port ${port}`));
