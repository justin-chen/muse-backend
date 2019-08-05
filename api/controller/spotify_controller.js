const AXIOS = require('axios');
const USER_MANAGER = require('../managers/user_manager');
const SPOTIFY_UTILS = require('../utils/spotify_utils');
const DUMMY_ID = '!@#$%^&*()_';
const PLACEHOLDER_IMG = 'https://via.placeholder.com/650/8BE79A/ffffff?text=Muse';

function shuffle(list) {
  let max = list.length - 1;
  let min;
  let picked;

  for (let i = 0; i < list.length - 1; i++) {
    min = i
    picked = Math.floor(Math.random() * (max - min + 1)) + min; // Returns a random integer between min (include) and max (include)
    [list[i], list[picked]] = [list[picked], list[i]];
  }

  return list;
}

// return a random sublist with size up to limit
function getRandomSublist(list, limit) {
  list = shuffle(list);
  if (list.length > limit) {
    list = list.slice(0, limit);
  }
  return list;
}

function mergeObjects(objs) {
  return objs.reduce(((result, obj) => Object.assign(result, obj)), {});
}

async function bulkFetchRandomizedItems(endpoint, access_token, objs, batch_limit, callback) {
  const limit = 50
  let continue_fetch = true;
  let page = 0;
  let result = [];
  let api_res;
  let parsed_data;

  for (let i in objs) {
    let obj_endpoint = endpoint.replace(DUMMY_ID, objs[i]);
    let batch = [];
    continue_fetch = true;
    page = 0;

    while (continue_fetch) {
      const fetch_options = {
        url: `${obj_endpoint}limit=${limit}&offset=${page * limit}`,
        headers: { Authorization: `Bearer ${access_token}` },
        json: true
      };

      api_res = await AXIOS(fetch_options);
      parsed_data = callback(api_res);

      const items = parsed_data[0];
      continue_fetch = (parsed_data[1] != null);

      batch.push(...items);
      page += 1;
    }

    batch = getRandomSublist(batch, batch_limit);
    result.push(...batch);
  }

  return result;
}

selectWeightedRandoms = (data_struct, max_size) => {
  if (data_struct == null) {
    return [];
  }

  let selectedRandoms = []
  let weight_sum = 0;
  let total_size = Object.keys(data_struct).length; // original size of data_struct

  // Sum up total weights of all items
  for (let key in data_struct) {
    weight_sum += data_struct[key].weight
  }

  // If the data_struct has more or equal items than max_size, loop while the number of selected is less than max_size
  // If the data_struct has less items than max_size, loop while the number of selected is less than the number of items in data_struct
  while ((total_size >= max_size && selectedRandoms.length < max_size) || (total_size < max_size && selectedRandoms.length < total_size)) {
    // Pick a weight in range [0, weight_sum)
    var rand_weight = Math.floor(Math.random() * (weight_sum));
    var curr_weight = 0;
    var chosen_id;

    // For each item, sum their weights
    for (var key in data_struct) {
      curr_weight += data_struct[key].weight;
      if (curr_weight > rand_weight) {
        // Select the current item when the total item weights so far is greater than random weight
        selectedRandoms.push(key);
        chosen_id = key;
        weight_sum -= data_struct[key].weight;
        break;
      }
    }

    // Remove the added item from the pool
    delete data_struct[chosen_id];
  }

  return selectedRandoms;
}

