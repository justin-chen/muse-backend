import React, { Component } from 'react';
import logo from '../assets/images/logo.svg';
import Profile from './Profile';
import '../styles/App.css';

class App extends Component {
  constructor(props) {
    super(props);
    const logged_in = Boolean(this.props.auth.access_token && this.props.auth.refresh_token);
    const profile_fetched = Boolean(this.props.auth.profile);
    if (logged_in && !profile_fetched) {
      this.props.fetchProfile(this.props.auth.access_token);
    }
  }

  render() {
    const { profile } = this.props.auth;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Music Discovery</h1>
        </header>
        <div className="App-intro">
          {profile ?
            <Profile profile={this.props.auth.profile} /> :
            <a className="btn btn-primary" href="/api/login">Log in with Spotify</a>
          }
        </div>
      </div>
    );
  }
}

export default App;
