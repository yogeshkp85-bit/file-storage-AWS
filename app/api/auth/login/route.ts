import { NextResponse } from 'next/server';
import { signInUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await signInUser(email, password);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 400 });
  }
}
