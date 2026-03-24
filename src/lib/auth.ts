import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import authConfig from './auth.config';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
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
