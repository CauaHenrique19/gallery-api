import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import * as AWSXRay from "aws-xray-sdk";
import { DynamoDB, S3 } from "aws-sdk";
import { Post, PostRepository } from "/opt/nodejs/postRepository";

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
    const post = JSON.parse(event.body!) as Post & { password: string };

    //compare password
    if (post.password !== galleryPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          statusCode: 400,
          message: "Senha Inválida",
        }),
        headers,
      };
    }

    if (post.image) {
      const signatures: { [key: string]: string } = {
        iVBORw0KGgo: "image/png",
        "/9j/": "image/jpg",
      };

      let mimeType = "image/png";

      for (const signature in signatures) {
        if (post.image.indexOf(signature) === 0) {
          mimeType = signatures[signature];
        }
      }

      await s3Client
        .putObject({
          Bucket: galleryBucketName,
          Key: post.keyImage,
          Body: Buffer.from(post.image, "base64"),
          ContentType: mimeType,
        })
        .promise();
    }

    const updatedPost = await postRepository.updatePost(post);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "ok",
        post: updatedPost,
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
        error: (<Error>error).message,
      }),
      headers,
    };
  }
}
