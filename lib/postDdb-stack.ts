import * as cdk from "aws-cdk-lib";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class PostsDdbStack extends cdk.Stack {
  readonly postsTable: dynamo.Table;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    this.postsTable = new dynamo.Table(this, "posts", {
      tableName: "posts",
      partitionKey: {
        name: "id",
        type: dynamo.AttributeType.STRING,
      },
      sortKey: {
        name: "createdAt",
        type: dynamo.AttributeType.STRING,
      },
      readCapacity: 1,
      writeCapacity: 1,
      billingMode: dynamo.BillingMode.PROVISIONED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
