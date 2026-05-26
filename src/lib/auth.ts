import NextAuth, { DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { db } from './db';

declare module 'next-auth' {
  interface Session {
    credits: number;
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || '2BsvadiZ7SeO+rroR2QvwdPylRkQ+Sshvmjmyei0z1M=',
  basePath: '/auth',
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || '',
      clientSecret: process.env.AUTH_GITHUB_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const { data: existing, error } = await db
        .from('users')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();
      if (error) {
        console.error('Failed to lookup user:', error);
        return false;
      }
      if (!existing) {
        const { error: insertError } = await db
          .from('users')
          .insert({ email: user.email, credits: 1000 });
        if (insertError) {
          console.error('Failed to create user:', insertError);
          return false;
        }
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const { data: dbUser } = await db
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle();
        if (dbUser) {
          session.user.id = dbUser.id;
          session.credits = dbUser.credits;
        }
      }
      return session;
    },
  },
});
