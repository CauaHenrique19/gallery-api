import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { DynamoDB, S3 } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { PostRepository } from "/opt/nodejs/postRepository";

AWSXRay.captureAWS(require("aws-sdk"));

const postsTableName = process.env.POSTS_DDB!;
const galleryBucketName = process.env.GALLERY_BUCKET!;
const galleryPassword = process.env.GALLERY_PASSWORD!;

const ddbClient = new DynamoDB.DocumentClient();
const s3Client = new S3();

const postRepository = new PostRepository(ddbClient, postsTableName);

const headers = {
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
};

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;

  console.log(
    `API Gateway RequestId: ${apiRequestId} - LambdaRequestId: ${lambdaRequestId}`
  );

  try {
    const id = event.pathParameters!.id!;
    const { password, createdAt } = JSON.parse(event.body!) as {
      createdAt: string;
      password: string;
    };

    //compare password
    if (password !== galleryPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          statusCode: 400,
          message: "Senha Inválida",
        }),
        headers,
      };
    }

    const post = await postRepository.deletePost(id, createdAt);

    await s3Client
      .deleteObject({
        Bucket: galleryBucketName,
        Key: post.keyImage,
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        statusCode: 200,
        post,
      }),
      headers,
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        statusCode: 500,
        message: "Internal Server Error",
        error: error,
      }),
      headers,
    };
  }
}
