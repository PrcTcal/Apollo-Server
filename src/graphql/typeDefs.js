import {gql} from 'apollo-server';

/*
*   정의 내용
*   객체 : mongoDB에 있는 collection 매핑
*   Query : Read
*   Mutation : Create, Update, Delete
*/
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

    type Pages{
        name : String!
        age : Int!
        addr : String!
    }

    type Music{
        id: String!
        Artist: String!
        songTitle: String!
    }

    type Query{
        movies:[Movie!]!
        movie(id:Int!):Movie

        people:[People!]!
        person(name:String!):People

        music(pnum:Int!):[Music]

        pages(srchType:String, srchWord:String, pnum:Int!, sname:Int, sage:Int, saddr:Int):[Pages!]!
    }

    type Mutation{
        addMovie(name: String!, rating: Int!) : Movie!
        addPerson(name: String!, age: Int!, score: Int, skills: [String]) : People!
        updateAge(name: String!, age: Int!) : People!
        removePerson(name:String!):People!

        addMusic(artist:String!, song:String!): Boolean!
        updateMusic(artist:String!, song:String!, title:String!): Boolean!
        deleteMusic(artist:String!, song:String!): Boolean!
    }
`;

export default typeDefs;