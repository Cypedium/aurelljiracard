'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PencilIcon, TrashIcon } from '@heroicons/react/16/solid';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { deleteUser, getUsers, revokeUserSessions, type PublicUser } from '../api/endpoints';
import { reportError } from '../utils/apiError';
import { avatarColor, avatarInitials } from '../utils/avatar';
import { handleLogout } from '../utils/logout';
import { getUsername } from '../utils/session';
import { lastSeenLabel } from '../utils/presence';
import { TABLE_CELL_CLASS as TD_CLASS, TABLE_HEAD_CLASS as TH_CLASS, TABLE_THEAD_CLASS, TABLE_ROW_CLASS, TABLE_WRAPPER_CLASS, TABLE_ACTION_CLASS as ACTION_CLASS } from '../utils/styles';
import EditUserForm from './EditUserForm';
import TableSkeleton from '../components/TableSkeleton';
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

export default function Users() {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<PublicUser | null>(null);
  const me = getUsername();

  const fetchUsers = useCallback(async () => {
    try {
      // Cards are per board now, so the admin can't count them; deleting a user with cards answers 409
      const usersRes = await getUsers();
      setUsers([...usersRes.data].sort((a, b) => a.username.localeCompare(b.username)));
    } catch (err) {
      reportError('Error fetching users', err, 'Could not load users.');
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
    } catch (err) {
      reportError('Error deleting user', err, 'Could not delete user.');
    }
  };

  const logOutUser = async (user: PublicUser) => {
    try {
      await revokeUserSessions(user._id);
      // Backenden räknar dem som utloggade direkt
      setUsers((prev) => prev?.map((u) => (u._id === user._id ? { ...u, online: false } : u)) ?? null);
      toast.success(`${user.username} will be logged out within 15 minutes.`);
    } catch (err) {
      reportError('Error logging out user', err, 'Could not log out user.');
    }
  };

  if (users === null) return <TableSkeleton />;

  return (
    <>
      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-sm text-jira-text">
          <thead className={TABLE_THEAD_CLASS}>
            <tr>
              <th scope="col" className={TH_CLASS}>User</th>
              <th scope="col" className={TH_CLASS}>Role</th>
              <th scope="col" className={TH_CLASS}>Status</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.username === me;
              const deleteBlocked = isSelf ? 'You cannot delete yourself' : null;

              return (
                <tr key={user._id} className={TABLE_ROW_CLASS}>
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
                  <td className={TD_CLASS}>
                    {/* Grön prick = inloggad nu, annars när användaren senast var aktiv */}
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-jira-secondary">
                      <span
                        className={`size-2 shrink-0 rounded-full ${user.online ? 'bg-[#22a06b]' : 'bg-jira-border'}`}
                        aria-hidden
                      />
                      {user.online ? (
                        <span className="font-medium text-jira-text">Online</span>
                      ) : (
                        <span title={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : undefined}>
                          {lastSeenLabel(user.lastActiveAt)}
                        </span>
                      )}
                    </span>
                  </td>
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
