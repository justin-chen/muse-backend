export const STORE_TOKENS = 'STORE_TOKENS';
export const storeTokens = (accessToken, refreshToken) => ({
    type: STORE_TOKENS,
    accessToken,
    refreshToken,
});

export const STORE_PROFILE = 'STORE_PROFILE';
export const storeProfile = (profile) => ({
    type: STORE_PROFILE,
    profile,
});

export const fetchProfile = (accessToken) => (dispatch) => {
    const url = 'http://localhost:5000/api/fetch_user';
    const options = {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            access_token: accessToken
        }),
    };
    fetch(url, options)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            console.log(`Error retrieving profile: ${response.status} ${response.statusText}`);
        })
        .then(profile => {
            dispatch(storeProfile(profile));
        });
};

export const authenticateUser = (accessToken, refreshToken) => (dispatch) => {
    dispatch(storeTokens(accessToken, refreshToken));
    dispatch(fetchProfile(accessToken));
};
