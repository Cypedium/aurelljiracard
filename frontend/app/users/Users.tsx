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
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../hooks/useLanguage';
import { msg } from '../utils/i18n';
import { ROLE_LABELS } from '../utils/session';

export default function Users() {
  const [users, setUsers] = useState<PublicUser[] | null>(null);
  const { t } = useLanguage();
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<PublicUser | null>(null);
  const me = getUsername();

  const fetchUsers = useCallback(async () => {
    try {
      // Cards are per board now, so the admin can't count them; deleting a user with cards answers 409
      const usersRes = await getUsers();
      setUsers([...usersRes.data].sort((a, b) => a.username.localeCompare(b.username)));
    } catch (err) {
      reportError('Error fetching users', err, msg('Could not load users.'));
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
      // Our tokens have the old name and are revoked: log in again
      toast.success(t('Your name was changed. Please log in again.'));
      handleLogout();
      return;
    }
    toast.success(t('{username} updated. They must log in again within 15 minutes.', { username: updated.username }));
    fetchUsers();
  };

  const removeUser = async (user: PublicUser) => {
    try {
      await deleteUser(user._id);
      setUsers((prev) => prev?.filter((u) => u._id !== user._id) ?? null);
      toast.success(t('{username} deleted.', { username: user.username }));
    } catch (err) {
      reportError('Error deleting user', err, msg('Could not delete user.'));
    }
  };

  const logOutUser = async (user: PublicUser) => {
    try {
      await revokeUserSessions(user._id);
      // The backend counts them as logged out at once
      setUsers((prev) => prev?.map((u) => (u._id === user._id ? { ...u, online: false } : u)) ?? null);
      toast.success(t('{username} will be logged out within 15 minutes.', { username: user.username }));
    } catch (err) {
      reportError('Error logging out user', err, msg('Could not log out user.'));
    }
  };

  if (users === null) return <TableSkeleton />;

  return (
    <>
      <div className={TABLE_WRAPPER_CLASS}>
        <table className="w-full text-sm text-jira-text">
          <thead className={TABLE_THEAD_CLASS}>
            <tr>
              <th scope="col" className={TH_CLASS}>{t('User')}</th>
              <th scope="col" className={TH_CLASS}>{t('Role')}</th>
              <th scope="col" className={`${TH_CLASS} max-sm:hidden`}>{t('Status')}</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.username === me;
              const deleteBlocked = isSelf ? t('You cannot delete yourself') : null;

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
                      {/* Green dot = logged in now */}
                      <span
                        role="img"
                        aria-label={user.online ? t('Online') : t('Offline')}
                        title={user.online ? t('Online') : t('Offline')}
                        className={`-mr-1.5 size-2 shrink-0 rounded-full ${user.online ? 'bg-[#22a06b]' : 'bg-jira-border'}`}
                      />
                      <span className="min-w-0 truncate font-medium" title={user.username}>
                        {user.username}
                        {isSelf && <span className="ml-1 font-normal text-jira-secondary">{t('(you)')}</span>}
                      </span>
                    </div>
                  </td>
                  <td className={TD_CLASS}>
                    <span
                      className={`rounded-[3px] px-1.5 text-xs/5 font-bold uppercase ${
                        user.role === 'admin' ? 'bg-jira-info text-jira-primary' : 'bg-jira-neutral text-jira-secondary'
                      }`}
                    >
                      {t(ROLE_LABELS[user.role])}
                    </span>
                  </td>
                  <td className={`${TD_CLASS} max-sm:hidden`}>
                    {/* Online now, otherwise when the user was last active. Hidden on mobile so Actions fits (the dot by the name shows) */}
                    <span className="whitespace-nowrap text-jira-secondary">
                      {user.online ? (
                        <span className="font-medium text-jira-text">{t('Online')}</span>
                      ) : (
                        <span title={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : undefined}>
                          {lastSeenLabel(user.lastActiveAt, undefined, t)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className={`${TD_CLASS} w-px whitespace-nowrap`}>
                    <div className="flex items-center justify-end">
                      <button
                        className={ACTION_CLASS}
                        aria-label={t('Edit {username}', { username: user.username })}
                        title={t('Edit name and role')}
                        onClick={() => setEditingUser(user)}
                      >
                        <PencilIcon className="size-4" aria-hidden />
                      </button>
                      <button
                        className={ACTION_CLASS}
                        aria-label={t('Log out {username}', { username: user.username })}
                        title={isSelf ? t('Use Log out in the account menu') : t('Log out from all sessions')}
                        disabled={isSelf}
                        onClick={() => logOutUser(user)}
                      >
                        <ArrowRightStartOnRectangleIcon className="size-4" aria-hidden />
                      </button>
                      <button
                        className={ACTION_CLASS}
                        aria-label={t('Delete {username}', { username: user.username })}
                        title={deleteBlocked ?? t('Delete user')}
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

      {/* Radix handles focus, Escape, clicks outside and scroll lock */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          // The form has its own background and shadow
          className="gap-0 border-0 bg-transparent p-0 font-jira shadow-none sm:max-w-[480px]"
        >
          <DialogTitle className="sr-only">{t('Edit user')}</DialogTitle>
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

      <ConfirmDialog
        open={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        title={t('Delete {title}?', { title: deletingUser?.username ?? '' })}
        description={t('The account is removed permanently. Cards assigned to this user become unassigned.')}
        onConfirm={() => deletingUser && removeUser(deletingUser)}
      />
    </>
  );
}
