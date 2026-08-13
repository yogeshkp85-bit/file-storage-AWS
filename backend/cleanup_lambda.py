import json
import logging
import boto3
import os
from datetime import datetime, timedelta

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize AWS clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Environment variables
TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME', 'CloudVaultFiles')
BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'cloudvault-storage')

def lambda_handler(event, context):
    logger.info("Starting cleanup_lambda execution.")

    try:
        table = dynamodb.Table(TABLE_NAME)

        # Calculate the date 90 days ago in ISO format
        ninety_days_ago = (datetime.utcnow() - timedelta(days=90)).isoformat()

        # We need to scan for files that are marked as deleted OR older than 90 days.
        # Since DynamoDB Scan can be expensive, in a real production environment a GSI or TTL would be better.
        # Here we perform a scan with a filter expression.
        from boto3.dynamodb.conditions import Attr, Or

        # Condition: file is marked as deleted or file upload_date is older than 90 days
        filter_expression = Or(
            Attr('status').eq('deleted'),
            Attr('upload_date').lt(ninety_days_ago)
        )

        logger.info("Scanning DynamoDB for eligible files to clean up...")
        response = table.scan(FilterExpression=filter_expression)
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = table.scan(
                FilterExpression=filter_expression,
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        logger.info(f"Found {len(items)} files to delete.")

        deleted_count = 0
        for item in items:
            file_id = item.get('file_id')
            s3_key = item.get('s3_key')

            if not file_id:
                continue

            logger.info(f"Processing deletion for file_id: {file_id}, s3_key: {s3_key}")

            try:
                # 1. Delete from S3
                if s3_key:
                    s3.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
                    logger.info(f"Successfully deleted {s3_key} from S3 bucket {BUCKET_NAME}.")

                # 2. Delete from DynamoDB
                table.delete_item(
                    Key={
                        'user_id': item.get('user_id'),
                        'file_id': file_id
                    }
                )
                logger.info(f"Successfully deleted file_id: {file_id} from DynamoDB.")

                deleted_count += 1
            except Exception as e:
                logger.error(f"Error deleting file_id: {file_id} - {str(e)}")

        logger.info(f"Cleanup completed successfully. Deleted {deleted_count} files.")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Cleanup completed successfully. Deleted {deleted_count} files.'
            })
        }

    except Exception as e:
        logger.error(f"Error during cleanup execution: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error during cleanup execution.',
                'error': str(e)
            })
        }
