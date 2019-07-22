const axios = require('axios');
const client_id = process.env.CLIENT_ID; // Your client id
const client_secret = process.env.CLIENT_SECRET; // Your secret

const user_manager = require('./user_manager');

// Datastore Setup
const projectId = process.env.GCP_PROJECT_ID;
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: projectId,
});

// log in related API calls

module.exports = {
  fetchAccessToken: async (uri, code) => {
    const options = {
      url: 'https://accounts.spotify.com/api/token',
      method: 'post',
      params: {
        code: code,
        redirect_uri: uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
    };
    const { data } = await axios(options);
    return data;
  },

  registerUser: async (access_token) => {
    const spotifyUserData = await user_manager.fetchUserData(access_token);
    const kind = 'User';
    const user_key = datastore.key([kind, spotifyUserData.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const museUserData = await datastore.runQuery(query);

    if (museUserData[0].length === 0 && museUserData[1].moreResults === 'NO_MORE_RESULTS') {
      console.log('User does not exist in datastore, adding to datastore');
      var newUserEntity = {
        key: user_key,
        data: {
          country: spotifyUserData.country,
        },
      };
      await datastore.save(newUserEntity);
      console.log(`Saved ${newUserEntity.key.name}: ${newUserEntity.data.country}`);
    } else {
      console.log("User exists in datastore");
    }
  }
}
