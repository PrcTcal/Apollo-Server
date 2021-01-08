import { ApolloServer } from 'apollo-server';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
const Mongoose = require('mongoose');
import Connectors from './graphql/connector';


Mongoose.connect('mongodb://admin:password@localhost:27017/admin', { dbName: "mg_tutorial", useNewUrlParser: true, useUnifiedTopology: true})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(e => console.error(e));

const server = new ApolloServer({
    typeDefs,
    resolvers,
    Connectors
});

Mongoose.Promise = global.Promise;

server.listen().then(({url}) =>{
    console.log(`server is ready at ${url}`);
});