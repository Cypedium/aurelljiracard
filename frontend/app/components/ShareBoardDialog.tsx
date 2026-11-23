'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrashIcon } from '@heroicons/react/16/solid';
import { createInvite, deleteInvite, getMembers, removeMember, type Board, type BoardMember } from '../api/endpoints';
import { reloadBoards } from '../hooks/useBoards';
import { reportError } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { inviteUrl, isBoardAdmin } from '../utils/currentBoard';
import { getUsername } from '../utils/session';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { useLanguage } from '../hooks/useLanguage';
import { boardName } from '../utils/currentBoard';
import { msg } from '../utils/i18n';

type Props = {
  board: Board;
  open: boolean;
  onClose: () => void;
};

// The navbar's "Share" (the board's admin): create and copy an invite link, remove collaborators.
// "Members" (collaborators): see who is on the board and leave it
export default function ShareBoardDialog({ board, open, onClose }: Props) {
  const { t } = useLanguage();
  const admin = isBoardAdmin(board);
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  // The link is shown only right after it is created: the server only keeps a hash of it
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setMembers((await getMembers(board._id)).data);
    } catch (err) {
      reportError('Fetch members error', err, msg('Could not load the members.'));
      setMembers([]);
    }
  }, [board._id]);

  useEffect(() => {
    if (open) fetchMembers();
    else setLink(null);
  }, [open, fetchMembers]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await action();
    } catch (err) {
      reportError('Share board error', err, fallback);
    } finally {
      setBusy(false);
    }
  };

  const newLink = () =>
    run(async () => {
      const { token } = (await createInvite(board._id)).data;
      setLink(inviteUrl(window.location.origin, token));
    }, msg('Could not create the invite link.'));

  const turnOffLink = () =>
    run(async () => {
      await deleteInvite(board._id);
      setLink(null);
      toast.success(t('Invite link turned off.'));
    }, msg('Could not turn the invite link off.'));

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(t('Link copied.'));
    } catch {
      toast.error(t('Could not copy. Select the link and copy it yourself.'));
    }
  };

  const remove = (member: BoardMember) =>
    run(async () => {
      await removeMember(board._id, member._id);
      setMembers((prev) => prev?.filter((m) => m._id !== member._id) ?? null);
      toast.success(t('{username} was removed from the board.', { username: member.username }));
    }, msg('Could not remove the member.'));

  // Collaborators: the board disappears from the list and your own board is shown
  const leave = (me: BoardMember) =>
    run(async () => {
      await removeMember(board._id, me._id);
      toast.success(t('You left {board}.', { board: boardName(board, t) }));
      onClose();
      await reloadBoards();
    }, msg('Could not leave the board.'));

  const me = members?.find((m) => m.role !== 'admin' && m.username === getUsername());

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="font-jira text-jira-text sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{admin ? t('Share {board}', { board: boardName(board, t) }) : boardName(board, t)}</DialogTitle>
          <DialogDescription className="text-jira-secondary">
            {admin
              ? t('Collaborators can see the board, add cards and move them. Only you change lists and issue types.')
              : t('{owner} owns this board. You can add cards and move them.', { owner: board.owner })}
          </DialogDescription>
        </DialogHeader>

        {admin && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-jira-secondary">{t('Invite link')}</h3>
            {link ? (
              <div className="flex gap-2">
                <Input readOnly value={link} aria-label={t('Invite link')} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" onClick={copyLink}>
                  {t('Copy')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-jira-secondary">
                {t('Anyone who opens the link and logs in joins as a collaborator. A new link turns off the old one.')}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant={link ? 'outline' : 'default'} disabled={busy} onClick={newLink}>
                {link ? t('Create a new link') : t('Create invite link')}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={turnOffLink}>
                {t('Turn off link')}
              </Button>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-jira-secondary">{t('Members')}</h3>
          {members === null ? (
            <p className="text-sm text-jira-secondary">{t('Loading…')}</p>
          ) : (
            <ul className="flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
              {members.map((member) => (
                <li key={member._id} className="flex items-center gap-3 rounded-[3px] px-1 py-1 hover:bg-jira-neutral">
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ background: avatarColor(member.username) }}
                    aria-hidden
                  >
                    {avatarInitials(member.username)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{member.username}</span>
                  <span className="rounded-[3px] bg-jira-neutral px-1.5 text-xs/5 font-bold text-jira-secondary uppercase">
                    {member.role === 'admin' ? t('Owner') : t('Collaborator')}
                  </span>
                  {admin && member.role !== 'admin' && (
                    <button
                      type="button"
                      className="rounded-[3px] p-1.5 text-jira-secondary hover:bg-jira-neutral-hover disabled:opacity-40"
                      aria-label={t('Remove {username}', { username: member.username })}
                      title={t('Remove from the board')}
                      disabled={busy}
                      onClick={() => remove(member)}
                    >
                      <TrashIcon className="size-4" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {!admin && me && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => leave(me)}>
              {t('Leave board')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
