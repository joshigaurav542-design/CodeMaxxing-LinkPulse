import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, registerUser, findUserByEmail } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'login', email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    if (action === 'register') {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters long.' },
          { status: 400 }
        );
      }

      try {
        const newUser = registerUser(email, password, name);
        return NextResponse.json({
          success: true,
          message: 'Account created successfully! You can now log in.',
          user: newUser
        });
      } catch (err: any) {
        return NextResponse.json(
          { success: false, error: err.message || 'Registration failed.' },
          { status: 400 }
        );
      }
    }

    // Default: login - verify email and password against database
    const existing = findUserByEmail(email);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'No account found with this email address. Please switch to Register to create an account.' },
        { status: 404 }
      );
    }

    const user = authenticateUser(email, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password. Please verify your credentials and try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Login successful.',
      user
    });
  } catch (err: any) {
    console.error('Auth error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Returns demo credentials available in the database
  return NextResponse.json({
    success: true,
    demoAccounts: [
      {
        email: 'gaurav.joshi@gehu.ac.in',
        password: 'linkpulse2026',
        role: 'ADMIN',
        description: 'Default Administrator Account'
      },
      {
        email: 'team.lead@codemaxxing.dev',
        password: 'linkpulse2026',
        role: 'USER',
        description: 'Standard Team Member'
      }
    ]
  });
}
