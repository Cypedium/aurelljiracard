'use client';
import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useLanguage } from '../hooks/useLanguage';

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description: ReactNode;
  descriptionClassName?: string;
  // Extra content between the text and the buttons (e.g. a select)
  children?: ReactNode;
  // Defaults to "Delete"
  confirmLabel?: ReactNode;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  // false: the caller closes the dialog itself (e.g. after the server's answer, so an error shows with it open)
  closeOnConfirm?: boolean;
};

// A destructive confirmation (delete, turn on read-only). Radix handles focus, Escape and scroll lock
export default function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  descriptionClassName,
  children,
  confirmLabel,
  confirmDisabled = false,
  onConfirm,
  closeOnConfirm = true,
}: Props) {
  const { t } = useLanguage();
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent className="font-jira text-jira-text">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className={descriptionClassName}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={confirmDisabled}
            onClick={(e) => {
              if (!closeOnConfirm) e.preventDefault();
              onConfirm();
            }}
          >
            {confirmLabel ?? t('Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
