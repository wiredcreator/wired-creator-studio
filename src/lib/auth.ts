import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import authConfig from './auth.config';

// How often (in seconds) to re-check passwordChangedAt from the DB.
// Avoids a query on every single request.
const PASSWORD_CHECK_INTERVAL = 5 * 60; // 5 minutes

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // Fresh login — set token fields
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.iat = Math.floor(Date.now() / 1000);
        token.lastPasswordCheck = Math.floor(Date.now() / 1000);
        return token;
      }

      // Existing token — periodically verify password hasn't changed
      if (token.id) {
        const now = Math.floor(Date.now() / 1000);
        const lastCheck = (token.lastPasswordCheck as number) || 0;

        if (now - lastCheck >= PASSWORD_CHECK_INTERVAL) {
          try {
            await dbConnect();
            const dbUser = await User.findById(token.id)
              .select('passwordChangedAt')
              .lean();

            if (!dbUser) {
              // User was deleted
              return null;
            }

            if (dbUser.passwordChangedAt) {
              const changedAtSec = Math.floor(
                new Date(dbUser.passwordChangedAt).getTime() / 1000
              );
              if (changedAtSec > (token.iat as number)) {
                // Password changed after token was issued — invalidate
                return null;
              }
            }

            token.lastPasswordCheck = now;
          } catch {
            // DB error — don't invalidate, try again next interval
          }
        }
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
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        userId: { label: 'User ID', type: 'text' },
        magicLinkVerified: { label: 'Magic Link Verified', type: 'text' },
      },
      async authorize(credentials) {
        // Mode 1: Magic link verification (internal only)
        if (credentials.magicLinkVerified === 'true' && credentials.userId) {
          await dbConnect();
          const user = await User.findById(credentials.userId as string);
          if (!user) return null;
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        }

        // Mode 2: Password-based login
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await dbConnect();

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        });

        if (!user) {
          return null;
        }

        // Check account lockout — auto-reset if locked
        if (user.isLocked()) {
          user.loginAttempts = 0;
          user.lockUntil = undefined;
          await user.save();
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          // Increment failed attempts
          user.loginAttempts = (user.loginAttempts || 0) + 1;
          if (user.loginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
          }
          await user.save();
          return null;
        }

        // Reset failed attempts on successful login
        if (user.loginAttempts > 0 || user.lockUntil) {
          user.loginAttempts = 0;
          user.lockUntil = undefined;
          await user.save();
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
});
