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
        searchMusic: (_, {id, stype, dir, page, Artist, songTitle}) => {
            return inter.searchMusic(id, stype, dir, page, Artist, songTitle);
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
            return inter.deleteMusic(id);
        }
    }
};

export default resolvers;