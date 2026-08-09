'use client';

import { useState, useTransition } from 'react';
import { t } from '@/i18n/messages';
import { setFavouriteAction } from '../actions';

/**
 * Optimistic heart toggle. `stopPropagation`/`preventDefault` matter here: on a
 * results card this button sits inside a clickable card, and without them a
 * save would also navigate to the location.
 */
export function FavouriteButton({
  locationId,
  initialIsFavourite,
}: {
  locationId: string;
  initialIsFavourite: boolean;
}) {
  const [isFavourite, setIsFavourite] = useState(initialIsFavourite);
  const [isPending, startTransition] = useTransition();

  function handleClick(event: React.MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const next = !isFavourite;
    setIsFavourite(next);
    startTransition(async () => {
      const result = await setFavouriteAction(locationId, next);
      // Roll back rather than leaving the heart lying about server state.
      if (!result.ok) setIsFavourite(!next);
    });
  }

  const label = isFavourite ? t('favourites.remove') : t('favourites.add');

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFavourite}
      aria-label={label}
      title={label}
      className="rounded-full p-1.5 text-h3 leading-none transition hover:bg-secondary disabled:opacity-60"
    >
      <span aria-hidden="true">{isFavourite ? '♥' : '♡'}</span>
    </button>
  );
}
