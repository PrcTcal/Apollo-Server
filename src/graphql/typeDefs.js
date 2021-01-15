import {gql} from 'apollo-server';

/*
*   정의 내용
*   객체 : mongoDB에 있는 collection 매핑
*   Query : Read
*   Mutation : Create, Update, Delete
*/
const typeDefs = gql`
    union Info = Artist | Song

    type Artist{
        hometown:String
        birth:String
    }

    type Song{
        album:String
        release:String
    }

    enum Direction{
        ASC
        DESC
    }


    type Music{
        id: String!
        info: Info
        dir: Direction
        curPage: Int
        Artist: String
        songTitle: String
    }

    type Query{
        getMusic(id:String, artist:String, song:String):Music
        searchMusic(id:String, stype:String, dir:Direction, page:Int, artist:String, song:String):[Music]
    }

    type Mutation{
        createMusic(artist:String!, song:String!): Boolean!
        updateMusic(artist:String!, song:String!, title:String!): Boolean!
        removeMusic(artist:String!, song:String!): Boolean!
    }
`;

export default typeDefs;