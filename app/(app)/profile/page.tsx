import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/authz';

export default async function OwnProfile() {
  const user = await requireUser();
  redirect(`/profile/${user.id}`);
}
