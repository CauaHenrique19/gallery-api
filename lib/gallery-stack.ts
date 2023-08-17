import * as cdk from "aws-cdk-lib";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambdaNodeJS from "aws-cdk-lib/aws-lambda-nodejs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { Construct } from "constructs";

export interface GalleryStackProps extends cdk.StackProps {
  getPostsHandler: lambdaNodeJS.NodejsFunction;
  getPostHandler: lambdaNodeJS.NodejsFunction;
  createPostHandler: lambdaNodeJS.NodejsFunction;
  updatePostHandler: lambdaNodeJS.NodejsFunction;
  deletePostHandler: lambdaNodeJS.NodejsFunction;
}

export class GalleryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GalleryStackProps) {
    super(scope, id, props);

    this.load(props);
  }

  async load(props: GalleryStackProps) {
    const logGroup = await this.createLogGroup();
    const restApi = await this.createApiGateway(logGroup);
    await this.createSubDomain(restApi);
    await this.createEndpoints(restApi, props);
  }

  async createLogGroup(): Promise<cwlogs.LogGroup> {
    const logGroup = new cwlogs.LogGroup(this, "ApiGalleryLogs", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      logGroupName: "ApiGalleryLogs",
    });
    return logGroup;
  }

  async createApiGateway(
    logGroup: cwlogs.LogGroup
  ): Promise<apigateway.RestApi> {
    const certificateArn = ssm.StringParameter.valueForStringParameter(
      this,
      "CauaHenriqueCertificateDomainArn"
    );

    const api = new apigateway.RestApi(this, "GalleryApi", {
      restApiName: "GalleryApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true,
        }),
      },
      domainName: {
        domainName: "apinossagaleria.cauahenrique.com",
        certificate: Certificate.fromCertificateArn(
          this,
          "CertificateGalleryApiGateway",
          certificateArn
        ),
      },
    });

    api.addGatewayResponse("BadRequestResponse", {
      type: apigateway.ResponseType.BAD_REQUEST_BODY,
      templates: {
        "application/json": `{"message": "$context.error.message", "description": "$context.error.validationErrorString"}`,
      },
    });

    return api;
  }

  async createSubDomain(api: apigateway.RestApi) {
    const hostedZoneId = ssm.StringParameter.valueForStringParameter(
      this,
      "CauaHenriqueHostedZoneId"
    );

    const zone = route53.PublicHostedZone.fromHostedZoneAttributes(
      this,
      "SubdomainGalleryApi",
      {
        hostedZoneId,
        zoneName: "cauahenrique.com",
      }
    );
    const target = route53.RecordTarget.fromAlias(new targets.ApiGateway(api));
    new route53.ARecord(this, "ApiNossaGaleriaRecord", {
      zone,
      target,
      recordName: "apinossagaleria",
    });
  }

  async createEndpoints(api: apigateway.RestApi, props: GalleryStackProps) {
    const getPostsIntegration = new apigateway.LambdaIntegration(
      props.getPostsHandler
    );

    const getPostIntegration = new apigateway.LambdaIntegration(
      props.getPostHandler
    );

    const createPostIntegration = new apigateway.LambdaIntegration(
      props.createPostHandler
    );

    const createPostValidator = new apigateway.RequestValidator(
      this,
      "CreatePostValidator",
      {
        restApi: api,
        requestValidatorName: "CreatePostValidator",
        validateRequestBody: true,
      }
    );

    const createPostModel = new apigateway.Model(this, "CreatePostModel", {
      restApi: api,
      modelName: "CreatePostModel",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          title: {
            type: apigateway.JsonSchemaType.STRING,
          },
          author: {
            type: apigateway.JsonSchemaType.STRING,
          },
          description: {
            type: apigateway.JsonSchemaType.STRING,
          },
          locale: {
            type: apigateway.JsonSchemaType.STRING,
          },
          datePost: {
            type: apigateway.JsonSchemaType.STRING,
          },
          image: {
            type: apigateway.JsonSchemaType.STRING,
          },
          password: {
            type: apigateway.JsonSchemaType.STRING,
          },
        },
        required: [
          "title",
          "author",
          "description",
          "locale",
          "datePost",
          "image",
          "password",
        ],
      },
    });

    const updatePostIntegration = new apigateway.LambdaIntegration(
      props.updatePostHandler
    );

    const updatePostValidator = new apigateway.RequestValidator(
      this,
      "UpdatePostValidator",
      {
        restApi: api,
        requestValidatorName: "UpdatePostValidator",
        validateRequestBody: true,
      }
    );

    const updatePostModel = new apigateway.Model(this, "UpdatePostModel", {
      restApi: api,
      modelName: "UpdatePostModel",
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          title: {
            type: apigateway.JsonSchemaType.STRING,
          },
          author: {
            type: apigateway.JsonSchemaType.STRING,
          },
          description: {
            type: apigateway.JsonSchemaType.STRING,
          },
          locale: {
            type: apigateway.JsonSchemaType.STRING,
          },
          datePost: {
            type: apigateway.JsonSchemaType.STRING,
          },
          image: {
            type: [
              apigateway.JsonSchemaType.STRING,
              apigateway.JsonSchemaType.NULL,
            ],
          },
          createdAt: {
            type: apigateway.JsonSchemaType.STRING,
          },
          password: {
            type: apigateway.JsonSchemaType.STRING,
          },
        },
        required: [
          "title",
          "author",
          "description",
          "locale",
          "datePost",
          "createdAt",
          "password",
        ],
      },
    });

    const deletePostIntegration = new apigateway.LambdaIntegration(
      props.deletePostHandler
    );

    const deletePostModel = new apigateway.Model(this, "DeletePostModel", {
      restApi: api,
      schema: {
        type: apigateway.JsonSchemaType.OBJECT,
        properties: {
          createdAt: {
            type: apigateway.JsonSchemaType.STRING,
          },
          password: {
            type: apigateway.JsonSchemaType.STRING,
          },
        },
        required: ["createdAt", "password"],
      },
    });

    const deletePostValidator = new apigateway.RequestValidator(
      this,
      "DeletePostValidator",
      {
        restApi: api,
        requestValidatorName: "DeletePostValidator",
        validateRequestParameters: true,
        validateRequestBody: true,
      }
    );

    const postsResource = api.root.addResource("posts");
    postsResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowHeaders: ["*"],
      allowMethods: ["*"],
    });
    postsResource.addMethod("GET", getPostsIntegration);

    postsResource.addMethod("POST", createPostIntegration, {
      requestValidator: createPostValidator,
      requestModels: { "application/json": createPostModel },
    });

    const postIdResource = postsResource.addResource("{id}");
    postIdResource.addCorsPreflight({
      allowOrigins: ["*"],
      allowHeaders: ["*"],
      allowMethods: ["*"],
    });
    postIdResource.addMethod("GET", getPostIntegration);

    postIdResource.addMethod("PUT", updatePostIntegration, {
      requestValidator: updatePostValidator,
      requestModels: { "application/json": updatePostModel },
    });

    postIdResource.addMethod("DELETE", deletePostIntegration, {
      requestValidator: deletePostValidator,
      requestModels: { "application/json": deletePostModel },
    });
  }
}
