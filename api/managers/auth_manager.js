const AXIOS = require('axios');
const CLIENT_ID = process.env.CLIENT_ID; // Your client id
const CLIENT_SECRET = process.env.CLIENT_SECRET; // Your secret
const USER_MANAGER = require('./user_manager');

// Datastore Setup
const project_id = process.env.GCP_PROJECT_ID;
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: project_id,
});

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
        'Authorization': 'Basic ' + (new Buffer(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      },
    };
    const { data } = await AXIOS(options);
    return data;
  },

  registerUser: async (access_token) => {
    const spotify_user_data = await USER_MANAGER.fetchUserData(access_token);
    if (spotify_user_data.error) throw spotify_user_data.error;

    const kind = 'User';
    const user_key = datastore.key([kind, spotify_user_data.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const muse_user_data = await datastore.runQuery(query);

    if (muse_user_data[0].length === 0 && muse_user_data[1]["moreResults"] === 'NO_MORE_RESULTS') {
      console.log('User does not exist in datastore, adding to datastore');
      var new_user_entity = {
        key: user_key,
        data: {
          country: spotify_user_data.country,
          is_new_user: true,
          last_synced_with_spotify: 0, // so that first personalized session will always pass timestamp check to sync
          spotify_fav_artists: {},
          spotify_fav_genres: {},
          fav_artists: {},
          fav_genres: {},
        },
      };
      await datastore.save(new_user_entity);
      console.log(`Saved ${new_user_entity.key.name}: ${new_user_entity.data.country}`);
    } else {
      console.log("User exists in datastore");
    }
  }
}
