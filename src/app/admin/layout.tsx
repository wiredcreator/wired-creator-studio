import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AdminSidebar from '@/components/AdminSidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  await dbConnect();
  const dbUser = await User.findById(session.user.id).lean();

  if (!dbUser) {
    redirect('/login?signout=1');
  }

  // Role check against DB (not JWT) so it's always up-to-date
  if (dbUser.role !== 'admin') {
    redirect('/dashboard');
  }

  const userName = dbUser.name || session.user.name || 'User';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <AdminSidebar userName={userName} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
