import { STORE_TOKENS, STORE_PROFILE } from '../actions/loginActions';

export default function reducer(state = {}, action) {
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