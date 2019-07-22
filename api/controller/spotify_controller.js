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

module.exports = {
  userSeedRecommendedSongSelection: async (req, res) => {
    let { access_token, limit: max_result_tracks }= req.body;
    let { fav_artists, fav_genres } = await USER_MANAGER.getUserSeeds(access_token)
    let max_seed_list_size = 5;
    let artist_seeds = [];
    let genre_seeds = [];

    // Get up to 5 random artist ids
    let weight_sum = 0;
    for (let artist_id in fav_artists.items) {
      weight_sum += fav_artists.items[artist_id].weight
    }

    // While we haven't gotten 5 randoms yet, or we haven't gotten whatever the max (if < 5) randoms
    let total_artists_length = Object.keys(fav_artists.items).length;
    while ((total_artists_length >= max_seed_list_size && artist_seeds.length < max_seed_list_size) || (total_artists_length < max_seed_list_size && artist_seeds.length < total_artists_length)) {
      var rand_weight = Math.floor(Math.random() * (weight_sum)); // in range [0, weight_sum)
      var curr_weight = 0;
      var chosen_id;

      for (var artist_id in fav_artists.items) {
        curr_weight += fav_artists.items[artist_id].weight;
        if (curr_weight > rand_weight) {
          // take this element
          artist_seeds.push(artist_id);
          chosen_id = artist_id;
          weight_sum -= fav_artists.items[artist_id].weight;
          break;
        }
      }

      delete fav_artists.items[chosen_id];
    }

    // Get up to 5 random genres
    weight_sum = 0;
    for (let genre in fav_genres.items) {
      weight_sum += fav_genres.items[genre].weight
    }

    let total_genres_length = Object.keys(fav_genres.items).length;
    while ((total_genres_length >= max_seed_list_size && genre_seeds.length < max_seed_list_size) || (total_genres_length < max_seed_list_size && genre_seeds.length < total_genres_length)) {
      var rand_weight = Math.floor(Math.random() * (weight_sum)); // in range [0, weight_sum)
      var curr_weight = 0;
      var chosen_genre;

      for (var genre in fav_genres.items) {
        curr_weight += fav_genres.items[genre].weight;
        if (curr_weight > rand_weight) {
          // take this element
          genre_seeds.push(genre);
          chosen_genre = genre;
          weight_sum -= fav_genres.items[genre].weight;
          break;
        }
      }

      delete fav_genres.items[chosen_genre];
    }

    let combined_seeds = artist_seeds.concat(genre_seeds);
    combined_seeds = getRandomSublist(combined_seeds, 5);

    // Now that we have the 5 seeds, redistribute them back to their types so we know which ones are ids and which ones are genres
    artist_seeds = [];
    genre_seeds = [];
    for (let i = 0; i < combined_seeds.length; i++) {
      if (SPOTIFY_UTILS.isValidGenreSeed(combined_seeds[i])) {
        genre_seeds.push(combined_seeds[i]);
      } else {
        artist_seeds.push(combined_seeds[i]);
      }
    }

    let user_data = await USER_MANAGER.fetchUserData(access_token);
    let user_country = user_data.country;
    artist_seeds = artist_seeds.join(",");
    genre_seeds = genre_seeds.join(",");

    // make recommendation api with seeds
    const options = {
      url: `https://api.spotify.com/v1/recommendations?limit=30&market=${user_country}&seed_artists=${artist_seeds}&seed_genres=${genre_seeds}&min_popularity=50`,
      headers: { Authorization: `Bearer ${access_token}` },
    };

    const recommended_track_resp = await AXIOS(options);

    let formatted_tracks = []
    recommended_track_resp.data.tracks.forEach(track => {
      if (!track.preview_url) return;

      let formatted_track = {}
      let id = track.id;
      let value = {
        name: track.name,
        spotify_uri: track.uri,
        artist: track.artists[0].name,
        artist_id: track.artists[0].id,
        artwork: track.album.images.length > 0 ? track.album.images[0].url : PLACEHOLDER_IMG,
        preview_url: track.preview_url,
      };

      formatted_track[id] = value;
      formatted_tracks.push(formatted_track);
    })

    formatted_tracks = getRandomSublist(formatted_tracks, max_result_tracks);
    res.json(mergeObjects(formatted_tracks));
  },

  verifyEnoughData: async (req, res) => {
    let has_data = await USER_MANAGER.verifyUserSeeds(req.body.access_token);
    res.json({ has_enough_data: has_data });
  },

  updateUserSeeds: async (req, res) => {
    let { access_token, artist_ids } = req.body;
    await USER_MANAGER.updateUserSeeds(access_token, artist_ids);
    res.json({ message: "Update finished" });
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
        let formatted_items = []

        res_data.items.forEach(item => {
          if (!item.track) return;
          if (!item.track.preview_url) return;

          let formatted_item = {}
          let id = item.track.id;
          let value = {
            name: item.track.name,
            spotify_uri: item.track.uri,
            artist: item.track.artists[0].name,
            artist_id: item.track.artists[0].id,
            artwork: item.track.album.images.length > 0 ? item.track.album.images[0].url : PLACEHOLDER_IMG,
            preview_url: item.track.preview_url,
          };

          formatted_item[id] = value;
          formatted_items.push(formatted_item);
        })

        let next = res_data.next;
        return [formatted_items, next];
      });
    } catch (error) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        // Should log error somewhere
        return res.status(400).json({ error: 'Request to Spotify API failed' });
      }
    }

    tracks = getRandomSublist(tracks, max_result_tracks);
    res.json(mergeObjects(tracks));
  }
}
