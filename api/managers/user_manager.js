// Manager for spotify user related API calls and user data modifications

// Datastore Setup
const project_id = process.env.GCP_PROJECT_ID;
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: project_id,
});

const SPOTIFY_UTILS = require('../utils/spotify_utils');
const AXIOS = require('axios');

// Max Size for all user fav_artists and fav_genres structures
const MAX_SIZE = 50;

/*/
/* Params:
/*   data_struct: Either fav_artists or fav_genres structures that have the appropriate structure for implementing LRU eviction policy
/*
/* Returns:
/*   Modified data_struct where weights of all items are divided by the lowest weight that is > 1 (n/1 = n and n/0 = undefined)
/*/
normalizeItemWeights = (data_struct) => {
  let lowest_weight = Number.MAX_SAFE_INTEGER; // Should be some big int

  for (var key in data_struct) {
    if (data_struct[key].weight < lowest_weight) lowest_weight = data_struct[key].weight;
  }

  if (lowest_weight > 1) {
    for (var key in data_struct) {
      data_struct[key].weight = Math.floor(data_struct[key].weight/lowest_weight);
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
  // Mark current time on insert call
  let current_time = Date.now();

  // If key exists already, inc weight and update accessed time to current time
  if (data_struct[key] != null) {
    data_struct[key].weight += 1;
    data_struct[key].last_accessed = current_time;
    return data_struct;
  }

  // Otherwise, need to add to the data_struct
  if (Object.keys(data_struct).length >= MAX_SIZE) {
    // If there is no room in the data_struct, evict LRU item
    var lowest_timestamp = current_time;
    var evict_key;

    // To evict, go through all items in the data_struct and find the one with the least recent last_accessed timestamp
    for (var id_key in data_struct) {
      if (data_struct[id_key].last_accessed < lowest_timestamp) {
        lowest_timestamp = data_struct[id_key].last_accessed;
        evict_key = id_key;
      }
    }

    delete data_struct[evict_key];
  }

  // Should always have enough space in the data_struct here
  data_struct[key] = { weight: 1, last_accessed: current_time };

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
    artist_ids_chunk = artist_ids[i];

    const options = {
      url: `https://api.spotify.com/v1/artists?ids=${artist_ids_chunk.join(",")}`,
      headers: { Authorization: `Bearer ${access_token}` },
    };

    try {
      const artist_chunk_resp = await AXIOS(options);
      for (let j = 0; j < artist_chunk_resp.data.artists.length; j++) {
        const artist_resp = artist_chunk_resp.data.artists[j];
        const id = artist_chunk_resp.data.artists[j].id;

        const related_genres = artist_resp.genres;
        related_genres.forEach(genre => {
          if (!SPOTIFY_UTILS.isValidGenreSeed(genre)) return;
          fav_genres = insertWithLruPolicy(fav_genres, genre);
        });

        fav_artists = insertWithLruPolicy(fav_artists, id);
      }
    } catch (error) {
      if (error.response) {
        return error.response.data;
      } else {
        console.log(error);
        return { error: "Unexpected error, check logs" };
      }
    }
  }

  // To avoid large weight values in the structures (to further decrease the unlikely chance of overflowing values)
  fav_artists = normalizeItemWeights(fav_artists);
  fav_genres = normalizeItemWeights(fav_genres);

  return { artists_pref: fav_artists, genres_pref: fav_genres };
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

  // Get user data from datastore
  // Returns:
  //   On success: JSON containing data key
  //   On failure: JSON containing error key
  fetchUserDatastoreData: async (user_email) => {
    const kind = 'User';
    const user_key = datastore.key([kind, user_email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    let muse_user_data;

    try {
      const query_resp = await datastore.runQuery(query);
      muse_user_data = query_resp[0][0];
      return { data: muse_user_data };
    } catch (error) {
      return { error: error };
    }
  },

  // Get user seed preference from datastore
  // Returns:
  //   On success: JSON containing fav_artist and fav_genre data from datastore
  //   On failure: JSON containing error key
  fetchUserSeeds: async (user_email) => {
    const muse_user_data = await module.exports.fetchUserDatastoreData(user_email);
    if (muse_user_data.error != null) return muse_user_data;

    return {
      fav_artists: muse_user_data.data.fav_artists,
      fav_genres: muse_user_data.data.fav_genres,
      spotify_fav_artists: muse_user_data.data.spotify_fav_artists,
      spotify_fav_genres: muse_user_data.data.spotify_fav_genres,
    };
  },

  // Check if user has enough seed values for seed recommendation
  // Returns:
  //   On success: JSON containing has_enough_data key with the value of true or false
  //   On failure: JSON containing error key
  verifyUserSeeds: async (user_email) => {
    const user_seeds = await module.exports.fetchUserSeeds(user_email);
    if (user_seeds.error != null) return user_seeds;

    // verify user has enough artists and genres for seeding
    if (user_seeds.fav_artists != null && Object.keys(user_seeds.fav_artists).length >= 1) return { has_enough_data: true };
    if (user_seeds.fav_genres != null && Object.keys(user_seeds.fav_genres).length >= 1) return { has_enough_data: true };
    if (user_seeds.spotify_fav_artists != null && Object.keys(user_seeds.spotify_fav_artists).length >= 1) return { has_enough_data: true };
    if (user_seeds.spotify_fav_genres != null && Object.keys(user_seeds.spotify_fav_genres).length >= 1) return { has_enough_data: true };

    // Does not have at least 1 genre or artist preference saved
    return { has_enough_data: false };
  },

  // Check for the timestamp where the user was last synced with their Spotify preferences
  // Returns:
  //   On success: JSON containing last_synced_with_spotify key with a timestamp
  //   On failure: JSON containing error key
  lastSyncedWithSpotify: async (user_email) => {
    const user_data = await module.exports.fetchUserDatastoreData(user_email);
    if (user_data.error != null) return user_data;

    return { last_synced_with_spotify: user_data.data.last_synced_with_spotify };
  },

  // Check if user is a new user
  // Returns:
  //   On success: JSON containing is_new_user key with the value of true or false
  //   On failure: JSON containing error key
  isNewUser: async (user_email) => {
    const user_data = await module.exports.fetchUserDatastoreData(user_email);
    if (user_data.error != null) return user_data;

    return { is_new_user: user_data.data.is_new_user };
  },

  // Update a user as a non new user
  // Returns:
  //   On success: JSON containing the key "updated"
  //   On failure: JSON containing the key "error"
  syncedNewUser: async (user_email) => {
    const kind = 'User';
    const user_key = datastore.key([kind, user_email]);
    const muse_user_data = await module.exports.fetchUserDatastoreData(user_email);

    var updated_user_entity = {
      key: user_key,
      data: {
        fav_artists: muse_user_data.data.fav_artists,
        fav_genres: muse_user_data.data.fav_genres,
        spotify_fav_artists: muse_user_data.spotify_fav_artists,
        spotify_fav_genres: muse_user_data.spotify_fav_genres,
        country: muse_user_data.data.country,
        is_new_user: false,
        last_synced_with_spotify: muse_user_data.data.last_synced_with_spotify,
      },
    };

    try {
      await datastore.save(updated_user_entity);
      return { updated: true };
    } catch (error) {
      return { error: error };
    }
  },

  // Create or update the muse or spotify artist and genre seeds for the current user
  // Returns:
  //   On success: JSON containing the key "updated"
  //   On failure: JSON containing the key "error"
  updateUserSeeds: async (access_token, artist_ids, type) => {
    const spotify_user_data = await module.exports.fetchUserData(access_token);
    if (spotify_user_data.error != null) return spotify_user_data;

    const kind = 'User';
    const user_key = datastore.key([kind, spotify_user_data.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', user_key);
    const query_resp = await datastore.runQuery(query);

    let muse_user_data = query_resp[0][0];
    let updated_fav_artists = null;
    let updated_fav_genres = null;

    if (type === "muse") {
      updated_fav_artists = muse_user_data.fav_artists;
      updated_fav_genres = muse_user_data.fav_genres;
    } else if (type === "spotify") { // Wipe existing spotify preference before re-syncing
      updated_fav_artists = {};
      updated_fav_genres = {};
    }

    prefs = await updateArtistAndGenrePreferences(access_token, artist_ids, updated_fav_artists, updated_fav_genres);
    if (prefs.error != null) return prefs;

    var updated_user_entity = {
      key: user_key,
      data: {
        fav_artists: type === "muse" ? prefs.artists_pref : muse_user_data.fav_artists,
        fav_genres: type === "muse" ? prefs.genres_pref : muse_user_data.fav_genres,
        spotify_fav_artists: type === "muse" ? muse_user_data.spotify_fav_artists : prefs.artists_pref,
        spotify_fav_genres: type === "muse" ? muse_user_data.spotify_fav_genres: prefs.genres_pref,
        country: muse_user_data.country,
        is_new_user: muse_user_data.is_new_user,
        last_synced_with_spotify: type === "muse" ? muse_user_data.last_synced_with_spotify : Date.now(),
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
