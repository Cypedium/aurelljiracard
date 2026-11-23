'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrashIcon } from '@heroicons/react/16/solid';
import { deleteIssueType, getCards, getIssueTypes } from '../api/endpoints';
import { removeIssueType } from '../hooks/useIssueTypes';
import { useBoards } from '../hooks/useBoards';
import { useFeatures } from '../hooks/useFeatures';
import { reportError } from '../utils/apiError';
import { BOARD_ACTIONS, onBoardAction } from '../utils/boardActions';
import { countCardsByType, DEFAULT_CARD_TYPE, MAX_ISSUE_TYPES, normalizeIssueTypes, type IssueType } from '../utils/cardType';
import { TABLE_CELL_CLASS as TD_CLASS, TABLE_HEAD_CLASS as TH_CLASS, TABLE_THEAD_CLASS, TABLE_ROW_CLASS, TABLE_WRAPPER_CLASS, TABLE_ACTION_CLASS as ACTION_CLASS } from '../utils/styles';
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
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';
import { issueTypeLabel } from '../utils/cardType';

// The board's admin: the board's issue types with their card counts. New ones are added here or in the card form; unused ones can be deleted
export default function IssueTypes() {
  const boardId = useBoards().current?._id ?? null;
  const { t } = useLanguage();
  // manageIssueTypes switched off: no deleting (and no "Create Issue type" in the navbar)
  const canManage = useFeatures().isOn('manageIssueTypes');
  const [types, setTypes] = useState<IssueType[] | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);
  const [deletingType, setDeletingType] = useState<IssueType | null>(null);

  const fetchTypes = useCallback(async () => {
    if (!boardId) return;
    try {
      const [typesRes, cardsRes] = await Promise.all([getIssueTypes(boardId), getCards(boardId)]);
      setTypes(normalizeIssueTypes(typesRes.data));
      setCardCounts(countCardsByType(cardsRes.data || []));
    } catch (err) {
      reportError('Error fetching issue types', err, msg('Could not load issue types.'));
      setTypes([]);
    }
  }, [boardId]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  const removeType = async (type: IssueType) => {
    if (!boardId) return;
    try {
      await deleteIssueType(boardId, type.key);
      setTypes((prev) => prev?.filter((t) => t.key !== type.key) ?? null);
      removeIssueType(type.key);
      toast.success(t('Issue type {name} deleted.', { name: issueTypeLabel(type, t) }));
    } catch (err) {
      reportError('Error deleting issue type', err, msg('Could not delete issue type.'));
    }
  };

  // "Create Issue type" in the navbar opens the dialog; at the maximum number of types the reason is shown instead
  const typeCount = types?.length ?? null;
  useEffect(
    () =>
      onBoardAction(BOARD_ACTIONS.createIssueType, () => {
        if (typeCount === null) return;
        if (typeCount >= MAX_ISSUE_TYPES) {
          toast.error(t('There can be at most {max} issue types.', { max: MAX_ISSUE_TYPES }), { id: 'issue-types-full' });
          return;
        }
        setCreating(true);
      }),
    [typeCount],
  );

  return (
    <>
      {/* No visible heading (the navbar shows the page); kept for screen readers */}
      <h1 className="sr-only">{t('Issue types')}</h1>

      {types === null ? (
        <TableSkeleton />
      ) : (
        <div className={TABLE_WRAPPER_CLASS}>
          <table className="w-full text-sm text-jira-text">
            <thead className={TABLE_THEAD_CLASS}>
              <tr>
                <th scope="col" className={TH_CLASS}>{t('Issue type')}</th>
                <th scope="col" className={`${TH_CLASS} max-[480px]:hidden`}>{t('Key')}</th>
                <th scope="col" className={`${TH_CLASS} text-right`}>{t('Cards')}</th>
                <th scope="col" className={`${TH_CLASS} text-right`}>{t('Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => {
                const isDefault = type.key === DEFAULT_CARD_TYPE;
                const cards = cardCounts[type.key] ?? 0;
                const deleteBlocked = isDefault
                  ? t('The default issue type cannot be deleted')
                  : cards > 0
                    ? cards === 1 ? t('Change or delete its card first') : t('Change or delete its {count} cards first', { count: cards })
                    : null;

                return (
                  <tr key={type.key} className={TABLE_ROW_CLASS}>
                    <td className={TD_CLASS}>
                      <div className="flex min-w-0 items-center gap-3">
                        <IssueTypeIcon issueType={type} />
                        <span className="min-w-0 truncate font-medium" title={issueTypeLabel(type, t)}>
                          {issueTypeLabel(type, t)}
                          {isDefault && <span className="ml-1 font-normal text-jira-secondary">{t('(default)')}</span>}
                        </span>
                      </div>
                    </td>
                    <td className={`${TD_CLASS} text-jira-secondary max-[480px]:hidden`}>
                      <code className="text-xs">{type.key}</code>
                    </td>
                    <td className={`${TD_CLASS} text-right text-jira-secondary tabular-nums`}>{cards}</td>
                    <td className={`${TD_CLASS} w-px whitespace-nowrap`}>
                      <div className={`flex items-center justify-end ${canManage ? '' : 'invisible'}`}>
                        <button
                          className={ACTION_CLASS}
                          aria-label={t('Delete {title}', { title: issueTypeLabel(type, t) })}
                          title={deleteBlocked ?? t('Delete issue type')}
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
            <AlertDialogTitle>{t('Delete {title}?', { title: deletingType ? issueTypeLabel(deletingType, t) : '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('The issue type is removed for everyone. No cards use it.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deletingType && removeType(deletingType)}>
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
