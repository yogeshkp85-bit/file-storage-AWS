import { NextResponse } from 'next/server';
import { s3Client, docClient } from '@/lib/aws';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { isLocalMode, readDb, writeDb } from '@/lib/local-db';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'cloudvault-storage';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'CloudVaultFiles';
const MOCK_USER_ID = 'user_123';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (isLocalMode()) {
      const db = readDb();
      const fileRecord = db.files.find((f: any) => f.file_id === fileId && f.user_id === MOCK_USER_ID);
      
      if (!fileRecord) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      // Serve static file from Next.js public folder
      const host = request.headers.get('host') || 'localhost:4000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const downloadUrl = `${protocol}://${host}/uploads/${fileId}-${encodeURIComponent(fileRecord.name)}`;
      
      return NextResponse.json({ downloadUrl });
    }

    // 1. Get file metadata from DynamoDB to find the S3 key
    const getDbCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: MOCK_USER_ID,
        file_id: fileId
      }
    });

    const response = await docClient.send(getDbCommand);
    const fileRecord = response.Item;

    if (!fileRecord || !fileRecord.s3_key) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // 2. Generate a Pre-signed URL for downloading from S3
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileRecord.s3_key,
      ResponseContentDisposition: `attachment; filename="${fileRecord.name}"`
    });

    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    return NextResponse.json({ downloadUrl });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate download URL' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const fileId = resolvedParams.id;

    if (isLocalMode()) {
      const db = readDb();
      const index = db.files.findIndex((f: any) => f.file_id === fileId && f.user_id === MOCK_USER_ID);
      
      if (index === -1) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }

      const fileRecord = db.files[index];
      db.files[index].status = 'deleted';
      
      db.events.push({
        id: crypto.randomUUID(),
        user: 'Jordan Davis',
        action: `deleted ${fileRecord.name}`,
        date: new Date().toISOString(),
        type: 'delete'
      });
      
      writeDb(db);
      return NextResponse.json({ success: true, message: 'File deleted' });
    }

    // First, verify it exists
    const getDbCommand = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: MOCK_USER_ID,
        file_id: fileId
      }
    });
    
    const response = await docClient.send(getDbCommand);
    if (!response.Item) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Update status to 'deleted'
    const updateCommand = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        user_id: MOCK_USER_ID,
        file_id: fileId
      },
      UpdateExpression: 'SET #status = :deletedStatus',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':deletedStatus': 'deleted'
      }
    });

    await docClient.send(updateCommand);
    
    return NextResponse.json({ success: true, message: 'File deleted' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete file' }, { status: 500 });
  }
}
