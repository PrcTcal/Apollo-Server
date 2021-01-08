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
        }
    }
};

export default resolvers;