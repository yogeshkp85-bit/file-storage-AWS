import { NextResponse } from 'next/server';
import { s3Client, docClient } from '@/lib/aws';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { isLocalMode, readDb, writeDb } from '@/lib/local-db';
import { verifyToken } from '@/lib/auth';

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'cloudvault-storage';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'CloudVaultFiles';

// Helper to extract user ID from auth token or fallback to local user ID
async function getUserId(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const user = await verifyToken(authHeader);
    if (user) return user.userId;
  }
  return 'user_123';
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId(request);

    if (isLocalMode()) {
      const db = readDb();
      const files = db.files
        .filter((f: any) => f.user_id === userId && f.status !== 'deleted')
        .sort((a: any, b: any) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime());
      return NextResponse.json(files);
    }

    // Query DynamoDB for files belonging to the authenticated user
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'user_id = :userId AND #status <> :deletedStatus',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':deletedStatus': 'deleted'
      },
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    });

    const response = await docClient.send(command);
    
    // Sort by upload_date descending (newest first)
    const files = (response.Items || []).sort((a, b) => {
      return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
    });

    return NextResponse.json(files);
  } catch (error: any) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId(request);
    const { name, type, size, file_id } = await request.json();

    if (!name || !size || !file_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const s3Key = `${userId}/${file_id}/${name}`;
    const dateStr = new Date().toISOString();
    
    // Determine internal type string based on extension or mime type
    let fileType: 'document' | 'image' | 'spreadsheet' | 'archive' = 'document';
    if (name.endsWith('.zip') || name.endsWith('.rar')) fileType = 'archive';
    else if (name.endsWith('.xlsx') || name.endsWith('.csv')) fileType = 'spreadsheet';
    else if (name.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null) fileType = 'image';

    const fileRecord = {
      user_id: userId,
      file_id,
      name,
      s3_key: s3Key,
      type: fileType,
      size: formatBytes(size),
      size_bytes: size,
      upload_date: dateStr,
      status: 'Completed', 
    };

    let uploadUrl = '';

    if (isLocalMode()) {
      const db = readDb();
      db.files.push(fileRecord);
      // Log event
      db.events.push({
        id: crypto.randomUUID(),
        user: 'Jordan Davis',
        action: `uploaded ${name}`,
        date: dateStr,
        type: 'upload'
      });
      writeDb(db);
      
      const host = request.headers.get('host') || 'localhost:4000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      uploadUrl = `${protocol}://${host}/api/files/local-upload?file_id=${file_id}&name=${encodeURIComponent(name)}`;
    } else {
      // 1. Generate Pre-signed URL for S3 Upload
      const putCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ContentType: type || 'application/octet-stream',
      });
      uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 });

      // 2. Save metadata to DynamoDB
      const putDbCommand = new PutCommand({
        TableName: TABLE_NAME,
        Item: fileRecord,
      });
      await docClient.send(putDbCommand);
    }

    return NextResponse.json({ 
      uploadUrl, 
      file: {
        id: file_id,
        name: fileRecord.name,
        type: fileRecord.type,
        size: fileRecord.size,
        date: 'Just now', // for the UI
        status: fileRecord.status
      } 
    });
  } catch (error: any) {
    console.error('Error initiating upload:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate upload' }, { status: 500 });
  }
}

// Helper to format bytes similar to the UI
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
