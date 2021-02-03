import { ApolloServer } from 'apollo-server';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
const Mongoose = require('mongoose');
import Connectors from './graphql/connector';
import dynaConn from './graphql/dynaconnector';
import sdkConn from './graphql/sdkconnector';
import mongoConn from './graphql/mongoconnector';
const config = require('./config/config.js');
const dynamoose = require('dynamoose');
var AWS = require("aws-sdk");

if(config.db_select == 'mongo'){

    // MongoDB 연결
    Mongoose.connect(config.mongo_local_config, config.mongo_config)
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch(e => console.error(e));
    Mongoose.Promise = global.Promise;
    console.log('DB : MongoDB');

} else if(config.db_select == 'dynamo'){
    if(config.db_mapper == 'aws_sdk'){

        //AWS_SDK 연결 세팅
        AWS.config.update(config.aws_remote_config);
        // Create the DynamoDB service object
        var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
        console.log('DB : DynamoDB - AWS_SDK');

    } else if(config.db_mapper == 'dynamoose'){

        // Dynamoose 연결 세팅
        var ddb = new dynamoose.aws.sdk.DynamoDB(config.aws_remote_config);
        dynamoose.aws.ddb.set(ddb);
        console.log('DB : DynamoDB - Dynamoose');

    }
} else if(config.db_select == 'all'){
    // MongoDB 연결
    Mongoose.connect(config.mongo_local_config, config.mongo_config)
    .then(() => console.log('Successfully connected to MongoDB'))
    .catch(e => console.error(e));
    Mongoose.Promise = global.Promise;
    console.log('DB : MongoDB');

    //AWS_SDK 연결 세팅
    AWS.config.update(config.aws_remote_config);
    // Create the DynamoDB service object
    var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    console.log('DB : DynamoDB - AWS_SDK');
}

// ApolloServer 인스턴스 생성
const server = new ApolloServer({
    typeDefs,
    resolvers,
    dynaConn,
    sdkConn,
    mongoConn
});

// ApolloServer 실행
server.listen().then(({url}) =>{
  console.log(`server is ready at ${url}`);
});

/* Call DynamoDB to retrieve the list of tables
ddb.listTables({}, function(err, data) {
    if (err) {
      console.log("Error", err.code);
    } else {
      console.log("Table names are ", data.TableNames);
    }
  });
*/

/*

AWS.config.getCredentials(function(err) {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
      console.log("Access key:", AWS.config.credentials.accessKeyId);
    }
  });

*/