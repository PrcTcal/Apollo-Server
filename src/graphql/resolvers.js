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
        getMusic: (_, {id}) => {
            return inter.getMusic(id);
        },
        searchMusic: (_, {Artist, songTitle, info, actv, idx, settings}) => {
            return inter.searchMusic(Artist, songTitle, info, actv, idx, settings);
        },
        queryMusic: (_, {Artist, songTitle, info, actv, idx, settings}) => {
            return inter.queryMusic(Artist, songTitle, info, actv, idx, settings);
        }
    },
    Mutation: {
        createMusic: (_, {Artist, songTitle, info, actv, idx}) => {
            return inter.createMusic(Artist, songTitle, info, actv, idx);
        },
        updateMusic: (_, {id, Artist, songTitle, info, actv, idx}) => {
            return inter.updateMusic(id, Artist, songTitle, info, actv, idx);
        },
        removeMusic: (_, {id}) => {
            return inter.removeMusic(id);
        }
    }
};

export default resolvers;