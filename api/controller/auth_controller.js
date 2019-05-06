const querystring = require('querystring');
const axios = require('axios');
const spotify_utils = require('../utils/spotify_utils');
const auth_manager = require('../managers/auth_manager');
const port = process.env.PORT || 5000;
const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const local_redirect_uri = `http://localhost:${port}/api/callback`; // Local redirect uri
const redirect_uri = process.env.REDIRECT_URI;

const stateKey = 'spotify_auth_state';

// Available functions
module.exports = {
  login: (req, res) => {
    const uri = process.env.NODE_ENV ? redirect_uri : local_redirect_uri;
    const state = spotify_utils.generateRandomString(16);
    res.cookie(stateKey, state);

    const scope = 'user-read-private user-read-email user-top-read playlist-read-private playlist-modify-public playlist-modify-private';
    res.redirect('https://accounts.spotify.com/authorize?' +
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: uri,
        state: state
      })
    );
  },

  callback: async (req, res) => {
    const uri = process.env.NODE_ENV ? redirect_uri : local_redirect_uri;
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
      res.status(401).json({ message: 'Error: You are not authorized, please login again.' });
    } else {
      res.clearCookie(stateKey);
      
      try {
        const { access_token, refresh_token } = await auth_manager.fetchAccessToken(uri, code);
        console.log(access_token);
        auth_manager.registerUser(access_token);
        res.redirect('https://auth.expo.io/@j593chen/Muse#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } catch(error) {
        console.log(error);
        res.redirect('https://auth.expo.io/@j593chen/Muse#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    }
  },

  refreshToken: async (req, res) => {
    // requesting access token from refresh token
    const refresh_token = req.query.refresh_token;
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      method: 'post',
      headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
      params: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
    };

    try {
      const { data } = await axios(authOptions);
      res.json({
        access_token: data.access_token
      });
    } catch(error) {
      console.log('Failed to get new access token')
    }
  }
}
