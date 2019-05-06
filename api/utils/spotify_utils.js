// helper functions
module.exports = {
  getCategories: () => ([
    'pop',
    'hiphop',
    'country',
    'rnb',
    'workout',
    'edm_dance',
    'party',
    'chill',
    'rock',
    'indie_alt',
    'roots',
    'focus',
    'sleep',
    'jazz',
    'classical',
    'romance',
    'kpop',
    'metal',
    'soul',
    'punk',
    'blues',
    'funk'
  ]),

  generateRandomString: length => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  },
  filterGenres: body => {
    const validGenres = new Set(getCategories());
    body.categories.items = body.categories.items.filter(genre => validGenres.has(genre.id));
  }
}