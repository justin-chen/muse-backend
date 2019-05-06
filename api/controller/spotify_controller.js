const axios = require('axios');
const user_manager = require('../managers/user_manager');
const spotify_utils = require('../utils/spotify_utils');
const dummy_id_placeholder = '!@#$%^&*()_';
const placeholder_img = 'https://via.placeholder.com/650/8BE79A/ffffff?text=Muse';

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
    let obj_endpoint = endpoint.replace(dummy_id_placeholder, objs[i]);
    let batch = [];
    continue_fetch = true;
    page = 0;

    while (continue_fetch) {
      const fetch_options = {
        url: `${obj_endpoint}limit=${limit}&offset=${page * limit}`,
        headers: { Authorization: `Bearer ${access_token}` },
        json: true
      };

      api_res = await axios(fetch_options);
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
  recommendedSongSelection: async (req, res) => {
    let { access_token, categories, limit: max_result_tracks } = req.body;
    const max_playlists_per_category = 1;
    const max_tracks_per_playlist = 10;
    let tracks = [];

    if (categories.length < 1) {
      categories = spotify_utils.getCategories();
    }

    try {
      const user_data = await user_manager.fetchUserData(access_token);
      const user_country = user_data.country;
      const category_endpoint = `https://api.spotify.com/v1/browse/categories/${dummy_id_placeholder}/playlists?country=${user_country}&`;
      const playlist_endpoint = `https://api.spotify.com/v1/playlists/${dummy_id_placeholder}/tracks?market=${user_country}&`;

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
            artwork: item.track.album.images.length > 0 ? item.track.album.images[0].url : placeholder_img,
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
  },

  exportToPlaylist: async (req, res) => {
    let { access_token, name, description, is_public, is_collaborative, track_uris } = req.body; // track_uris format: ["uri1", "uri2", "uri3"]
    let created_playlist_id;

    try {
      const user_data = await user_manager.fetchUserData(access_token);
      const user_id = user_data.id;

      const playlist_create_fetch_options = {
        method: 'post',
        url: `https://api.spotify.com/v1/users/${user_id}/playlists`,
        headers: { Authorization: `Bearer ${access_token}` },
        data: JSON.stringify({ name: name, description: description, public: is_public, collaborative: is_collaborative }),
        json: true
      };

      const create_playlist_res = await axios(playlist_create_fetch_options);
      created_playlist_id = create_playlist_res.data.id;

      const playlist_add_tracks_fetch_options = {
        method: 'post',
        url: `https://api.spotify.com/v1/playlists/${created_playlist_id}/tracks`,
        headers: { Authorization: `Bearer ${access_token}` },
        data: JSON.stringify({ uris: track_uris }),
        json: true
      };

      await axios(playlist_add_tracks_fetch_options);
    } catch (error) {
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      } else {
        // Should log error somewhere
        return res.status(400).json({ error: 'Request to Spotify API failed' });
      }
    }

    res.status(200).json({ created_playlist_id: created_playlist_id });
  }
}
