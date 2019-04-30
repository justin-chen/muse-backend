module.exports = {
    filterGenres: body => {
        const validGenres = new Set([
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
        ]);
        body.categories.items = body.categories.items.filter(genre => validGenres.has(genre.id));
    }
}