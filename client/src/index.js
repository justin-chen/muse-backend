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
