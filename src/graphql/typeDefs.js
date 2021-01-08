import {gql} from 'apollo-server';

const typeDefs = gql`
    type Movie{
        id: Int!
        name: String!
        rating: Int!
    }

    type People{
        name : String!
        age : Int!
        score : Int
        skills : [String]
    }

    type Query{
        movies:[Movie!]!
        movie(id:Int!):Movie
        people:[People!]!
        person(name:String!):People
    }

    type Mutation{
        addMovie(name: String!, rating: Int!) : Movie!
        addPerson(name: String!, age: Int!, score: Int, skills: [String]) : People!
        updateAge(name: String!, age: Int!) : People!
        removePerson(name:String!):People!
    }
`;

export default typeDefs;