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

/*/
/* Params:
/*   data_struct: Either fav_artists or fav_genres structures that have the appropriate structure for implementing LRU eviction policy
/*
/* Returns:
/*   The modified data_struct where the global_counter and last_accessed of each item are subtracted by the lowest
/*   last_accessed value, and weights of all items are divided by the lowest weight that is > 1 (n/1 = n and n/0 = undefined)
/*/
normalizeIncrementingValues = (data_struct) => {
  let lowest_lru_time = data_struct.global_counter // Must be at most global_counter
  let lowest_weight = Number.MAX_SAFE_INTEGER; // Should be some big int

  for (var key in data_struct.items) {
    if (data_struct.items[key].last_accessed < lowest_lru_time) lowest_lru_time = data_struct.items[key].last_accessed;

    if (data_struct.items[key].weight < lowest_weight) lowest_weight = data_struct.items[key].weight;
  }

  data_struct.global_counter -= lowest_lru_time;
  for (var key in data_struct.items) {
    data_struct.items[key].last_accessed -= lowest_lru_time;
  }

  if (lowest_weight > 1) {
    for (var key in data_struct.items) {
      data_struct.items[key].weight /= lowest_weight;
    }
  }

  return data_struct;
}

/*/
/* Params:
/*   data_struct: Either fav_artists or fav_genres structures that have the appropriate structure for implementing LRU eviction policy
/*   key: The key that should be inserted into the structure
/*
/* Returns:
/*   The modified data_struct where the key is inserted into the structure. If the structure was initially full,
/*   the inserted key will replace a key in the structure that was accessed the least recently
/*/
insertWithLruPolicy = (data_struct, key) => {
  // Start by incrementing global counter
  data_struct.global_counter += 1;

  // If key exists already, inc weight and update accessed time
  // Otherwise, need to add to the data_struct
  if (data_struct.items[key] != null) {
    data_struct.items[key].weight += 1;
    data_struct.items[key].last_accessed = data_struct.global_counter;
  } else {
    // If there is no room in the data_struct, evict LRU item
    if (Object.keys(data_struct.items).length >= MAX_SIZE) {
      var lru_time = data_struct.global_counter;
      var lru_key;

      // To evict, go through all items in the data_struct and find the one with the lowest last_accessed value
      for (var id_key in data_struct.items) {
        if (data_struct.items[id_key].last_accessed < lru_time) {
          lru_time = data_struct.items[id_key].last_accessed;
          lru_key = id_key;
        }
      }

      delete data_struct.items[id_key];
    }

    // Should always have enough space in the data_struct here
    data_struct.items[key] = { weight: 1, last_accessed: data_struct.global_counter };
  }

  return data_struct;
}

/*/
/* Params:
/*   access_token: Access token of current user
/*   artist_ids: A list of Spotify artist ids
/*   fav_artists, fav_genres: JSONs/hashes containing current user's artist and genre preferences
/*
/* Returns:
/*   On success: JSON containing updated fav_artists and fav_genres based on the given artist_ids
/*   On failure: JSON containing error message
/*/
updateArtistAndGenrePreferences = async (access_token, artist_ids, fav_artists, fav_genres) => {
  for (let i = 0; i < artist_ids.length; i++) {
    id = artist_ids[i];

    const options = {
      url: `https://api.spotify.com/v1/artists/${id}`,
      headers: { Authorization: `Bearer ${access_token}` },
    };

    try {
      const artist_resp = await AXIOS(options);

      var related_genres = artist_resp.data.genres;
      related_genres.forEach(genre => {
        if (!SPOTIFY_UTILS.isValidGenreSeed(genre)) return;
        fav_genres = insertWithLruPolicy(fav_genres, genre);
      });

      fav_artists = insertWithLruPolicy(fav_artists, id);
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        console.log(error);
        return { error: "Unexpected error, check logs" };
      }
    }
  }

  // To avoid large values in the structures (to further decrease the unlikely chance of overflowing values)
  fav_artists = normalizeIncrementingValues(fav_artists);
  fav_genres = normalizeIncrementingValues(fav_genres);

  return { artist_pref: fav_artists, genres_pref: fav_genres };
}

module.exports = {
  // Get Spotify user data
  // Returns:
  //   On success: JSON of user data
  //   On failure: JSON containing error key
  fetchUserData: async access_token => {
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: { Authorization: `Bearer ${access_token}` },
    };

    try {
      const { data } = await AXIOS(options);
      return data;
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        console.log(error);
        return { error: "Unexpected error, check logs" };
      }
    }
  },

  // Get user seed preference from datastore
  // Returns:
  //   On success: JSON containing fav_artist and fav_genre data from datastore
  //   On failure: JSON containing error key
  fetchUserSeeds: async (user_email) => {
    const kind = 'User';
    const user_key = datastore.key([kind, user_email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    let muse_user_data;

    try {
      const query_resp = await datastore.runQuery(query);
      muse_user_data = query_resp[0][0];
      return { fav_artists: muse_user_data.fav_artists, fav_genres: muse_user_data.fav_genres };
    } catch (error) {
      return { error: error };
    }
  },

  // Check if user has enough seed values for seed recommendation
  // Returns:
  //   On success: JSON containing has_enough_data key with the value of true or false
  //   On failure: JSON containing error key
  verifyUserSeeds: async (user_email) => {
    const user_seeds = await module.exports.fetchUserSeeds(user_email);
    if (user_seeds.error != null) return user_seeds;

    // verify user has enough artists and genres for seeding
    if (user_seeds.fav_artists != null && Object.keys(user_seeds.fav_artists.items).length >= 1) return { has_enough_data: true };
    if (user_seeds.fav_genres != null && Object.keys(user_seeds.fav_genres.items).length >= 1) return { has_enough_data: true };

    // Does not have at least 1 genre or artist preference saved
    return { has_enough_data: false };
  },

  // Create or update the artist and genre seeds for the current user
  // Returns:
  //   On success: JSON containing the key "updated"
  //   On failure: JSON containing the key "error"
  updateUserSeeds: async (access_token, artist_ids) => {
    const spotify_user_data = await module.exports.fetchUserData(access_token);
    if (spotify_user_data.error != null) return spotify_user_data;

    const kind = 'User';
    const user_key = datastore.key([kind, spotify_user_data.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const query_resp = await datastore.runQuery(query);

    let muse_user_data = query_resp[0][0]

    let updated_fav_artists = null;
    let updated_fav_genres = null;

    if (muse_user_data.fav_artists != null) {
      updated_fav_artists = muse_user_data.fav_artists;
    } else {
      updated_fav_artists = { global_counter: 0, items: {} };
    }

    if (muse_user_data.fav_genres != null) {
      updated_fav_genres = muse_user_data.fav_genres;
    } else {
      updated_fav_genres = { global_counter: 0, items: {} };
    }

    prefs = await updateArtistAndGenrePreferences(access_token, artist_ids, updated_fav_artists, updated_fav_genres);
    if (prefs.error != null) return prefs;

    var updated_user_entity = {
      key: user_key,
      data: {
        fav_artists: prefs.artist_pref,
        fav_genres: prefs.genres_pref,
        country: muse_user_data.country,
      },
    };

    try {
      await datastore.save(updated_user_entity);
      return { updated: true };
    } catch (error) {
      return { error: error };
    }
  },
}
