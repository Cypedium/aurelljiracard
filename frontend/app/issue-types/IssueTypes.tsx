'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrashIcon } from '@heroicons/react/16/solid';
import { deleteIssueType, getCards, getIssueTypes } from '../api/endpoints';
import { removeIssueType } from '../cards/useIssueTypes';
import { apiErrorMessage } from '../utils/apiError';
import { BOARD_ACTIONS, onBoardAction } from '../utils/boardActions';
import { countCardsByType, DEFAULT_CARD_TYPE, MAX_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from '../utils/cardType';
import { TABLE_CELL_CLASS as TD_CLASS, TABLE_HEAD_CLASS as TH_CLASS, TABLE_ROW_CLASS, TABLE_WRAPPER_CLASS } from '../utils/styles';
import IssueTypeIcon from '../components/IssueTypeIcon';
import NewIssueTypeDialog from '../components/NewIssueTypeDialog';
import TableSkeleton from '../components/TableSkeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const ACTION_CLASS =
  'rounded-[3px] p-1.5 text-jira-secondary hover:bg-jira-neutral disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

// Admin: alla ärendetyper med antal kort. Nya läggs till här eller i kortformuläret; oanvända kan tas bort
export default function IssueTypes() {
  const [types, setTypes] = useState<IssueType[] | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [deletingType, setDeletingType] = useState<IssueType | null>(null);

  const fetchTypes = useCallback(async () => {
    try {
      const [typesRes, cardsRes] = await Promise.all([getIssueTypes(), getCards()]);
      setTypes(normalizeIssueTypes(typesRes.data));
      setCardCounts(countCardsByType(cardsRes.data || []));
    } catch (err: any) {
      console.error('Error fetching issue types:', err.message);
      toast.error(apiErrorMessage(err, 'Could not load issue types.'));
      setTypes([]);
    }
  }, []);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const removeType = async (type: IssueType) => {
    try {
      await deleteIssueType(type.key);
      setTypes((prev) => prev?.filter((t) => t.key !== type.key) ?? null);
      removeIssueType(type.key);
      toast.success(`Issue type ${type.label} deleted.`);
    } catch (err: any) {
      console.error('Error deleting issue type:', err.message);
      toast.error(apiErrorMessage(err, 'Could not delete issue type.'));
    }
  };

  // "Create Issue type" i navbaren öppnar dialogen; vid max antal typer visas varför i stället
  const typeCount = types?.length ?? null;
  useEffect(
    () =>
      onBoardAction(BOARD_ACTIONS.createIssueType, () => {
        if (typeCount === null) return;
        if (typeCount >= MAX_ISSUE_TYPES) {
          toast.error(`There can be at most ${MAX_ISSUE_TYPES} issue types.`, { id: 'issue-types-full' });
          return;
        }
        setCreating(true);
      }),
    [typeCount],
  );

  return (
    <>
      {/* Ingen synlig rubrik (navbaren visar sidan); kvar för skärmläsare */}
      <h1 className="sr-only">Issue types</h1>

      {types === null ? (
        <TableSkeleton />
      ) : (
        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-sm text-jira-text">
            <thead className="border-b-2 border-jira-neutral">
              <tr>
                <th scope="col" className={TH_CLASS}>Issue type</th>
                <th scope="col" className={`${TH_CLASS} max-[480px]:hidden`}>Key</th>
                <th scope="col" className={TH_CLASS}>Color</th>
                <th scope="col" className={`${TH_CLASS} text-right`}>Cards</th>
                <th scope="col" className={`${TH_CLASS} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => {
                const isDefault = type.key === DEFAULT_CARD_TYPE;
                const cards = cardCounts[type.key] ?? 0;
                const deleteBlocked = isDefault
                  ? 'The default issue type cannot be deleted'
                  : cards > 0
                    ? `Change or delete its ${cards} card${cards === 1 ? '' : 's'} first`
                    : null;

                return (
                  <tr key={type.key} className={TABLE_ROW_CLASS}>
                    <td className={TD_CLASS}>
                      <div className="flex min-w-0 items-center gap-3">
                        <IssueTypeIcon issueType={type} />
                        <span className="min-w-0 truncate font-medium" title={type.label}>
                          {type.label}
                          {isDefault && <span className="ml-1 font-normal text-jira-secondary">(default)</span>}
                        </span>
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-jira-secondary max-[480px]:hidden`}>
                      <code className="text-xs">{type.key}</code>
                    </td>
                    <td className={TD_CLASS}>
                      <span className="inline-flex items-center gap-1.5 text-jira-secondary">
                        <span className="size-3 shrink-0 rounded-[3px]" style={{ background: type.color }} aria-hidden />
                        <span className="text-xs tabular-nums">{type.color}</span>
                      </span>
                    </td>
                    <td className={`${TD_CLASS} text-right text-jira-secondary tabular-nums`}>{cards}</td>
                    <td className={`${TD_CLASS} w-px whitespace-nowrap`}>
                      <div className="flex items-center justify-end">
                        <button
                          className={ACTION_CLASS}
                          aria-label={`Delete ${type.label}`}
                          title={deleteBlocked ?? 'Delete issue type'}
                          disabled={Boolean(deleteBlocked)}
                          onClick={() => setDeletingType(type)}
                        >
                          <TrashIcon className="size-4" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewIssueTypeDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(type) => {
          setCreating(false);
          setTypes((prev) => [...(prev ?? []).filter((t) => t.key !== type.key), type]);
        }}
      />

      <AlertDialog open={Boolean(deletingType)} onOpenChange={(open) => !open && setDeletingType(null)}>
        <AlertDialogContent className="font-jira text-jira-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingType?.label}?</AlertDialogTitle>
            <AlertDialogDescription>The issue type is removed for everyone. No cards use it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deletingType && removeType(deletingType)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
