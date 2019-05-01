const request = require('request');

const profileFetchOptions = accessToken => {
  const option = {
    url: 'https://api.spotify.com/v1/me',
    headers: { Authorization: `Bearer ${accessToken}` },
    json: true
  };
  return option;
};

module.exports = {
  getInfo: (req, res) => {
    console.log(profileFetchOptions(req.body.access_token));
    request(profileFetchOptions(req.body.access_token), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        res.json(body);
      } else {
        res.status(response.statusCode).json(body);
      }
    });
  },

  getInfoInternal: (access_token, callback) => {
    request(profileFetchOptions(access_token), (error, response, body) => {
      if (!error && response.statusCode === 200) {
        return callback(body);
      } else {
        console.log("Failed to get user info");
        return null;
      }
    });
  }
}
