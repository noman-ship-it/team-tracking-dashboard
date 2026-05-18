import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogoutButton } from './logout-button';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const role = session.role!;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="container flex h-16 items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 text-xs font-bold text-white">
              T
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">TeamPulse</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/dashboard/team">Team</NavLink>
            <NavLink href="/dashboard/designs">Designs</NavLink>
            <NavLink href="/dashboard/reports">Reports</NavLink>
            {role === 'primary' && <NavLink href="/dashboard/manage">Manage</NavLink>}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/dashboard/settings"
              className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline"
            >
              {session.name} · {role}
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container flex-1 py-8">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </Link>
  );
}
