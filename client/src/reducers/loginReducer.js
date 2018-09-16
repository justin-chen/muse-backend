import { STORE_TOKENS, STORE_PROFILE } from '../actions/loginActions';

const initAuth = {
  access_token: localStorage.getItem('ACCESS_TOKEN'),
  refresh_token: localStorage.getItem('REFRESH_TOKEN'),
  profile: null,
};

export default function reducer(state = initAuth, action) {
  switch (action.type) {
    case STORE_TOKENS:
      return {
        ...state,
        access_token: action.accessToken,
        refresh_token: action.refreshToken,
      };
    case STORE_PROFILE:
      return {
        ...state,
        profile: action.profile,
      };
    default:
      return state;
  }
}