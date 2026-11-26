'use server';

import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are both needed.' };

  const result = await signIn(email, password);
  if (!result.ok) return { error: result.error };

  redirect('/dashboard');
}
