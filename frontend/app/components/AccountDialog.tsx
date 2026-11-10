'use client';
import { toast } from 'sonner';
import { connectGoogle } from '../api/endpoints';
import { apiErrorMessage } from '../utils/apiError';
import { GOOGLE_CLIENT_ID } from '../utils/google';
import GoogleButton from './GoogleButton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  username: string;
};

// Öppnas från avataren i navbaren: koppla ett Google-konto till kontot, så "Sign in with Google" loggar in som en
export default function AccountDialog({ open, onClose, username }: Props) {
  const handleConnect = async (credential: string) => {
    try {
      await connectGoogle(credential);
      toast.success('Google account connected. You can now sign in with Google.');
      onClose();
    } catch (error) {
      // T.ex. 409: Google-kontot hör redan till en annan användare
      toast.error(apiErrorMessage(error, 'Could not connect the Google account.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="font-jira text-jira-text sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
          <DialogDescription className="text-jira-secondary">Logged in as {username}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Google</h3>
          <p className="text-sm text-jira-secondary">
            Connect your Google account to sign in with Google instead of your password.
          </p>
          {GOOGLE_CLIENT_ID ? (
            <GoogleButton text="continue_with" onCredential={handleConnect} />
          ) : (
            <p className="text-sm text-jira-subtle">Google sign-in is not configured.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
