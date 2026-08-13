import { NextResponse } from 'next/server';
import { signUpUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await signUpUser(email, password);
    return NextResponse.json({ success: true, userSub: result.UserSub, isConfirmed: result.UserConfirmed });
  } catch (error: any) {
    console.error('Sign up API error:', error);
    return NextResponse.json({ error: error.message || 'Sign up failed' }, { status: 400 });
  }
}
