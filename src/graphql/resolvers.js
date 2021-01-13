import movies from '../database/movies';
import context from './connector'

const resolvers = {
    Query: {
        movies: () => movies,
        movie: (_, {id}) => {
            return movies.filter(movie => movie.id === id)[0];
        },
        // people 전체 조회
        people: () => {
            const pp = new context.People();
            return pp.findPeople();
        },
        // people 이름으로 조회
        person: (_, {name}) => {
            const ps = new context.People();
            return ps.findPerson(name);
        },
        // pages 조회
        pages: (_, {srchType, srchWord, pnum, sname, sage, saddr}) => {
            const pages = new context.Pages();
            return pages.retrieveData(srchType, srchWord, pnum, sname, sage, saddr);
        },
        music: (_, {pnum}) => {
            const music = new context.Music();
            return music.findMusic(pnum);
        },
        sdkMusic: () => {
            const music = new context.Music();
            return music.sdkMusic();
        }
    },
    Mutation: {
        addMovie: (_, {name, rating}) => {
            if(movies.find(movie => movie.name === name)) return null;

            const newMovie = {
                id : movies.length + 1,
                name,
                rating
            };
            movies.push(newMovie);
            return newMovie;
        },
        addPerson: (_, {name, age, score, skills}) => {
            const person = new context.People();
            return person.addPerson(name, age, score, skills);
        },
        updateAge: (_, {name, age}) => {
            const person = new context.People();
            return person.updateAge(name, age);
        },
        removePerson: (_, {name}) => {
            const person = new context.People();
            return person.removePerson(name);
        },
        addMusic: (_, {artist, song}) => {
            const music = new context.Music();
            return music.addMusic(artist, song);
        },
        updateMusic: (_, {artist, song, title}) => {
            const music = new context.Music();
            return music.updateMusic(artist, song, title);
        },
        deleteMusic: (_, {artist, song}) => {
            const music = new context.Music();
            return music.deleteMusic(artist, song);
        },
        addSdkMusic: (_, {artist, song}) => {
            const music = new context.Music();
            return music.addSdkMusic(artist, song);
        },
        updateSdkMusic: (_, {artist, song, title}) => {
            const music = new context.Music();
            return music.updateSdkMusic(artist, song, title);
        },
        deleteSdkMusic: (_, {artist, song}) => {
            const music = new context.Music();
            return music.deleteSdkMusic(artist, song);
        }
    }
};

export default resolvers;