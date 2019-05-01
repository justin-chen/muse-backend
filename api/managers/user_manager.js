const axios = require('axios');

// spotify user related API calls

module.exports = {
  fetchUserData: async access_token => {
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: { Authorization: `Bearer ${access_token}` },
    };
    const { data } = await axios(options);
    return data;
  },
}
