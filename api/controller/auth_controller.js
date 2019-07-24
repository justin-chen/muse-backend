const QUERYSTRING = require('querystring');
const AXIOS = require('axios');
const SPOTIFY_UTILS = require('../utils/spotify_utils');
const AUTH_MANAGER = require('../managers/auth_manager');
const PORT = process.env.PORT || 5000;
const CLIENT_ID = process.env.CLIENT_ID; // Your client id
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Your secret
const LOCAL_REDIRECT_URI = `http://localhost:${PORT}/api/callback`; // Local redirect uri
const REDIRECT_URI = process.env.REDIRECT_URI;
const STATE_KEY = 'spotify_auth_state';

// Available functions
module.exports = {
  login: (req, res) => {
    const uri = process.env.NODE_ENV ? REDIRECT_URI : LOCAL_REDIRECT_URI;
    const state = SPOTIFY_UTILS.generateRandomString(16);
    res.cookie(STATE_KEY, state);

    const scope = 'user-read-private user-read-email user-top-read playlist-read-private playlist-modify-private playlist-modify-public';
    res.redirect('https://accounts.spotify.com/authorize?' +
      QUERYSTRING.stringify({
        response_type: 'code',
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: uri,
        state: state
      })
    );
  },

  callback: async (req, res) => {
    const uri = process.env.NODE_ENV ? REDIRECT_URI : LOCAL_REDIRECT_URI;
    const code = req.query.code || null;
    const state = req.query.state || null;
    const stored_state = req.cookies ? req.cookies[STATE_KEY] : null;

    if (state === null || state !== stored_state) {
      res.status(401).json({ message: 'Error: You are not authorized, please login again.' });
    } else {
      res.clearCookie(STATE_KEY);

      try {
        const { access_token, refresh_token } = await AUTH_MANAGER.fetchAccessToken(uri, code);
        console.log(access_token); // delete log statement eventually when no longer needed for development testing
        AUTH_MANAGER.registerUser(access_token);
        res.redirect('https://auth.expo.io/@j593chen/Muse#' +
          QUERYSTRING.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } catch(error) {
        console.log(error);
        res.redirect('https://auth.expo.io/@j593chen/Muse#' +
          QUERYSTRING.stringify({
            error: 'invalid_token'
          }));
      }
    }
  },

  refreshToken: async (req, res) => {
    // requesting access token from refresh token
    const refresh_token = req.query.refresh_token;
    const auth_options = {
      url: 'https://accounts.spotify.com/api/token',
      method: 'post',
      headers: { 'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')) },
      params: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
    };

    try {
      const { data } = await AXIOS(auth_options);
      res.json({
        access_token: data.access_token
      });
    } catch(error) {
      console.log('Failed to get new access token')
    }
  }
}
