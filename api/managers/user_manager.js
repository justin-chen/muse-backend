// Manager for spotify user related API calls and user data modifications

// Datastore Setup
const project_id = process.env.GCP_PROJECT_ID;
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: project_id,
});

const SPOTIFY_UTILS = require('../utils/spotify_utils');
const AXIOS = require('axios');
const MAX_SIZE = 50;

normalizeIncrementingValues = (data) => {
  // Normalize artist global_counter, last_access, and weight values
  let lowest_lru_time = data.global_counter // must be at most global_counter
  let lowest_weight = Number.MAX_SAFE_INTEGER; // could be some big int
  for (var key in data.items) {   // find lowest lru time
    if (data.items[key].last_accessed < lowest_lru_time) {
      lowest_lru_time = data.items[key].last_accessed;
    }
    if (data.items[key].weight < lowest_weight) {
      lowest_weight = data.items[key].weight
    }
  }

  // subtract global_counter and all last_accessed by lowest lru time
  data.global_counter -= lowest_lru_time;
  for (var key in data.items) {
    data.items[key].last_accessed -= lowest_lru_time;
  }

  // divide all weights by lowest weight if lowest weight is > 0
  if (lowest_weight > 1) { // dividing by 1 would be no-op
    for (var key in data.items) {
      data.items[key].weight /= lowest_weight;
    }
  }

  return data;
}

updateArtistAndGenrePreferences = async (access_token, artist_ids, fav_artists, fav_genres) => {
  for (let i = 0; i < artist_ids.length; i++) {
    id = artist_ids[i];

    // make request to get the genres for this artist
    const options = {
      url: `https://api.spotify.com/v1/artists/${id}`,
      headers: { Authorization: `Bearer ${access_token}` },
    };
    const artist_resp = await AXIOS(options);

    var related_genres = artist_resp.data.genres;
    related_genres.forEach(genre => {
      if (!SPOTIFY_UTILS.isValidGenreSeed(genre)) {
        return;
      }

      // only if genre is one of the valid genre seeds
      fav_genres.global_counter += 1;
      if (fav_genres.items[genre] != null) {  // If genre exists already, inc weight
        fav_genres.items[genre].weight += 1;
        fav_genres.items[genre].last_accessed = fav_genres.global_counter;
      } else { // if genre does not exist and need insertion
        if (Object.keys(fav_genres.items).length >= MAX_SIZE) {
          // evict last updated entry if not enough space
          var lru_time = fav_genres.global_counter;
          var lru_key;
          for (var genre_key in fav_genres[items]) {
            if (fav_genres.items[genre_key].last_accessed < lru_time) {
              lru_time = fav_genres.items[genre_key].last_accessed;
              lru_key = genre_key;
            }
          }
          delete fav_genres.items[genre_key];
        }

        // Should always have enough space here
        fav_genres.items[genre] = { weight: 1, last_accessed: fav_genres.global_counter };
      }
    });

    fav_artists.global_counter += 1;
    if (fav_artists.items[id] != null) { // If artist exists already, inc weight
      fav_artists.items[id].weight += 1;
      fav_artists.items[id].last_accessed = fav_artists.global_counter;
    } else { // if artist does not exist and need insertion
      if (Object.keys(fav_artists.items).length >= MAX_SIZE) {
        // evict last updated entry if not enough space
        var lru_time = fav_artists.global_counter;
        var lru_key;
        for (var artist_id_key in fav_artists.items) {
          if (fav_artists.items[artist_id_key].last_accessed < lru_time) {
            lru_time = fav_artists.items[artist_id_key].last_accessed;
            lru_key = artist_id_key;
          }
        }
        delete fav_artists.items[artist_id_key];
        // TODO: Reset last_accessed values and global_counter by subtracting all by the lowest last_accessed value
      }

      // Should always have enough space here
      fav_artists.items[id] = { weight: 1, last_accessed: fav_artists.global_counter };
    }
  };

  // Normalize incrementing values to reduce the chance of overflow:
  fav_artists = normalizeIncrementingValues(fav_artists);
  fav_genres = normalizeIncrementingValues(fav_genres);

  return { artist_pref: fav_artists, genres_pref: fav_genres };
}

module.exports = {
  fetchUserData: async access_token => {
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: { Authorization: `Bearer ${access_token}` },
    };
    const { data } = await AXIOS(options);

    return data;
  },

  getUserSeeds: async (access_token) => {
    const spotify_user_data = await module.exports.fetchUserData(access_token);
    const kind = 'User';
    const user_key = datastore.key([kind, spotify_user_data.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const query_resp = await datastore.runQuery(query);

    let muse_user_data = query_resp[0][0];
    return { fav_artists: muse_user_data.fav_artists, fav_genres: muse_user_data.fav_genres };
  },

  verifyUserSeeds: async (access_token) => {
    let user_seeds = await module.exports.getUserSeeds(access_token);

    // verify user has enough artists for seeding
    if (user_seeds.fav_artists != null && Object.keys(user_seeds.fav_artists.items).length >= 1) {
      return true
    }

    // verify user has enough genres for seeding
    if (user_seeds.fav_genres != null && Object.keys(user_seeds.fav_genres.items).length >= 1) {
      return true;
    }

    // Does not have at least 1 genre or artist preference saved
    return false;
  },

  updateUserSeeds: async (access_token, artist_ids) => {
    const spotify_user_data = await module.exports.fetchUserData(access_token);
    const kind = 'User';
    const user_key = datastore.key([kind, spotify_user_data.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const query_resp = await datastore.runQuery(query);

    let muse_user_data = query_resp[0][0]
    let updated_fav_artists = null;
    let updated_fav_genres = null;

    // Try to fetch existing fav_artists
    if (muse_user_data.fav_artists != null) {
      updated_fav_artists = muse_user_data.fav_artists;
    } else {
      updated_fav_artists = { global_counter: 0, items: {} };
    }

    // Try to fetch existing fav_genres
    if (muse_user_data.fav_genres != null) {
      updated_fav_genres = muse_user_data.fav_genres;
    } else {
      updated_fav_genres = { global_counter: 0, items: {} };
    }

    prefs = await updateArtistAndGenrePreferences(access_token, artist_ids, updated_fav_artists, updated_fav_genres);

    var updated_user_entity = {
      key: user_key,
      data: {
        fav_artists: prefs.artist_pref,
        fav_genres: prefs.genres_pref,
        country: muse_user_data.country,
      },
    };

    console.log("Updated entity");
    console.log(updated_user_entity);

    await datastore.save(updated_user_entity);
  },
}
