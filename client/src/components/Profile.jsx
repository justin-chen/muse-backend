import React, { Component } from 'react';

class Profile extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ...this.props.profile,
    };
  }
  render() {
    return (
      <div>
        <h1>Welcome, {this.state.display_name}.</h1>
        <img src={this.state.images.url} />
      </div>
    );
  }
}

export default Profile;
