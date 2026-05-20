import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || 'placeholder',
      clientSecret: process.env.AUTH_GITHUB_SECRET || 'placeholder',
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const { data: existing } = await db
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
      if (!existing) {
        await db.from('users').insert({ email: user.email, credits: 1000 });
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const { data: dbUser } = await db
          .from('users')
          .select('*')
          .eq('email', session.user.email)
          .single();
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session as any).credits = dbUser.credits;
        }
      }
      return session;
    },
  },
});
