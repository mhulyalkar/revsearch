import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as path from "path";

export class RevsearchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB — search history
    const searchHistoryTable = new dynamodb.Table(this, "SearchHistory", {
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "searchId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // S3 — thumbnail storage
    const thumbnailBucket = new s3.Bucket(this, "ThumbnailBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Cognito — user pool
    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
      },
    });

    // Lambda — search function
    const searchFn = new lambda.Function(this, "SearchFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "search.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/lambda")),
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        TABLE_NAME: searchHistoryTable.tableName,
        BUCKET_NAME: thumbnailBucket.bucketName,
      },
    });

    searchHistoryTable.grantReadWriteData(searchFn);
    thumbnailBucket.grantReadWrite(searchFn);

    // Lambda — history function
    const historyFn = new lambda.Function(this, "HistoryFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "history.handler",
      code: lambda.Code.fromAsset(path.join(__dirname, "../src/lambda")),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: searchHistoryTable.tableName,
      },
    });

    searchHistoryTable.grantReadWriteData(historyFn);

    // API Gateway
    const api = new apigateway.RestApi(this, "RevsearchApi", {
      restApiName: "RevSearch API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });

    const searchResource = api.root.addResource("search");
    searchResource.addMethod("POST", new apigateway.LambdaIntegration(searchFn));

    const historyResource = api.root.addResource("history");
    historyResource.addMethod("GET", new apigateway.LambdaIntegration(historyFn));
    historyResource.addMethod("DELETE", new apigateway.LambdaIntegration(historyFn));

    // Dashboard — S3 + CloudFront
    const dashboardBucket = new s3.Bucket(this, "DashboardBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const distribution = new cloudfront.Distribution(this, "DashboardDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(dashboardBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
    });

    new s3deploy.BucketDeployment(this, "DashboardDeployment", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../dashboard/dist"))],
      destinationBucket: dashboardBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", { value: api.url });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "DashboardUrl", { value: `https://${distribution.distributionDomainName}` });
  }
}
