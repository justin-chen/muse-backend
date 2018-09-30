import React, { Component } from 'react';
import { Redirect, Link } from 'react-router-dom';
import flow from '../assets/gifs/flow.gif';
import '../styles/Home.css';

class Home extends Component {
  render() {
    const { access_token, refresh_token } = this.props.auth;
    const logged_in = !!(access_token && refresh_token);
    return (
      logged_in ? 
      <Redirect to="/app" /> :
      <div className="Home fullscreen-bg">
        <div className="Home-intro">
          <div className="Home-header">
            <h1>Music Discovery</h1>
            <img src={flow} />
            <div>
              <Link className="btn login" to="/app">Continue as guest</Link>
              <input type="button" className="btn login" onClick={() => window.location.href = "/api/login"} value="Continue with Spotify" />
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Home;
