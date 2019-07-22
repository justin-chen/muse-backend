// Manager for spotify user related API calls and user data modifications

const spotify_utils = require('../utils/spotify_utils');

// Datastore Setup
const projectId = process.env.GCP_PROJECT_ID;
const Datastore = require('@google-cloud/datastore');
const datastore = new Datastore({
  projectId: projectId,
});

const axios = require('axios');

const MaxSize = 50;

updateArtistAndGenrePreferences = async (accessToken, artistIds, updatedFavArtists, updatedFavGenres) => {
  for (let i = 0; i < artistIds.length; i++) {
    id = artistIds[i];

    // make request to get the genres for this artist
    const options = {
      url: `https://api.spotify.com/v1/artists/${id}`,
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const artistResponse = await axios(options);

    var relatedGenres = artistResponse.data.genres;
    relatedGenres.forEach(genre => {
      if (!spotify_utils.isValidGenreSeed(genre)) {
        return;
      }

      // only if genre is one of the valid genre seeds
      updatedFavGenres.globalCounter += 1;
      if (updatedFavGenres.items[genre] != null) {  // If genre exists already, inc weight
        updatedFavGenres.items[genre].weight += 1;
        updatedFavGenres.items[genre].lastAccessed = updatedFavGenres.globalCounter;
      } else { // if genre does not exist and need insertion
        if (Object.keys(updatedFavGenres.items).length >= MaxSize) {
          // evict last updated entry if not enough space
          var leastRecentAccessedTime = updatedFavGenres.globalCounter;
          var leastRecentAccessedKey;
          for (var genreKey in updatedFavGenres[items]) {
            if (updatedFavGenres.items[genreKey].lastAccessed < leastRecentAccessedTime) {
              leastRecentAccessedTime = updatedFavGenres.items[genreKey].lastAccessed;
              leastRecentAccessedKey = genreKey;
            }
          }
          delete updatedFavGenres.items[genreKey];
          // TODO: Reset lastAccessed values and globalCounter by subtracting all by the lowest lastAccessed value
        }

        // Should always have enough space here
        updatedFavGenres.items[genre] = { weight: 1, lastAccessed: updatedFavGenres.globalCounter };
      }
    });

    updatedFavArtists.globalCounter += 1;
    if (updatedFavArtists.items[id] != null) { // If artist exists already, inc weight
      updatedFavArtists.items[id].weight += 1;
      updatedFavArtists.items[id].lastAccessed = updatedFavArtists.globalCounter;
    } else { // if artist does not exist and need insertion
      if (Object.keys(updatedFavArtists.items).length >= MaxSize) {
        // evict last updated entry if not enough space
        var leastRecentAccessedTime = updatedFavArtists.globalCounter;
        var leastRecentAccessedKey;
        for (var artistIdKey in updatedFavArtists.items) {
          if (updatedFavGenres.items[artistIdKey].lastAccessed < leastRecentAccessedTime) {
            leastRecentAccessedTime = updatedFavArtists.items[artistIdKey].lastAccessed;
            leastRecentAccessedKey = artistIdKey;
          }
        }
        delete updatedFavGenres.items[artistIdKey];
        // TODO: Reset lastAccessed values and globalCounter by subtracting all by the lowest lastAccessed value
      }

      // Should always have enough space here
      updatedFavArtists.items[id] = { weight: 1, lastAccessed: updatedFavArtists.globalCounter };

      console.log("ARTIST STRUCTURE IN FOREACH LOOP!")
      console.log(updatedFavArtists);
    }
  };

  return { artistPref: updatedFavArtists, genresPref: updatedFavGenres };
}

module.exports = {
  fetchUserData: async accessToken => {
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: { Authorization: `Bearer ${accessToken}` },
    };
    const { data } = await axios(options);

    return data;
  },

  getUserSeeds: async (accessToken) => {
    const spotifyUserData = await module.exports.fetchUserData(accessToken);
    const kind = 'User';
    const userKey = datastore.key([kind, spotifyUserData.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', userKey);
    const queryResponse = await datastore.runQuery(query);

    let museUserData = queryResponse[0][0];
    return { favArtists: museUserData.favArtists, favGenres: museUserData.favGenres };
  },

  verifyUserSeeds: async (accessToken) => {
    let userSeeds = await module.exports.getUserSeeds(accessToken);

    // verify user has enough artists for seeding
    if (userSeeds.favArtists != null && Object.keys(userSeeds.favArtists.items).length >= 1) {
      return true
    }

    // verify user has enough genres for seeding
    if (userSeeds.favGenres != null && Object.keys(userSeeds.favGenres.items).length >= 1) {
      return true;
    }

    // Does not have at least 1 genre or artist preference saved
    return false;
  },

  updateUserSeeds: async (accessToken, artistIds) => {
    const spotifyUserData = await module.exports.fetchUserData(accessToken);
    const kind = 'User';
    const userKey = datastore.key([kind, spotifyUserData.email]);
    const query = datastore.createQuery(kind).filter('__key__', '=', userKey);
    const queryResponse = await datastore.runQuery(query);

    let museUserData = queryResponse[0][0]
    console.log(museUserData);
    let updatedFavArtists = null;
    let updatedFavGenres = null;

    // Try to fetch existing fav_artists
    if (museUserData.favArtists != null) {
      updatedFavArtists = museUserData.favArtists;
    } else {
      updatedFavArtists = { globalCounter: 0, items: {} };
    }

    // Try to fetch existing fav_genres
    if (museUserData.favGenres != null) {
      updatedFavGenres = museUserData.favGenres;
    } else {
      updatedFavGenres = { globalCounter: 0, items: {} };
    }

    prefs = await updateArtistAndGenrePreferences(accessToken, artistIds, updatedFavArtists, updatedFavGenres);

    console.log(prefs.artistPref);
    console.log(prefs.genresPref)

    var updatedUserEntity = {
      key: userKey,
      data: {
        favArtists: prefs.artistPref,
        favGenres: prefs.genresPref,
        country: museUserData.country,
      },
    };

    console.log(updatedUserEntity);

    await datastore.save(updatedUserEntity);
  },
}
