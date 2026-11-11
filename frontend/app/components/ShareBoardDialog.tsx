'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { TrashIcon } from '@heroicons/react/16/solid';
import { createInvite, deleteInvite, getMembers, removeMember, type Board, type BoardMember } from '../api/endpoints';
import { reloadBoards } from '../cards/useBoards';
import { apiErrorMessage } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { inviteUrl, isBoardAdmin } from '../utils/currentBoard';
import { getUsername } from '../utils/session';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

type Props = {
  board: Board;
  open: boolean;
  onClose: () => void;
};

// Navbarens "Share" (boardens admin): skapa och kopiera en inbjudningslänk, ta bort medarbetare.
// "Members" (medarbetare): se vilka som är med och lämna boarden
export default function ShareBoardDialog({ board, open, onClose }: Props) {
  const admin = isBoardAdmin(board);
  const [members, setMembers] = useState<BoardMember[] | null>(null);
  // Länken visas bara när den har skapats: servern sparar bara en hash av den
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setMembers((await getMembers(board._id)).data);
    } catch (err: any) {
      console.error('Fetch members error:', err.message);
      toast.error(apiErrorMessage(err, 'Could not load the members.'));
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
    } catch (err: any) {
      console.error('Share board error:', err.message);
      toast.error(apiErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const newLink = () =>
    run(async () => {
      const { token } = (await createInvite(board._id)).data;
      setLink(inviteUrl(window.location.origin, token));
    }, 'Could not create the invite link.');

  const turnOffLink = () =>
    run(async () => {
      await deleteInvite(board._id);
      setLink(null);
      toast.success('Invite link turned off.');
    }, 'Could not turn the invite link off.');

  const copyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it yourself.');
    }
  };

  const remove = (member: BoardMember) =>
    run(async () => {
      await removeMember(board._id, member._id);
      setMembers((prev) => prev?.filter((m) => m._id !== member._id) ?? null);
      toast.success(`${member.username} was removed from the board.`);
    }, 'Could not remove the member.');

  // Medarbetare: boarden försvinner ur listan och den egna visas
  const leave = (me: BoardMember) =>
    run(async () => {
      await removeMember(board._id, me._id);
      toast.success(`You left ${board.name}.`);
      onClose();
      await reloadBoards();
    }, 'Could not leave the board.');

  const me = members?.find((m) => m.role !== 'admin' && m.username === getUsername());

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="font-jira text-jira-text sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{admin ? `Share ${board.name}` : board.name}</DialogTitle>
          <DialogDescription className="text-jira-secondary">
            {admin
              ? 'Collaborators can see the board, add cards and move them. Only you change lists and issue types.'
              : `${board.owner} owns this board. You can add cards and move them.`}
          </DialogDescription>
        </DialogHeader>

        {admin && (
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-jira-secondary">Invite link</h3>
            {link ? (
              <div className="flex gap-2">
                <Input readOnly value={link} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" onClick={copyLink}>
                  Copy
                </Button>
              </div>
            ) : (
              <p className="text-sm text-jira-secondary">
                Anyone who opens the link and logs in joins as a collaborator. A new link turns off the old one.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="button" variant={link ? 'outline' : 'default'} disabled={busy} onClick={newLink}>
                {link ? 'Create a new link' : 'Create invite link'}
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={turnOffLink}>
                Turn off link
              </Button>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-jira-secondary">Members</h3>
          {members === null ? (
            <p className="text-sm text-jira-secondary">Loading…</p>
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
                    {member.role === 'admin' ? 'Owner' : 'Collaborator'}
                  </span>
                  {admin && member.role !== 'admin' && (
                    <button
                      type="button"
                      className="rounded-[3px] p-1.5 text-jira-secondary hover:bg-jira-neutral-hover disabled:opacity-40"
                      aria-label={`Remove ${member.username}`}
                      title="Remove from the board"
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
              Leave board
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
