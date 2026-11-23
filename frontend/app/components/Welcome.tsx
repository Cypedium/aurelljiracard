'use client';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';

// What you can do in the app; shown in the welcome text
const FEATURES = [
  msg('Boards with your own lists: add, rename, colour, reorder and hide them'),
  msg('Cards with issue keys, priority, assignee and issue types like Task, Bug and Story'),
  msg('A backlog for work that is not planned yet'),
  msg('Invite others with a link and work on the same board together'),
];

// The welcome text on the start page (Login and Register). Mobile/tablet: above the form and as wide
// (the same mx-4 w-full max-w-md). Large screen (lg): next to the form. The text grows with the screen
export default function Welcome() {
  const { t } = useLanguage();
  return (
    <section className="mx-4 w-full max-w-md font-jira text-white">
      <h1 className="text-2xl font-semibold sm:text-3xl lg:text-4xl">{t('Welcome to AURELLO')}</h1>
      <p className="mt-2 text-sm text-white/85 sm:mt-3 sm:text-base">
        {t('A free board for your to-dos and projects. As simple as a to-do list, with the tools you know from Jira.')}
      </p>
      <ul className="mt-4 flex flex-col gap-2 text-sm text-white/85 sm:mt-5 sm:gap-2.5">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircleIcon className="size-5 shrink-0" aria-hidden />
            {t(feature)}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-white/85 sm:mt-5">{t('Free to use. Create an account to get your own board.')}</p>
    </section>
  );
}
