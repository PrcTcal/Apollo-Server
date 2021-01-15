import inter from './interface';

const resolvers = {
    Info: {
        __resolveType(obj) {
            if(obj.hometown){
                return 'Artist';
            }
            if(obj.album){
                return 'Song';
            }
            return null;
        }
    },
    Query: {
        getMusic: (_, {id, artist, song}) => {
            return inter.getMusic(id, artist, song);
        },
        searchMusic: (_, {id, stype, dir, page, artist, song}) => {
            return inter.searchMusic(id, stype, dir, page, artist, song);
        }
    },
    Mutation: {
        createMusic: (_, {artist, song}) => {
            return inter.createMusic(artist, song);
        },
        updateMusic: (_, {artist, song, title}) => {
            return inter.updateMusic(artist, song, title);
        },
        removeMusic: (_, {artist, song}) => {
            return inter.deleteMusic(artist, song);
        }
    }
};

export default resolvers;