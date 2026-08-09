import Link from 'next/link';
import { t } from '@/i18n/messages';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center sm:px-6">
      <h1 className="text-h1">{t('error.notFound.title')}</h1>
      <p className="text-small text-muted-foreground">{t('error.notFound.description')}</p>
      <Link href="/search" className="rounded-sm bg-primary px-4 py-2 text-small font-medium text-primary-foreground">
        {t('favourites.empty.cta')}
      </Link>
    </main>
  );
}
