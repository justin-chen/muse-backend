import React, { Component } from 'react';

class Profile extends Component {
  constructor(props) {
    super(props);
    const { display_name, email, images }
    this.state = {
      display_name,
      email,
      image: images.url,
    }
  }
  render() {
    return (
      <div>
        <h1>Welcome, {this.state.display_name}.</h1>
        <img src={this.state.image} />
      </div>
    );
  }
}

export default Profile;
