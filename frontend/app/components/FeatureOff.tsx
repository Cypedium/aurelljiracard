'use client';
import Link from 'next/link';
import { ROUTES } from '../utils/routes';

// En sida eller ett formulär som sajtens admin har stängt av (feature switches); samma kort som inbjudningssidan
export default function FeatureOff({
  title = 'This page is turned off',
  text = 'An admin has turned this off for now.',
  showBoardLink = true,
}: {
  title?: string;
  text?: string;
  showBoardLink?: boolean;
}) {
  return (
    <div role="status" className="mx-auto w-full max-w-[400px] rounded-lg bg-white p-6 text-center font-jira text-jira-text shadow-lg">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-jira-secondary">{text}</p>
      {showBoardLink && (
        <Link href={ROUTES.board} className="mt-4 inline-block text-sm font-medium text-jira-primary hover:underline">
          Go to your board
        </Link>
      )}
    </div>
  );
}
