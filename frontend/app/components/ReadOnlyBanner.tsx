'use client';
import { useLanguage } from '../hooks/useLanguage';

// Read-only mode, under the navbar: everyone sees it; the site admin can still make changes
export default function ReadOnlyBanner({ siteAdmin }: { siteAdmin: boolean }) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      className={`px-[3%] py-1 text-center font-jira text-sm ${
        siteAdmin ? 'bg-jira-info text-jira-primary-hover' : 'bg-jira-warning text-jira-warning-text'
      }`}
    >
      {siteAdmin
        ? t('Read-only mode is on for everyone else. You can still make changes.')
        : t('AurellTodo is in read-only mode. You can look around, but changes are paused for now.')}
    </div>
  );
}
