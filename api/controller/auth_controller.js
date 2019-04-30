const querystring = require('querystring');
const request = require('request');

const port = process.env.PORT || 5000;
const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret
const local_redirect_uri = `http://localhost:${port}/api/callback`; // Local redirect uri
const redirect_uri = process.env.REDIRECT_URI;

const sendAsJSON = (res, error, response, body) => {
  if (!error && response.statusCode === 200) {
    res.json(body);
  } else {
    res.status(response.statusCode).json(error);
  }
}

const generateRandomString = length => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

// Available functions
module.exports = {
  login: (req, res) => {
    console.log('HERE');
    uri = process.env.NODE_ENV ? redirect_uri : local_redirect_uri;
    const state = generateRandomString(16);
    res.cookie(stateKey, state);

    const scope = 'user-read-private user-read-email';
    console.log('REDIRECTING..');
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

  callback: (req, res) => {
    // your application requests refresh and access tokens
    // after checking the state parameter
    console.log('CALLBACK');
    uri = process.env.NODE_ENV ? redirect_uri : local_redirect_uri;
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;

    if (state === null || state !== storedState) {
      res.status(401).json({ message: 'Error: You are not authorized, please login again.' });
    } else {
      res.clearCookie(stateKey);
      const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
          code: code,
          redirect_uri: uri,
          grant_type: 'authorization_code'
        },
        headers: {
          'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
      };

      request.post(authOptions, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const access_token = body.access_token;
          refresh_token = body.refresh_token;

          res.json({ access_token: access_token, refresh_token: refresh_token });
        } else {
          res.json({error: 'invalid_token'});
        }
      });
    }
  },

  refreshToken: (req, res) => {
    // requesting access token from refresh token
    const refresh_token = req.query.refresh_token;
    const authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
      form: {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
      },
      json: true
    };

    request.post(authOptions, (error, response, body) => sendAsJSON(res, error, response, body));
  }
}
