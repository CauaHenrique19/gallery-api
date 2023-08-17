#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GalleryStack } from "../lib/gallery-stack";
import { PostsStack } from "../lib/posts-stack";
import { PostsDdbStack } from "../lib/postDdb-stack";
import { GalleryBucketStack } from "../lib/galleryBucket-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  region: "sa-east-1",
  account: process.env.CDK_DEFAULT_ACCOUNT,
};

const tags = {
  cost: "Galeria",
  team: "Cauã Henrique",
};

const galleryBucketStack = new GalleryBucketStack(app, "GalleryBucketStack", {
  env,
  tags,
});
const postsDdbStack = new PostsDdbStack(app, "PostsDdbStack", { env, tags });

const postStack = new PostsStack(app, "PostsStack", {
  env,
  tags,
  postsDdb: postsDdbStack.postsTable,
  galleryBucket: galleryBucketStack.galleryBucket,
});

postStack.addDependency(galleryBucketStack);
postStack.addDependency(postsDdbStack);

const galleryStack = new GalleryStack(app, "GalleryStack", {
  env,
  tags,
  getPostsHandler: postStack.getPostsHandler,
  getPostHandler: postStack.getPostHandler,
  createPostHandler: postStack.createPostHandler,
  updatePostHandler: postStack.updatePostHandler,
  deletePostHandler: postStack.deletePostHandler,
});

galleryStack.addDependency(postStack);
