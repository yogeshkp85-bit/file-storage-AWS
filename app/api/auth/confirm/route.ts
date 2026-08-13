import { NextResponse } from 'next/server';
import { confirmSignUpUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    await confirmSignUpUser(email, code);
    return NextResponse.json({ success: true, message: 'Email confirmed successfully' });
  } catch (error: any) {
    console.error('Confirmation API error:', error);
    return NextResponse.json({ error: error.message || 'Confirmation failed' }, { status: 400 });
  }
}
