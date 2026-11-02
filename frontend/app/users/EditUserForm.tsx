'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { updateUser, type PublicUser } from '../api/endpoints';
import { apiErrorMessage, isConflictError } from '../utils/apiError';
import { ROLES, type Role } from '../utils/session';
import { changedUserFields, editUserSchema, type EditUserValues } from '../utils/userForm';
import { FIELD_ERROR_CLASS, FORM_ITEM_CLASS, LABEL_CLASS, SECTION_PADDING } from '../utils/styles';
import { Button } from '../components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

type EditUserFormProps = {
  user: PublicUser;
  // Den inloggade admin själv: rollen kan inte ändras (backend nekar också)
  isSelf: boolean;
  onSaved: (user: PublicUser) => void;
  onCancel: () => void;
};

const ROLE_LABELS: Record<Role, string> = { user: 'User', admin: 'Admin' };

export default function EditUserForm({ user, isSelf, onSaved, onCancel }: EditUserFormProps) {
  const current: EditUserValues = { username: user.username, role: user.role };
  const form = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: current,
  });

  const onSubmit = async (values: EditUserValues) => {
    const changes = changedUserFields(current, values);
    if (Object.keys(changes).length === 0) {
      onCancel();
      return;
    }
    try {
      const res = await updateUser(user._id, changes);
      onSaved(res.data);
    } catch (error) {
      console.error('Update user error:', (error as Error).message);
      // Upptaget namn (409) visas under fältet
      if (isConflictError(error)) {
        form.setError('username', { message: apiErrorMessage(error, 'Username already taken.') }, { shouldFocus: true });
        return;
      }
      toast.error(apiErrorMessage(error, 'Could not update user.'));
    }
  };

  return (
    <Form {...form}>
      <form
        className="w-full overflow-hidden rounded-xl bg-white font-jira text-sm text-jira-text shadow-[0_8px_12px_rgba(9,30,66,0.15),0_0_1px_rgba(9,30,66,0.31)]"
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <header className={`${SECTION_PADDING} bg-linear-135 from-board-from via-board-via to-board-to py-5`}>
          <h2 className="text-xl font-semibold text-white">Edit user</h2>
        </header>

        <div className={`${SECTION_PADDING} flex flex-col pt-2 pb-4`}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Username</FormLabel>
                <FormControl>
                  <Input className="bg-white text-jira-text" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className={FORM_ITEM_CLASS}>
                <FormLabel className={LABEL_CLASS}>Role</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                  <FormControl>
                    <SelectTrigger className="w-full max-w-[240px] font-medium text-jira-text">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" className="font-jira text-jira-text">
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className={FIELD_ERROR_CLASS} />
              </FormItem>
            )}
          />

          <p className="mt-4 text-xs text-jira-secondary">
            {isSelf
              ? 'You cannot change your own role. Renaming yourself logs you out.'
              : 'Changing the name or role logs the user out; their cards follow the new name.'}
          </p>
        </div>

        <footer className={`${SECTION_PADDING} flex justify-end gap-2 border-t border-jira-neutral py-3`}>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save
          </Button>
        </footer>
      </form>
    </Form>
  );
}
