import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

class Login extends Component {
    constructor(props) {
        super(props);
        const { accessToken, refreshToken } = this.props.match.params;
        this.props.authenticateUser(accessToken, refreshToken);
    }

    render() {
        return this.props.profile_fetched ? <Redirect to="/app" /> : null;
    }
}

export default Login;
