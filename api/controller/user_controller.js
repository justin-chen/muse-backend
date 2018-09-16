var app = require('express')();
var bodyParser = require('body-parser');
var multer = require('multer'); // v1.0.5
var upload = multer(); // for parsing multipart/form-data

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

const request = require('request');
// var bodyParser = require('body-parser');

var profileFetchOptions = (accessToken) => {
    var option = { 
      url: 'https://api.spotify.com/v1/me',
      headers: { Authorization: "Bearer BQDE-1JKfOxL68hXq-nWx4-uELEnyKpWJV5J1CNpYPiP3Urf-gq5ltH2cT_Spvcbqnq6LUMQN8o0cGJ5bs1_GVIZQ-dCqtdo_xsws5khPPKm1UXNhOdaBdXvrjwJ1yMJ888Cb1FkQFB9JIOp-a3sQ_NmUIT7KVuCVv8" },
      json: true
    };
    return option;
};

module.exports = {
  getInfo: (req, res) => {
    console.log(profileFetchOptions(req.body.access_token));
    request.get(profileFetchOptions(req.body.access_token), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.json(body);
      } else {
        res.status(response.statusCode).json(body);
      }
    });
  }
}
