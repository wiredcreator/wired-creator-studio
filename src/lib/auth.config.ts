import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Edge-compatible auth config (no Node.js-only imports like mongoose/bcrypt).
// Used by middleware. The full authorize logic lives in auth.ts.
export default {
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        magicLinkToken: { label: 'Magic Link Token', type: 'text' },
      },
      // authorize is intentionally omitted here — NextAuth will use the
      // full config in auth.ts for actual credential verification.
      // This stub is only needed so the middleware knows Credentials is a provider.
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;
