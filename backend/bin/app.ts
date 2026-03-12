import * as cdk from "aws-cdk-lib";
import { RevsearchStack } from "../lib/revsearch-stack";

const app = new cdk.App();
new RevsearchStack(app, "RevsearchStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
});
