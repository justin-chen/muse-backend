const axios = require('axios');

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

module.exports = {

  recommendedSongSelection: async (req, res) => {
    const access_token = req.body.access_token;
    const categories = req.body.categories;
    const limit = 50;
    const max_playlists_size = 5;

    let category_playlists_res;
    let all_playlists = {};
    let all_tracks = {};
    let continue_fetch = true;
    let page = 0;

    for (let i in categories) { // for each category
      continue_fetch = true;
      page = 0;

      while(continue_fetch) { // fetch as many playlists for a category as possible
        const category_playlist_fetch_options = {
          url: `https://api.spotify.com/v1/browse/categories/${categories[i]}/playlists?limit=${limit}&offset=${page*limit}`,
          headers: { Authorization: `Bearer ${access_token}` },
          json: true
        };

        try {
          category_playlists_res = await axios(category_playlist_fetch_options);
        } catch (error) {
          res.json(error.response.data);
        }

        const res_data = category_playlists_res.data.playlists;
        const playlists = res_data.items
        continue_fetch = (res_data.next != null);
        playlist_ids = playlists.map(playlist => { return playlist.id; });

        if (all_playlists[categories[i]]) {
          all_playlists[categories[i]].push(...playlist_ids);
        } else {
          all_playlists[categories[i]] = playlist_ids;
        }

        page += 1;
      }
    }

    // now we all_playlists which is a map of category to all playlists tagged with the category
    console.log(all_playlists);
  
    Object.keys(all_playlists).forEach((key, idx) => {
      all_playlists[key] = shuffle(all_playlists[key]);

      if (all_playlists[key].length > max_playlists_size) {
        all_playlists[key] = all_playlists[key].slice(0, max_playlists_size);
      }
    });

    console.log(all_playlists);
    
    // take n random playlists and get all tracks in those playlists
  

    res.send('finished');
  }
}
