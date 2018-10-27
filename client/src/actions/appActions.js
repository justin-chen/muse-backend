export const STORE_GENRES = 'STORE_GENRES';
export const storeGenres = (genres) => ({
    type: STORE_GENRES,
    genres,
});

export const fetchGenres = () => dispatch => {
    const url = 'http://localhost:5000/api/all_genres';
    fetch(url)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            console.log(`Error retrieving genres: ${response.status} ${response.statusText}`);
        })
        .then(genres => {
            dispatch(storeGenres(genres));
        });
};

export const updateGenrePreferences = payload => dispatch => {
    const url = 'http://localhost:5000/api/update_genres';
    const options = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    }
    fetch(url, options)
};