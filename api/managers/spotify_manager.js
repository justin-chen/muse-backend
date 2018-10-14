module.exports = {
    filterGenres: body => {
        const validGenres = new Set([
            'pop',
            'hiphop',
            'workout',
            'afro',
            'country',
            'focus',
            'latin',
            'chill',
            'edm_dance',
            'rnb', // r&b
            'rock',
            'indie_alt', // indie
            'roots', // folk & acoustic
            'party',
            'sleep',
            'classical',
            'jazz',
            'desi',
            'inspirational', // christian
            'kpop',
            'reggae',
            'metal',
            'soul',
            'blue',
            'punk',
            'funk',
            'holidays',
        ]);
        body.categories.items = body.categories.items.filter(genre => validGenres.has(genre.id));
    }
}