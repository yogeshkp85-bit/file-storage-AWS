import { NextResponse } from 'next/server';
import { isLocalMode, readDb } from '@/lib/local-db';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '@/lib/aws';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'CloudVaultFiles';

export async function GET() {
  try {
    let files: any[] = [];
    let events: any[] = [];

    if (isLocalMode()) {
      const db = readDb();
      files = db.files.filter((f: any) => f.status !== 'deleted');
      events = db.events || [];
    } else {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '#status <> :deletedStatus',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':deletedStatus': 'deleted' }
      });
      const response = await docClient.send(command);
      files = response.Items || [];
      // Note: In real AWS scenario, events would come from another table or CloudWatch
      events = []; 
    }

    // Calculate total storage
    const totalBytes = files.reduce((acc, file) => acc + (Number(file.size_bytes) || 0), 0);
    const totalStorageGb = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
    
    // Group storage by type
    const storageByType = files.reduce((acc, file) => {
      acc[file.type] = (acc[file.type] || 0) + (Number(file.size_bytes) || 0);
      return acc;
    }, {} as Record<string, number>);

    // Total backups
    const totalBackups = files.length;
    
    // Unique active users (mocked from distinct user_ids)
    const activeUsers = new Set(files.map(f => f.user_id)).size;

    // Recent activity (latest 5 events or mock from uploads)
    let recentActivity = events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(e => `${e.user} ${e.action}`);
      
    if (recentActivity.length === 0 && files.length > 0) {
      // Fallback to generating events from recent uploads if no event log
      recentActivity = files
        .sort((a, b) => new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime())
        .slice(0, 5)
        .map(f => `User ${f.user_id} uploaded ${f.name}`);
    }

    return NextResponse.json({
      totalStorageGb,
      totalBytes,
      totalBackups,
      activeUsers: activeUsers === 0 ? 1 : activeUsers, // At least 1 (the current user)
      storageByType,
      recentActivity
    });

  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch admin stats' }, { status: 500 });
  }
}
