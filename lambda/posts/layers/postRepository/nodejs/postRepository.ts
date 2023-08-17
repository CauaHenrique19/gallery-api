import { DocumentClient } from "aws-sdk/clients/dynamodb";

export interface Post {
  id: string;
  title: string;
  keyImage: string;
  urlImage: string;
  datePost: string;
  createdAt: string;
  author: string;
  locale: string;
  description: string;
  image: string;
}

export class PostRepository {
  constructor(private ddbClient: DocumentClient, private tableName: string) {}

  async getPosts(): Promise<Post[]> {
    const posts = await this.ddbClient
      .scan({
        TableName: this.tableName,
      })
      .promise();

    return posts.Items as Post[];
  }

  async getPost(id: string): Promise<Post | undefined> {
    const posts = await this.ddbClient
      .query({
        TableName: this.tableName,
        KeyConditionExpression: "id = :i",
        ExpressionAttributeValues: {
          ":i": id,
        },
      })
      .promise();

    return posts.Items![0] as Post | undefined;
  }

  async createPost(post: Omit<Post, "image">): Promise<void> {
    await this.ddbClient
      .put({
        Item: post,
        TableName: this.tableName,
      })
      .promise();
  }

  async updatePost(post: Omit<Post, "image">): Promise<Post> {
    const result = await this.ddbClient
      .update({
        Key: {
          id: post.id,
          createdAt: post.createdAt,
        },
        TableName: this.tableName,
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "UPDATED_NEW",
        UpdateExpression:
          "set title = :t, urlImage = :u, author = :a, locale = :l, description = :d, datePost = :dp",
        ExpressionAttributeValues: {
          ":t": post.title,
          ":u": post.urlImage,
          ":a": post.author,
          ":l": post.locale,
          ":d": post.description,
          ":dp": post.datePost,
        },
      })
      .promise();

    result.Attributes!.id = post.id;
    return result.Attributes as Post;
  }

  async deletePost(id: string, createdAt: string): Promise<Post> {
    const result = await this.ddbClient
      .delete({
        Key: {
          id,
          createdAt,
        },
        TableName: this.tableName,
        ReturnValues: "ALL_OLD",
      })
      .promise();

    if (result.Attributes) {
      return result.Attributes as Post;
    } else {
      throw new Error("Post not found");
    }
  }
}
