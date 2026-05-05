import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from './form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  const params = await searchParams;
  if (session.userId) redirect(params.next || '/dashboard');
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Team Tracking</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manager sign in</p>
        </div>
        <LoginForm next={params.next} />
      </div>
    </div>
  );
}
