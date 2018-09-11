require('dotenv').config()

const express = require('express')
const app = express()
const app_controller = require('./api/controller/app_controller');

app.get('/', app_controller.helloworld)

app.listen(3000, () => console.log('Example app listening on port 3000!'))
