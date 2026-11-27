'use client';
import type { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

// Tailwind needs whole class names, so the widths are listed here
const WIDTH_CLASS = { sm: 'sm:max-w-[420px]', md: 'sm:max-w-[480px]', lg: 'sm:max-w-[640px]' } as const;

type Props = {
  open: boolean;
  onClose: () => void;
  // For screen readers: the form's visible heading is a plain h2
  title: string;
  width?: keyof typeof WIDTH_CLASS;
  children: ReactNode;
};

// A dialog around a JiraFormCard. The form has its own background and shadow, so the dialog has none;
// tall forms scroll inside it. Radix handles focus, Escape, clicks outside and scroll lock
export default function FormDialog({ open, onClose, title, width = 'lg', children }: Props) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={`max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto border-0 bg-transparent p-0 font-jira shadow-none ${WIDTH_CLASS[width]}`}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
