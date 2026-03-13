import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'coach' | 'admin';
}

/**
 * Get the authenticated user from the NextAuth session.
 * Returns the user object if authenticated, or a NextResponse 401 error.
 *
 * Usage:
 *   const result = await getAuthenticatedUser();
 *   if (result instanceof NextResponse) return result; // 401
 *   const user = result; // AuthenticatedUser
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | NextResponse> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
