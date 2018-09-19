import React, { Component } from 'react';
import Profile from './Profile';
import flow from '../assets/gifs/flow.gif';
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
    const { profile, access_token, refresh_token } = this.props.auth;
    return (
      <div className="App fullscreen-bg">
        <div className="App-intro">

          {profile ?
            <Profile profile={this.props.auth.profile} /> :
            !(access_token && refresh_token) ?
            <div className="App-header">
              <h1>Music Discovery</h1>
              <img src={flow} />
              <div>
                <input type="button" className="btn login" onClick={() => window.location.href = "/api/login"} value="Continue with Spotify" />
              </div>
            </div> : null
          
          }
        </div>
      </div>
    );
  }
}

export default App;
