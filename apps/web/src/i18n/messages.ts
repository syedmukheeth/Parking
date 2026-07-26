import type { Locale } from '@parkap/shared';

/**
 * User-facing strings live here from the first render. Telugu is a launch
 * requirement, and retrofitting i18n across a finished UI costs several times
 * what doing it from the start costs. Telugu values arrive with the translation
 * source (see docs/ROADMAP.md); until then `te` falls back to `en` per key.
 */
export const messages = {
  en: {
    'app.name': 'ParkAP',
    'app.tagline': 'Find and reserve parking across Andhra Pradesh',
    'home.searchPlaceholder': 'Where are you going?',
    'common.loading': 'Loading…',
    'common.empty': 'Nothing here yet',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
  },
  te: {},
} satisfies Record<Locale, Partial<Record<string, string>>>;

export type MessageKey = keyof (typeof messages)['en'];

export function t(key: MessageKey, locale: Locale = 'en'): string {
  const catalog = messages[locale] as Partial<Record<MessageKey, string>>;
  return catalog[key] ?? messages.en[key];
}
