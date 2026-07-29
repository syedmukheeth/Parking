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
    'home.searchCta': 'Search parking',
    'home.tagline': 'Live availability, advance reservation, and QR-gate entry across Andhra Pradesh.',
    'common.loading': 'Loading…',
    'common.empty': 'Nothing here yet',
    'common.error': 'Something went wrong',
    'common.retry': 'Try again',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.back': 'Back',

    'nav.search': 'Search',
    'nav.bookings': 'My bookings',
    'nav.profile': 'Profile',
    'nav.signOut': 'Sign out',
    'nav.signIn': 'Sign in',

    'auth.phoneLabel': 'Phone number',
    'auth.phonePlaceholder': '+91XXXXXXXXXX',
    'auth.sendCode': 'Send code',
    'auth.codeLabel': 'Enter the 6-digit code',
    'auth.codeSentTo': 'Code sent — check the API console (dev stub OTP)',
    'auth.verify': 'Verify & sign in',
    'auth.changeNumber': 'Use a different number',
    'auth.title': 'Sign in to ParkAP',
    'auth.subtitle': 'Any 10-digit phone number works in development.',

    'search.title': 'Find parking',
    'search.noResults.title': 'No parking lots match your search',
    'search.noResults.description': 'Try a wider radius or a different area.',
    'search.filters.vehicleType': 'Vehicle',
    'search.filters.availableOnly': 'Available now',
    'search.filters.openNow': 'Open now',
    'search.filters.sort': 'Sort by',
    'search.sort.distance': 'Distance',
    'search.sort.price': 'Price',
    'search.sort.availability': 'Availability',
    'search.resultsCount': 'lots found',
    'search.priceFrom': 'from',
    'search.perHour': '/hr',

    'location.slotTypes': 'Slot types',
    'location.pricing': 'Pricing',
    'location.amenities': 'Amenities',
    'location.hours': 'Hours',
    'location.open24x7': 'Open 24 hours',
    'location.bookNow': 'Reserve a slot',
    'location.notFound.title': 'Location not found',
    'location.getDirections': 'Get directions',

    'booking.selectVehicle': 'Vehicle type',
    'booking.vehicleNumber': 'Vehicle number',
    'booking.vehicleNumberPlaceholder': 'AP39AB1234',
    'booking.startTime': 'Start time',
    'booking.endTime': 'End time',
    'booking.getQuote': 'Get a quote',
    'booking.total': 'Total',
    'booking.confirmReservation': 'Confirm reservation',
    'booking.slotUnavailable': 'That slot was just taken — try another time or lot.',
    'booking.payWithMock': 'Pay now (dev mock)',
    'booking.paymentSuccess': 'Payment successful — your booking is confirmed.',

    'ticket.title': 'Your ticket',
    'ticket.showAtGate': 'Show this QR code at the gate',
    'ticket.expiresAt': 'Valid until',
    'ticket.extend': 'Extend booking',
    'ticket.newEndTime': 'New end time',
    'ticket.cancelBooking': 'Cancel booking',
    'ticket.status.PENDING': 'Awaiting payment',
    'ticket.status.CONFIRMED': 'Confirmed',
    'ticket.status.ACTIVE': 'Active — parked',
    'ticket.status.COMPLETED': 'Completed',
    'ticket.status.CANCELLED': 'Cancelled',
    'ticket.status.EXPIRED': 'Expired',

    'history.title': 'My bookings',
    'history.upcoming': 'Upcoming',
    'history.past': 'Past',
    'history.empty.title': "You haven't booked any parking yet",
    'history.empty.description': 'Search for a lot near you to get started.',
    'history.repeatBooking': 'Book again',

    'profile.title': 'Profile',
    'profile.name': 'Name',
    'profile.email': 'Email',
    'profile.save': 'Save changes',
    'profile.saved': 'Saved.',
  },
  te: {},
} satisfies Record<Locale, Partial<Record<string, string>>>;

export type MessageKey = keyof (typeof messages)['en'];

export function t(key: MessageKey, locale: Locale = 'en'): string {
  const catalog = messages[locale] as Partial<Record<MessageKey, string>>;
  return catalog[key] ?? messages.en[key];
}
