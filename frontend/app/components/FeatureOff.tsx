'use client';
import Link from 'next/link';
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';
import { ROUTES } from '../utils/routes';

// A page or form the site admin has switched off (feature switches); title and text are English, shown translated; the same card as the invite page
export default function FeatureOff({
  title = msg('This page is turned off'),
  text = msg('An admin has turned this off for now.'),
  showBoardLink = true,
}: {
  title?: string;
  text?: string;
  showBoardLink?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div role="status" className="mx-auto w-full max-w-[400px] rounded-lg bg-white p-6 text-center font-jira text-jira-text shadow-lg">
      <h1 className="text-lg font-semibold">{t(title)}</h1>
      <p className="mt-2 text-sm text-jira-secondary">{t(text)}</p>
      {showBoardLink && (
        <Link href={ROUTES.board} className="mt-4 inline-block text-sm font-medium text-jira-primary hover:underline">
          {t('Go to your board')}
        </Link>
      )}
    </div>
  );
}
