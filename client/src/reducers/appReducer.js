import { STORE_GENRES } from '../actions/appActions';

export default function reducer(state = {}, action) {
  switch (action.type) {
    case STORE_GENRES:
      return {
        ...state,
        genres: action.genres,
      };
    default:
      return state;
  }
}