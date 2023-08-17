import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { PostRepository } from "/opt/nodejs/postRepository";

AWSXRay.captureAWS(require("aws-sdk"));

const postsTableName = process.env.POSTS_DDB!;

const ddbClient = new DynamoDB.DocumentClient();
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
    const id = event.pathParameters!.id as string;
    const post = await postRepository.getPost(id);
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
