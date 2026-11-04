import { TABLE_WRAPPER_CLASS } from '../utils/styles';
import { Skeleton } from './ui/skeleton';

// Visas medan en tabell (backlog, users) hämtas
export default function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={TABLE_WRAPPER_CLASS} aria-busy="true" aria-label="Loading">
      <div className="border-b-2 border-jira-neutral px-4 py-2.5">
        <Skeleton className="h-3 w-24 bg-jira-neutral" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-jira-neutral px-4 py-3 last:border-b-0">
          <Skeleton className="size-6 shrink-0 rounded-full bg-jira-neutral" />
          <Skeleton className="h-4 flex-1 bg-jira-neutral" />
          <Skeleton className="h-4 w-16 bg-jira-neutral max-[480px]:hidden" />
          <Skeleton className="h-7 w-24 bg-jira-neutral" />
        </div>
      ))}
    </div>
  );
}
