import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { getSession } from '@/lib/session';
import { t } from '@/i18n/messages';
import { getLocationDetail } from '@/features/locations/api';
import { BookingFlow } from '@/features/booking/components/booking-flow';

interface LocationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vehicleNumber?: string }>;
}

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const location = await getLocationDetail(id);
    return {
      title: location.name,
      description: `${location.name} — parking in ${location.city}. ${location.address}.`,
    };
  } catch {
    return { title: t('location.notFound.title') };
  }
}

export default async function LocationDetailPage({ params, searchParams }: LocationPageProps) {
  const { id } = await params;
  const { vehicleNumber } = await searchParams;

  let location;
  try {
    location = await getLocationDetail(id);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const session = await getSession();
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ParkingFacility',
    name: location.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: location.address,
      addressLocality: location.city,
      addressRegion: 'Andhra Pradesh',
      postalCode: location.pincode,
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: location.lat, longitude: location.lng },
    telephone: location.contactPhone ?? undefined,
  };

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* eslint-disable-next-line react/no-danger -- static, server-generated structured data, no user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{location.name}</h1>
        <p className="text-[var(--color-muted)]">
          {location.address}, {location.city} {location.pincode}
        </p>
        <a href={mapsHref} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-brand)] underline underline-offset-2">
          {t('location.getDirections')}
        </a>
      </div>

      <section className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-muted)]">
        <span>
          {t('location.hours')}: {location.is24x7 ? t('location.open24x7') : `${location.openTime}–${location.closeTime}`}
        </span>
        {location.contactPhone ? <span>{location.contactPhone}</span> : null}
      </section>

      {location.tags.length > 0 ? (
        <section aria-label={t('location.amenities')} className="flex flex-wrap gap-2">
          {location.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('location.slotTypes')}</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted)]">
                <th className="py-2 pr-4 font-medium">Vehicle</th>
                <th className="py-2 pr-4 font-medium">Class</th>
                <th className="py-2 pr-4 font-medium">Available</th>
                <th className="py-2 pr-4 font-medium">{t('location.pricing')}</th>
              </tr>
            </thead>
            <tbody>
              {location.slotTypes.map((slot) => (
                <tr key={slot.id} className="border-b border-[var(--color-border)]">
                  <td className="py-2 pr-4">{slot.vehicleType}</td>
                  <td className="py-2 pr-4">{slot.slotClass}</td>
                  <td className="py-2 pr-4">
                    {slot.available} / {slot.capacity}
                  </td>
                  <td className="py-2 pr-4">
                    {slot.pricing.map((rule, i) => (
                      <div key={i}>
                        {rule.mode} {formatINR(rule.baseAmount)}
                        {rule.freeMinutes > 0 ? ` (first ${rule.freeMinutes}m free)` : ''}
                      </div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {session ? (
        <BookingFlow location={location} initialVehicleNumber={vehicleNumber} />
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] p-4 text-center">
          <p className="mb-3 text-sm text-[var(--color-muted)]">Sign in to reserve a slot at this location.</p>
          <Link href="/sign-in" className="rounded-md bg-[var(--color-brand)] px-4 py-2 font-medium text-white">
            {t('nav.signIn')}
          </Link>
        </div>
      )}
    </main>
  );
}
