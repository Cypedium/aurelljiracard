'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, TrashIcon } from '@heroicons/react/16/solid';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { deleteUser, getCards, getUsers, revokeUserSessions, type PublicUser } from '../api/endpoints';
import { apiErrorMessage } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { handleLogout } from '../utils/logout';
import { getUsername } from '../utils/session';
import { countCardsByAuthor } from '../utils/userForm';
import EditUserForm from './EditUserForm';
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog';
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

// Rubrikrad i Jira-stil: små grå versaler
const TH_CLASS = 'px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-jira-secondary';
const TD_CLASS = 'px-4 py-3';

const ACTION_CLASS =
  'rounded-[3px] p-1.5 text-jira-secondary hover:bg-jira-neutral disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

export default function Users() {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<PublicUser | null>(null);
  const me = getUsername();

  const fetchUsers = useCallback(async () => {
    try {
      const [usersRes, cardsRes] = await Promise.all([getUsers(), getCards()]);
      setUsers([...usersRes.data].sort((a, b) => a.username.localeCompare(b.username)));
      setCardCounts(countCardsByAuthor(cardsRes.data || []));
    } catch (err: any) {
      console.error('Error fetching users:', err.message);
      toast.error(apiErrorMessage(err, 'Could not load users.'));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSaved = (updated: PublicUser) => {
    const renamedSelf = editingUser?.username === me && updated.username !== me;
    setEditingUser(null);
    if (renamedSelf) {
      // Våra tokens har det gamla namnet och är återkallade: logga in igen
      toast.success('Your name was changed. Please log in again.');
      handleLogout();
      return;
    }
    toast.success(`${updated.username} updated. They must log in again within 15 minutes.`);
    fetchUsers();
  };

  const removeUser = async (user: PublicUser) => {
    try {
      await deleteUser(user._id);
      setUsers((prev) => prev?.filter((u) => u._id !== user._id) ?? null);
      toast.success(`${user.username} deleted.`);
    } catch (err: any) {
      console.error('Error deleting user:', err.message);
      toast.error(apiErrorMessage(err, 'Could not delete user.'));
    }
  };

  const logOutUser = async (user: PublicUser) => {
    try {
      await revokeUserSessions(user._id);
      toast.success(`${user.username} will be logged out within 15 minutes.`);
    } catch (err: any) {
      console.error('Error logging out user:', err.message);
      toast.error(apiErrorMessage(err, 'Could not log out user.'));
    }
  };

  if (users === null) return null;

  return (
    <>
      <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_1px_rgba(9,30,66,0.25),0_0_1px_rgba(9,30,66,0.31)]">
        <table className="w-full text-sm text-jira-text">
          <thead className="border-b-2 border-jira-neutral">
            <tr>
              <th scope="col" className={TH_CLASS}>User</th>
              <th scope="col" className={TH_CLASS}>Role</th>
              <th scope="col" className={`${TH_CLASS} text-right max-[480px]:hidden`}>Cards</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.username === me;
              const cards = cardCounts[user.username] ?? 0;
              const deleteBlocked = isSelf
                ? 'You cannot delete yourself'
                : cards > 0
                  ? `Delete their ${cards} card${cards === 1 ? '' : 's'} first`
                  : null;

              return (
                <tr key={user._id} className="border-b border-jira-neutral last:border-b-0 hover:bg-[#f7f8f9]">
                  <td className={TD_CLASS}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                        style={{ background: avatarColor(user.username) }}
                        aria-hidden
                      >
                        {avatarInitials(user.username)}
                      </span>
                      <span className="min-w-0 truncate font-medium" title={user.username}>
                        {user.username}
                        {isSelf && <span className="ml-1 font-normal text-jira-secondary">(you)</span>}
                      </span>
                    </div>
                  </td>
                  <td className={TD_CLASS}>
                    <span
                      className={`rounded-[3px] px-1.5 text-xs/5 font-bold uppercase ${
                        user.role === 'admin' ? 'bg-[#e9f2ff] text-[#0c66e4]' : 'bg-jira-neutral text-jira-secondary'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className={`${TD_CLASS} text-right text-jira-secondary tabular-nums max-[480px]:hidden`}>{cards}</td>
                  <td className={`${TD_CLASS} w-px whitespace-nowrap`}>
                    <div className="flex items-center justify-end">
                      <button
                        className={ACTION_CLASS}
                        aria-label={`Edit ${user.username}`}
                        title="Edit name and role"
                        onClick={() => setEditingUser(user)}
                      >
                        <PencilIcon className="size-4" aria-hidden />
                      </button>
                      <button
                        className={ACTION_CLASS}
                        aria-label={`Log out ${user.username}`}
                        title={isSelf ? 'Use Logout in the menu' : 'Log out from all sessions'}
                        disabled={isSelf}
                        onClick={() => logOutUser(user)}
                      >
                        <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden />
                      </button>
                      <button
                        className={ACTION_CLASS}
                        aria-label={`Delete ${user.username}`}
                        title={deleteBlocked ?? 'Delete user'}
                        disabled={Boolean(deleteBlocked)}
                        onClick={() => setDeletingUser(user)}
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

      {/* Radix sköter fokus, Escape, klick utanför och scroll-lås */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // Formuläret har egen bakgrund och skugga
          className="gap-0 border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[480px]"
        >
          <DialogTitle className="sr-only">Edit user</DialogTitle>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              isSelf={editingUser.username === me}
              onSaved={handleSaved}
              onCancel={() => setEditingUser(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent className="font-jira text-jira-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingUser?.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              The account is removed permanently. Cards assigned to this user become unassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deletingUser && removeUser(deletingUser)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
