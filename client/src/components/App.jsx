import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import '../styles/App.css';

class App extends Component {
    constructor(props) {
        super(props);
        const { profile, access_token, refresh_token } = this.props.auth;
        const logged_in = !!(access_token && refresh_token);
        if (!profile && logged_in) {
            this.props.fetchProfile(access_token);
        }
        this.props.fetchGenres();
    }

    displayGenreSelection = genres => {
        let genresFormatted = [];
        let genreRow = [];
        const genreItems = genres.map(genre => {
            return <img src={genre.icons[0].url} />
        });

        for (let i = 0; i < genreItems.length; i++) {
            if (i % 3 === 0 && i !== 0) {
                genresFormatted.push(<tr>{genreRow}</tr>);
                genreRow = [];
            }
            genreRow.push(<td>{genreItems[i]}</td>);
        }

        if (genreRow.length) {
            genresFormatted.push(genreRow);
        }
        return genresFormatted;
    }

    render() {
        console.log(this.props.app);
        return (
            <div className="App">
                <h1>Hello</h1>
                {this.props.app.genres ?
                    <table>{this.displayGenreSelection(this.props.app.genres.categories.items)}</table> : null
                }
            </div>
        );
    }
}

export default App;
