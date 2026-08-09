import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { t } from '@/i18n/messages';
import { getMe } from '@/features/profile/api';
import { ProfileForm } from '@/features/profile/components/profile-form';
import { listVehicles } from '@/features/vehicles/api';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { VehicleList } from '@/features/vehicles/components/vehicle-list';

export const metadata: Metadata = { title: t('profile.title') };

export default async function ProfilePage() {
  await requireSession();
  const [user, vehicles] = await Promise.all([getMe(), listVehicles()]);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-h1">{t('profile.title')}</h1>
        <p className="tabular text-small text-muted-foreground">{user.phone}</p>
      </div>
      <ProfileForm user={user} />

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">{t('vehicles.title')}</h2>
        <VehicleList vehicles={vehicles} />
        <VehicleForm />
      </section>
    </main>
  );
}
