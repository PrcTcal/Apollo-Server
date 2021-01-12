import { ApolloServer } from 'apollo-server';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typeDefs';
const Mongoose = require('mongoose');
import Connectors from './graphql/connector';
const config = require('./config/config.js');
const dynamoose = require('dynamoose');
var AWS = require("aws-sdk");
var uuid = require("uuid");

// MongoDB 연결
Mongoose.connect('mongodb://admin:password@localhost:27017/admin', { dbName: "mg_tutorial", useNewUrlParser: true, useUnifiedTopology: true})
.then(() => console.log('Successfully connected to MongoDB'))
.catch(e => console.error(e));

// ApolloServer 인스턴스 생성
const server = new ApolloServer({
    typeDefs,
    resolvers,
    Connectors
});

Mongoose.Promise = global.Promise;

//AWS 연결 세팅
//AWS.config.update(config.aws_remote_config);
/*
AWS.config.getCredentials(function(err) {
    if (err) console.log(err.stack);
    // credentials not loaded
    else {
      console.log("Access key:", AWS.config.credentials.accessKeyId);
    }
  });
*/

// Create the DynamoDB service object
//var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
var ddb = new dynamoose.aws.sdk.DynamoDB(config.aws_remote_config);

// Dynamoose 연결 세팅
dynamoose.aws.ddb.set(ddb);

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
var docClient = new AWS.DynamoDB.DocumentClient();

// DynamoDB scan용 파라메터
// 테이블 명만 명시해준다.
var params = {
  TableName: config.aws_table_name
};

// Call DynamoDB to read the item from the table
docClient.scan(params, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success : ", data);
  }
});
*/

// ApolloServer 실행
server.listen().then(({url}) =>{
    console.log(`server is ready at ${url}`);
});