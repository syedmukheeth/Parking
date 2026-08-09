import { t } from '@/i18n/messages';
import { GeolocateButton } from './geolocate-button';

interface SearchFiltersProps {
  q?: string;
  lat?: string;
  lng?: string;
  vehicleType?: string;
  availableOnly?: string;
  openNow?: string;
  sort?: string;
}

/** A GET form — filtering works via URL search params with no client JS
 * required, per Server-Components-by-default (parkap-frontend skill). Only
 * "use my location" needs a Client Component. */
export function SearchFilters(props: SearchFiltersProps) {
  return (
    <form action="/search" className="flex flex-wrap items-end gap-3">
      {props.lat ? <input type="hidden" name="lat" value={props.lat} /> : null}
      {props.lng ? <input type="hidden" name="lng" value={props.lng} /> : null}

      <div className="min-w-48 flex-1">
        <label htmlFor="q" className="sr-only">
          {t('home.searchPlaceholder')}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={props.q}
          placeholder={t('home.searchPlaceholder')}
          className="w-full rounded-sm border border-input bg-background px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="vehicleType" className="sr-only">
          {t('search.filters.vehicleType')}
        </label>
        <select
          id="vehicleType"
          name="vehicleType"
          defaultValue={props.vehicleType ?? ''}
          className="rounded-sm border border-input bg-background px-3 py-2"
        >
          <option value="">{t('search.filters.vehicleType')}</option>
          <option value="CAR">Car</option>
          <option value="BIKE">Bike</option>
          <option value="EV_CAR">EV car</option>
          <option value="EV_BIKE">EV bike</option>
          <option value="BUS">Bus</option>
        </select>
      </div>

      <div>
        <label htmlFor="sort" className="sr-only">
          {t('search.filters.sort')}
        </label>
        <select
          id="sort"
          name="sort"
          defaultValue={props.sort ?? 'distance'}
          className="rounded-sm border border-input bg-background px-3 py-2"
        >
          <option value="distance">{t('search.sort.distance')}</option>
          <option value="price">{t('search.sort.price')}</option>
          <option value="availability">{t('search.sort.availability')}</option>
        </select>
      </div>

      <label className="flex items-center gap-2 py-2 text-small">
        <input type="checkbox" name="availableOnly" value="true" defaultChecked={props.availableOnly === 'true'} />
        {t('search.filters.availableOnly')}
      </label>

      <label className="flex items-center gap-2 py-2 text-small">
        <input type="checkbox" name="openNow" value="true" defaultChecked={props.openNow === 'true'} />
        {t('search.filters.openNow')}
      </label>

      <GeolocateButton />

      <button type="submit" className="rounded-sm bg-primary px-4 py-2 font-medium text-primary-foreground">
        {t('home.searchCta')}
      </button>
    </form>
  );
}
