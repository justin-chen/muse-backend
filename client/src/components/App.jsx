import React, { Component } from 'react';
import logo from '../assets/images/logo.svg';
import Profile from './Profile';
import '../styles/App.css';

class App extends Component {
  render() {
    const logged_in = Object.keys(this.props.auth).length !== 0;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Music Discovery</h1>
        </header>
        <div className="App-intro">
          {logged_in ?
            <Profile profile={this.props.auth.profile} /> :
            <a className="btn btn-primary" href="/api/login">Log in with Spotify</a>
          }
        </div>
      </div>
    );
  }
}

export default App;
