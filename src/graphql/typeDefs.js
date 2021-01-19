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

    enum Field{
        id
        Artist
        songTitle
        hometown
        birth
        album
        release
        actv
        idx
    }

    input infoInput{
        hometown:String
        birth:String
        album:String
        release:String
    }

    input Setting{
        stype: Field
        dir: Direction,
        page: Int,
        and: Boolean
    }

    type Music{
        id: String!
        info: Info
        actv: Boolean
        idx: Int
        Artist: String
        songTitle: String
    }

    type Query{
        getMusic(id:String!):Music
        searchMusic(id:String, Artist:String, songTitle:String, info:infoInput, actv:Boolean, idx:Int, settings:Setting):[Music]!
        queryMusic(id:String!, Artist:String, songTitle:String, info:infoInput, actv:Boolean, idx:Int, settings:Setting):[Music]!
    }

    type Mutation{
        createMusic(Artist:String!, songTitle:String, info:infoInput, actv:Boolean, idx: Int): Boolean!
        updateMusic(id:String!, Artist:String, songTitle:String, info:infoInput, actv:Boolean, idx: Int): Boolean!
        removeMusic(id:String!): Boolean!
    }
`;

export default typeDefs;