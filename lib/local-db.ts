import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'local-db.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure directories and file exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ files: [], events: [] }));
}

export function readDb() {
  const data = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export function isLocalMode() {
  // In production deployments (Amplify / Vercel), never fall back to local mode
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    return false;
  }
  // Otherwise check if standard or custom access key ID is set
  return !process.env.AWS_ACCESS_KEY_ID && !process.env.MY_AWS_ACCESS_KEY_ID;
}
