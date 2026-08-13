import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const region = process.env.AWS_REGION || process.env.MY_AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.MY_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.MY_AWS_SECRET_ACCESS_KEY;

const credentials = accessKeyId && secretAccessKey
  ? {
      accessKeyId,
      secretAccessKey,
    }
  : undefined;

// Create an S3 client instance
export const s3Client = new S3Client({
  region,
  credentials,
});

// Create a DynamoDB client instance
const dynamoClient = new DynamoDBClient({
  region,
  credentials,
});

// Create a DocumentClient for easier interactions with DynamoDB (marshall/unmarshall)
export const docClient = DynamoDBDocumentClient.from(dynamoClient);
