import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { DynamoDB, S3 } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { PostRepository, Post } from "/opt/nodejs/postRepository";
import { v4 as uuid } from "uuid";

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

    const params: S3.PutObjectRequest = {
      Body: Buffer.from(post.image, "base64"),
      Bucket: galleryBucketName,
      Key: uuid(),
      ContentType: mimeType,
    };

    const { Key, Location } = await s3Client.upload(params).promise();

    const postToCreate: Omit<Post, "image"> = {
      id: uuid(),
      title: post.title,
      author: post.author,
      description: post.description,
      locale: post.locale,
      urlImage: Location,
      keyImage: Key,
      datePost: post.datePost,
      createdAt: new Date().toISOString(),
    };

    await postRepository.createPost(postToCreate);

    return {
      statusCode: 200,
      body: JSON.stringify({
        statusCode: 204,
        body: postToCreate,
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
