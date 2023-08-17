import * as cdk from "aws-cdk-lib";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as dynamo from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface PostsStackProps extends cdk.StackProps {
  postsDdb: dynamo.Table;
  galleryBucket: s3.Bucket;
}

export class PostsStack extends cdk.Stack {
  getPostsHandler: lambdaNodeJS.NodejsFunction;
  getPostHandler: lambdaNodeJS.NodejsFunction;
  createPostHandler: lambdaNodeJS.NodejsFunction;
  updatePostHandler: lambdaNodeJS.NodejsFunction;
  deletePostHandler: lambdaNodeJS.NodejsFunction;

  constructor(scope: Construct, id: string, props: PostsStackProps) {
    super(scope, id, props);

    const postRepositoryLayer = this.createLayer(
      "PostRepositoryLayer",
      "PostRepositoryLayer",
      "lambda/posts/layers/postRepository"
    );

    this.createStringParameter(
      "PostRepositoryLayerVersionArn",
      "PostRepositoryLayerVersionArn",
      postRepositoryLayer.layerVersionArn
    );

    const galleryPassword = ssm.StringParameter.valueForStringParameter(
      this,
      "GalleryPassword"
    );

    const environment = {
      POSTS_DDB: props.postsDdb.tableName,
      GALLERY_BUCKET: props.galleryBucket.bucketName,
      GALLERY_PASSWORD: galleryPassword,
    };

    this.getPostsHandler = this.createLambda(
      "GetPostsHandler",
      "GetPostsHandler",
      "lambda/posts/getPostsHandler.ts",
      [postRepositoryLayer],
      environment
    );

    this.getPostHandler = this.createLambda(
      "GetPostHandler",
      "GetPostHandler",
      "lambda/posts/getPostHandler.ts",
      [postRepositoryLayer],
      environment
    );

    this.createPostHandler = this.createLambda(
      "CreatePostHandler",
      "CreatePostHandler",
      "lambda/posts/createPostHandler.ts",
      [postRepositoryLayer],
      environment
    );

    this.updatePostHandler = this.createLambda(
      "UpdatePostHandler",
      "UpdatePostHandler",
      "lambda/posts/updatePostHandler.ts",
      [postRepositoryLayer],
      environment
    );

    this.deletePostHandler = this.createLambda(
      "DeletePostHandler",
      "DeletePostHandler",
      "lambda/posts/deletePostHandler.ts",
      [postRepositoryLayer],
      environment
    );

    const policyToScan = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:Scan"],
      resources: [props.postsDdb.tableArn],
    });

    const policyToQuery = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:Query"],
      resources: [props.postsDdb.tableArn],
    });

    const policyToCreateItem = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:PutItem"],
      resources: [props.postsDdb.tableArn],
    });

    const policyToUpdateItem = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:UpdateItem"],
      resources: [props.postsDdb.tableArn],
    });

    const policyToDeleteItem = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["dynamodb:DeleteItem"],
      resources: [props.postsDdb.tableArn],
    });

    this.getPostsHandler.addToRolePolicy(policyToScan);
    this.getPostHandler.addToRolePolicy(policyToQuery);

    this.createPostHandler.addToRolePolicy(policyToCreateItem);
    props.galleryBucket.grantReadWrite(this.createPostHandler);

    this.updatePostHandler.addToRolePolicy(policyToUpdateItem);
    props.galleryBucket.grantReadWrite(this.updatePostHandler);

    this.deletePostHandler.addToRolePolicy(policyToDeleteItem);
    props.galleryBucket.grantDelete(this.deletePostHandler);
  }

  createLambda(
    id: string,
    functionName: string,
    entry: string,
    layers?: lambda.LayerVersion[],
    environment?: { [key: string]: any }
  ): lambdaNodeJS.NodejsFunction {
    return new lambdaNodeJS.NodejsFunction(this, id, {
      functionName,
      entry,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      bundling: {
        minify: false,
        sourceMap: false,
      },
      environment,
      layers,
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      runtime: lambda.Runtime.NODEJS_14_X,
    });
  }

  createLayer(id: string, name: string, pathCode: string): lambda.LayerVersion {
    return new lambda.LayerVersion(this, id, {
      code: lambda.Code.fromAsset(pathCode),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
      layerVersionName: name,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }

  createStringParameter(
    id: string,
    name: string,
    value: string
  ): ssm.StringParameter {
    return new ssm.StringParameter(this, id, {
      parameterName: name,
      stringValue: value,
    });
  }
}
