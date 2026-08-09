import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Navigation, Phone } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { getSession } from '@/lib/session';
import { LocationCover } from '@/components/ui/location-cover';
import { t, type MessageKey } from '@/i18n/messages';
import { getLocationDetail } from '@/features/locations/api';
import { AvailabilityHero } from '@/features/locations/components/availability-hero';
import { BookingFlow } from '@/features/booking/components/booking-flow';
import { favouriteIds } from '@/features/favourites/api';
import { FavouriteButton } from '@/features/favourites/components/favourite-button';
import { LazyMap } from '@/features/map/lazy-map';
import { listVehicles } from '@/features/vehicles/api';

interface LocationPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vehicleNumber?: string }>;
}

export async function generateMetadata({ params }: LocationPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const location = await getLocationDetail(id);
    const description = `Parking at ${location.name} in ${location.city}. ${location.address}.`;
    return {
      title: location.name,
      description,
      openGraph: { title: `${location.name} · ParkAP`, description, type: 'website' },
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
  // Saved vehicles and favourites are per-citizen; a signed-out visitor still
  // gets the full public detail page, just without the picker or the heart.
  const [vehicles, favourites] = session
    ? await Promise.all([listVehicles(), favouriteIds()])
    : [[], new Set<string>()];

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
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 sm:px-6 lg:py-10">
      {/* Static, server-generated structured data built from typed fields:
       * no user input reaches this string. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <LocationCover
          locationId={location.id}
          name={location.name}
          tags={location.tags}
          className="h-32 w-full shrink-0 sm:h-28 sm:w-44"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-h1">{location.name}</h1>
              <p className="text-small text-muted-foreground">
                {location.address}, {location.city} {location.pincode}
              </p>
            </div>
            {session ? (
              <FavouriteButton locationId={location.id} initialIsFavourite={favourites.has(location.id)} />
            ) : null}
          </div>

          <AvailabilityHero location={location} />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-small text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" size={15} />
              {location.is24x7 ? t('location.open24x7') : `${location.openTime}–${location.closeTime}`}
            </span>
            {location.contactPhone ? (
              <a href={`tel:${location.contactPhone}`} className="tabular inline-flex items-center gap-1.5 hover:text-foreground">
                <Phone aria-hidden="true" size={15} />
                {location.contactPhone}
              </a>
            ) : null}
            <a
              href={mapsHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-primary"
            >
              <Navigation aria-hidden="true" size={15} />
              {t('location.getDirections')}
            </a>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          {/* ── Pricing ──────────────────────────────────────────────────── */}
          <section aria-labelledby="pricing-heading">
            <h2 id="pricing-heading" className="mb-3 text-h2">
              {t('location.pricing')}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[520px] border-collapse text-small">
                <thead>
                  <tr className="border-b border-border bg-secondary text-left text-muted-foreground">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {t('location.vehicle')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {t('location.class')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {t('location.available')}
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      {t('location.rate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {location.slotTypes.map((slot) => (
                    <tr key={slot.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-3 font-medium">{t(`vehicle.${slot.vehicleType}` as MessageKey)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t(`slotClass.${slot.slotClass}` as MessageKey)}
                      </td>
                      <td className="tabular px-4 py-3">
                        {slot.available} / {slot.capacity}
                      </td>
                      <td className="px-4 py-3">
                        {slot.pricing.map((rule, i) => (
                          <div key={i} className="tabular">
                            <span className="font-medium">{formatINR(rule.baseAmount)}</span>{' '}
                            <span className="text-muted-foreground">
                              {t(`pricing.${rule.mode}` as MessageKey)}
                              {rule.freeMinutes > 0
                                ? ` · ${t('location.freeFirst')} ${rule.freeMinutes}m`
                                : ''}
                            </span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Amenities ────────────────────────────────────────────────── */}
          {location.tags.length > 0 ? (
            <section aria-labelledby="amenities-heading">
              <h2 id="amenities-heading" className="mb-3 text-h2">
                {t('location.amenities')}
              </h2>
              <ul className="flex flex-wrap gap-2">
                {location.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-border px-3 py-1.5 text-small text-secondary-foreground"
                  >
                    {t(`tag.${tag}` as MessageKey)}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ── Map inset ────────────────────────────────────────────────── */}
          <section aria-labelledby="map-heading">
            <h2 id="map-heading" className="mb-3 text-h2">
              {t('location.whereItIs')}
            </h2>
            <div className="h-72 overflow-hidden rounded-lg border border-border">
              <LazyMap
                locations={[
                  {
                    ...location,
                    availability: {
                      total: location.slotTypes.reduce((sum, s) => sum + s.capacity, 0),
                      available: location.slotTypes.reduce((sum, s) => sum + s.available, 0),
                    },
                  },
                ]}
                selectedId={location.id}
                fitToLocations={false}
                className="h-full w-full"
              />
            </div>
          </section>
        </div>

        {/* ── Booking ───────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          {session ? (
            <BookingFlow location={location} vehicles={vehicles} initialVehicleNumber={vehicleNumber} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-5 text-center">
              <p className="mb-3 text-small text-muted-foreground">{t('location.signInToReserve')}</p>
              <Link
                href="/sign-in"
                className="inline-block rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                {t('nav.signIn')}
              </Link>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
