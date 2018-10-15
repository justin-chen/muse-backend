import { combineReducers } from 'redux';

import auth from './loginReducer';
import app from './appReducer';

const root = combineReducers({
    auth,
    app
});

export default root;