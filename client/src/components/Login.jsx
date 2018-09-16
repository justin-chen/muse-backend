import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';

class Login extends Component {
    componentDidMount() {
        const { accessToken, refreshToken } = this.props.match.params;
        this.props.authenticateUser(accessToken, refreshToken);
    }

    render() {
        return <Redirect to="/" />;
    }
}

export default Login;
