import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

class App extends Component {
    constructor(props) {
        super(props);
        const { profile, access_token, refresh_token } = this.props.auth;
        const logged_in = !!(access_token && refresh_token);
        if (!profile && logged_in) {
            this.props.fetchProfile(access_token);
        }
    }

    render() {
        const { profile } = this.props.auth;
        return profile ? 'User' : 'Guest';
    }
}

export default App;
