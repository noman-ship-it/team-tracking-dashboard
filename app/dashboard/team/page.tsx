import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listAllMembers } from '@/lib/data/members';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamMembersTable } from './members-table';
import { AddMemberForm } from './add-member-form';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const session = await getSession();
  if (session.role !== 'primary') redirect('/dashboard');

  const members = await listAllMembers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Manage team</h1>
        <p className="text-sm text-muted-foreground">Add or archive team members. Primary manager only.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Add member</CardTitle>
          </CardHeader>
          <CardContent>
            <AddMemberForm />
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>All members</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamMembersTable members={members} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
