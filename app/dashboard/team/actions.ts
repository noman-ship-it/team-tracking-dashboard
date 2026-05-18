'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { setKpiOverride } from '@/lib/data/kpi';

export async function updateKpiOverride(key: string, value: number): Promise<void> {
  const session = await getSession();
  if (!session.userId) redirect('/login');

  const now = new Date();
  await setKpiOverride(now.getFullYear(), now.getMonth() + 1, key, value);
  revalidatePath('/dashboard/team');
}
