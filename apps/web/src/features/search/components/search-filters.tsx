import { ChevronDown } from 'lucide-react';
import type { VehicleType } from '@parkap/shared';
import { t, type MessageKey } from '@/i18n/messages';
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

const VEHICLE_TYPES: VehicleType[] = ['CAR', 'BIKE', 'EV_CAR', 'EV_BIKE', 'BUS'];
const SORTS = [
  { value: 'distance', key: 'search.sort.distance' },
  { value: 'price', key: 'search.sort.price' },
  { value: 'availability', key: 'search.sort.availability' },
] satisfies { value: string; key: MessageKey }[];

/** One height for every control on the row. Mixed intrinsic heights across an
 * input, two selects and two buttons is what makes a filter bar look assembled
 * rather than designed. */
const CONTROL = 'h-10 rounded-sm border border-input bg-background px-3 text-small';

/**
 * A GET form: filtering works through URL search params with no client JS,
 * per Server-Components-by-default (parkap-frontend skill). Only "use my
 * location" needs a Client Component.
 *
 * The selects stay native. `appearance-none` plus an overlaid chevron restyles
 * the closed state while the open state remains the platform picker, which on
 * a phone is a far better control than any div-based menu, and which keeps
 * keyboard and screen-reader behaviour for free.
 */
export function SearchFilters(props: SearchFiltersProps) {
  return (
    <form action="/search" className="flex flex-wrap items-center gap-2">
      {props.lat ? <input type="hidden" name="lat" value={props.lat} /> : null}
      {props.lng ? <input type="hidden" name="lng" value={props.lng} /> : null}

      <div className="min-w-52 flex-1">
        <label htmlFor="q" className="sr-only">
          {t('home.searchPlaceholder')}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={props.q}
          placeholder={t('home.searchPlaceholder')}
          className={`${CONTROL} w-full`}
        />
      </div>

      <SelectField
        id="vehicleType"
        name="vehicleType"
        label={t('search.filters.vehicleType')}
        defaultValue={props.vehicleType ?? ''}
      >
        <option value="">{t('search.filters.vehicleType')}</option>
        {VEHICLE_TYPES.map((vehicle) => (
          <option key={vehicle} value={vehicle}>
            {t(`vehicle.${vehicle}` as MessageKey)}
          </option>
        ))}
      </SelectField>

      <SelectField
        id="sort"
        name="sort"
        label={t('search.filters.sort')}
        defaultValue={props.sort ?? 'distance'}
      >
        {SORTS.map((sort) => (
          <option key={sort.value} value={sort.value}>
            {t(sort.key)}
          </option>
        ))}
      </SelectField>

      <ToggleChip name="availableOnly" label={t('search.filters.availableOnly')} checked={props.availableOnly === 'true'} />
      <ToggleChip name="openNow" label={t('search.filters.openNow')} checked={props.openNow === 'true'} />

      <GeolocateButton />

      <button type="submit" className={`${CONTROL} bg-primary px-4 font-medium text-primary-foreground`}>
        {t('home.searchCta')}
      </button>
    </form>
  );
}

function SelectField({
  id,
  name,
  label,
  defaultValue,
  children,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={`${CONTROL} appearance-none pr-9`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

/**
 * A real checkbox styled as a chip. `peer-checked` drives the appearance, so
 * the control keeps its native keyboard behaviour, its focus ring and its
 * announcement as a checkbox, and it still submits inside a plain GET form
 * with JavaScript switched off.
 */
function ToggleChip({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value="true" defaultChecked={checked} className="peer sr-only" />
      <span
        className={`${CONTROL} inline-flex items-center bg-transparent text-muted-foreground transition-colors peer-hover:border-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-checked:border-primary peer-checked:bg-primary-subtle peer-checked:text-primary-subtle-foreground`}
      >
        {label}
      </span>
    </label>
  );
}
