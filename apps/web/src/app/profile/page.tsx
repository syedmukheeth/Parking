import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { t } from '@/i18n/messages';
import { getMe } from '@/features/profile/api';
import { ProfileForm } from '@/features/profile/components/profile-form';

export const metadata: Metadata = { title: t('profile.title') };

export default async function ProfilePage() {
  await requireSession();
  const user = await getMe();

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('profile.title')}</h1>
        <p className="text-sm text-[var(--color-muted)]">{user.phone}</p>
      </div>
      <ProfileForm user={user} />
    </main>
  );
}
