import React, { Component } from 'react';

class Profile extends Component {
  constructor(props) {
    super(props);
    const { display_name, images } = this.props.profile;
    this.state = {
      ...this.props.profile,
      splash_message: display_name ? `Welcome, ${display_name}!` : `Welcome!`,
      image_url: images.length ? images[0].url : null,
    };
  }

  render() {
    return (
      <div>
        <h1>{this.state.splash_message}</h1>
        <h2>{this.state.email}</h2>
        {<img src={this.state.image_url} />}
      </div>
    );
  }
}

export default Profile;