module.exports = {
  userSeedRecommendedSongSelection: async (req, res) => {
    const { access_token, limit: max_result_tracks } = req.body;
    const max_seed_list_size = 5;

    const spotify_user_data = await USER_MANAGER.fetchUserData(req.body.access_token);
    if (spotify_user_data.error != null) return res.json(spotify_user_data);

    const seeds = await USER_MANAGER.fetchUserSeeds(spotify_user_data.email);
    if (seeds.error != null) return res.json(seeds);

    let artist_seeds = selectWeightedRandoms(seeds.fav_artists, max_seed_list_size);
    let genre_seeds = selectWeightedRandoms(seeds.fav_genres, max_seed_list_size);

    // Combined the seeds, shuffle and pick 5
    let combined_seeds = getRandomSublist(artist_seeds.concat(genre_seeds), 5);

    // Now that we have the shuffled seeds, redistribute them back to their types so we know which ones are ids and which ones are genres
    artist_seeds = [];
    genre_seeds = [];
    for (let i = 0; i < combined_seeds.length; i++) {
      if (SPOTIFY_UTILS.isValidGenreSeed(combined_seeds[i])) {
        genre_seeds.push(combined_seeds[i]);
      } else {
        artist_seeds.push(combined_seeds[i]);
      }
    }

    // Make the seed recommendation api request
    let user_country = spotify_user_data.country;
    artist_seeds = artist_seeds.join(",");
    genre_seeds = genre_seeds.join(",");

    let url = `https://api.spotify.com/v1/recommendations?limit=30&market=${user_country}&min_popularity=30`;
    if (artist_seeds) {
      url += `&seed_artists=${artist_seeds}`;
    }
    if (genre_seeds) {
      url += `&seed_genres=${genre_seeds}`;
    }

    const options = {
      url: url,
      headers: { Authorization: `Bearer ${access_token}` },
    };

    try {
      const recommended_track_resp = await AXIOS(options);

      let formatted_tracks = [];
      recommended_track_resp.data.tracks.forEach(track => {
        if (!track.preview_url) return;

        let formatted_track = {};
        let id = track.id;
        let value = {
          name: track.name,
          spotify_uri: track.uri,
          artists: track.artists.map(artist => artist.name),
          artist_id: track.artists[0].id,
          album: track.album.name,
          artwork: track.album.images.length ? track.album.images.map(image => image.url) : [PLACEHOLDER_IMG],
          preview_url: track.preview_url,
        };

        formatted_track[id] = value;
        formatted_tracks.push(formatted_track);
      })

      formatted_tracks = getRandomSublist(formatted_tracks, max_result_tracks);
      res.json(mergeObjects(formatted_tracks));
    } catch (error) {
      console.log(error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        return res.status(400).json({ error: error });
      }
    }
  },

  verifyEnoughData: async (req, res) => {
    const spotify_user_data = await USER_MANAGER.fetchUserData(req.query.access_token);
    if (spotify_user_data.error != null) return res.json(spotify_user_data);

    const response = await USER_MANAGER.verifyUserSeeds(spotify_user_data.email);
    return res.json(response);
  },

  isNewUser: async (req, res) => {
    const spotify_user_data = await USER_MANAGER.fetchUserData(req.query.access_token);
    if (spotify_user_data.error != null) return res.json(spotify_user_data);

    const response = await USER_MANAGER.isNewUser(spotify_user_data.email);
    return res.json(response);
  },

  syncedNewUser: async (req, res) => {
    const spotify_user_data = await USER_MANAGER.fetchUserData(req.body.access_token);
    if (spotify_user_data.error != null) return res.json(spotify_user_data);

    const response = await USER_MANAGER.syncedNewUser(spotify_user_data.email);
    return res.json(response);
  },

  updateUserSeeds: async (req, res) => {
    const { access_token, artist_ids } = req.body;
    const response = await USER_MANAGER.updateUserSeeds(access_token, artist_ids);
    res.json(response);
  },

  recommendedSongSelection: async (req, res) => {
    let { access_token, categories, limit: max_result_tracks } = req.body;
    const max_playlists_per_category = 1;
    const max_tracks_per_playlist = 10;
    let tracks = [];

    if (categories.length < 1) {
      categories = SPOTIFY_UTILS.getCategories();
    }

    try {
      const user_data = await USER_MANAGER.fetchUserData(access_token);
      const user_country = user_data.country;
      const category_endpoint = `https://api.spotify.com/v1/browse/categories/${DUMMY_ID}/playlists?country=${user_country}&`;
      const playlist_endpoint = `https://api.spotify.com/v1/playlists/${DUMMY_ID}/tracks?market=${user_country}&`;

      let playlists = await bulkFetchRandomizedItems(category_endpoint, access_token, categories, max_playlists_per_category, (response) => {
        let res_data = response.data;
        let items = res_data.playlists.items.map(item => item.id);
        let next = res_data.playlists.next;
        return [items, next];
      });

      tracks = await bulkFetchRandomizedItems(playlist_endpoint, access_token, playlists, max_tracks_per_playlist, (response) => {
        let res_data = response.data;
        let formatted_items = [];

        res_data.items.forEach(item => {
          if (!item.track) return;
          if (!item.track.preview_url) return;

          let formatted_item = {}
          let id = item.track.id;
          let value = {
            name: item.track.name,
            spotify_uri: item.track.uri,
            artists: item.track.artists.map(artist => artist.name),
            artist_id: item.track.artists[0].id,
            album: item.track.album.name,
            artwork: item.track.album.images.length ? item.track.album.images.map(image => image.url) : [PLACEHOLDER_IMG],
            preview_url: item.track.preview_url,
          };

          formatted_item[id] = value;
          formatted_items.push(formatted_item);
        })

        let next = res_data.next;
        return [formatted_items, next];
      });
    } catch (error) {
      console.log(error);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        return res.status(400).json({ error: error });
      }
    }

    tracks = getRandomSublist(tracks, max_result_tracks);
    res.json(mergeObjects(tracks));
  }
}
