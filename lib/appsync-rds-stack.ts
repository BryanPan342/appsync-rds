import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as rds from '@aws-cdk/aws-rds';
import * as ec2 from '@aws-cdk/aws-ec2';
import {resolve} from 'path';

export class AppsyncRdsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const api = new appsync.GraphqlApi(this, 'MyApi', {
      name: 'MyApi',
      schema: appsync.Schema.fromAsset(resolve(__dirname, 'schema.graphql')),
    });
  
    // Create username and password secret for DB Cluster
    const secret = new rds.DatabaseSecret(this, 'AuroraSecret', {
      username: 'clusteradmin',
    });

    // The VPC to place the cluster in
    const vpc = new ec2.Vpc(this, 'AuroraVpc');

    // Create the serverless cluster, provide all values needed to customise the database.
    const cluster = new rds.ServerlessCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.AURORA_MYSQL,
      vpc,
      credentials: { username: 'clusteradmin' },
      clusterIdentifier: 'db-endpoint-test',
      defaultDatabaseName: 'demos',
    });

    // Build a data source for AppSync to access the database.
    const rdsDS = api.addRdsDataSource('rds', cluster, secret, 'demos');

    // Set up a resolver for an RDS query.
    rdsDS.createResolver({
      typeName: 'Query',
      fieldName: 'getDemos',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      {
        "version": "2018-05-29",
        "statements": [
          "SELECT * FROM demos"
        ]
      }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $utils.toJson($utils.rds.toJsonObject($ctx.result)[0])
      `),
    });

    // Set up a resolver for an RDS mutation.
    rdsDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'addDemo',
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
      {
        "version": "2018-05-29",
        "statements": [
          "INSERT INTO demos VALUES (:id, :version)",
          "SELECT * WHERE id = :id"
        ],
        "variableMap": {
          ":id": $util.toJson($util.autoId()),
          ":version": $util.toJson($ctx.args.version)
        }
      }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString(`
        $utils.toJson($utils.rds.toJsonObject($ctx.result)[1][0])
      `),
    });
  }
}
