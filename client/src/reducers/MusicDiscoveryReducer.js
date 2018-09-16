import { combineReducers } from 'redux';

import auth from './loginReducer';

const root = combineReducers({
    auth
});

export default root;