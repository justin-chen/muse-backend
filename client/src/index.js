import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import thunk from 'redux-thunk';
import { composeWithDevTools } from 'redux-devtools-extension';
import App from './containers/AppContainer';
import Login from './containers/LoginContainer';
import { unregister } from './registerServiceWorker';
import MusicDiscoveryReducer from './reducers/MusicDiscoveryReducer';
import './styles/index.css';

const store = createStore(
    MusicDiscoveryReducer, composeWithDevTools(applyMiddleware(thunk)) // thunk lets us dispatch() functions
);

store.subscribe(() => {
    const profile = store.getState().auth.profile;
    const access_token = localStorage.getItem('ACCESS_TOKEN');
    const refresh_token = localStorage.getItem('REFRESH_TOKEN');
    if (profile && !access_token && !refresh_token) {
        localStorage.setItem('ACCESS_TOKEN', store.getState().auth.access_token);
        localStorage.setItem('REFRESH_TOKEN', store.getState().auth.refresh_token);
    }
});

class Root extends Component {
    render() {
        return (
            <Provider store={store}>
                <Router>
                    <Switch>
                        <Route exact path="/" component={App} />
                        <Route path="/u/:accessToken/:refreshToken" component={Login} />
                    </Switch>
                </Router>
            </Provider>
        );
    }
}

ReactDOM.render(<Root />, document.getElementById('root'));
unregister();
