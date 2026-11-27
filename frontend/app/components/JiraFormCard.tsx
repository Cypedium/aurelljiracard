'use client';
import type { FormEventHandler, ReactNode } from 'react';
import { Button } from './ui/button';
import { useLanguage } from '../hooks/useLanguage';
import { FORM_BODY_CLASS, FORM_CARD_CLASS, FORM_HEADER_CLASS, FORM_SUBMIT_CLASS, SECTION_PADDING } from '../utils/styles';

type JiraFormCardProps = {
  title: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  // Extra classes on the <form> (margins, max width)
  className?: string;
  // Top padding of the body; defaults to pt-2
  bodyClassName?: string;
  children: ReactNode;
  // Usually <FormActions />
  footer: ReactNode;
};

// A Jira-style form: white card, gradient header, fields, buttons at the bottom. Put it inside shadcn <Form>
export default function JiraFormCard({ title, onSubmit, className = '', bodyClassName = 'pt-2', children, footer }: JiraFormCardProps) {
  return (
    <form className={`${FORM_CARD_CLASS} ${className}`} onSubmit={onSubmit} noValidate>
      <header className={FORM_HEADER_CLASS}>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      </header>
      <div className={`${FORM_BODY_CLASS} ${bodyClassName}`}>{children}</div>
      {footer}
    </form>
  );
}

type FormActionsProps = {
  submitLabel: ReactNode;
  submitting: boolean;
  onCancel: () => void;
  // Shown on the left (e.g. the card's creation date)
  start?: ReactNode;
  // Top padding; defaults to pt-2
  className?: string;
};

// Cancel and submit, right-aligned
export function FormActions({ submitLabel, submitting, onCancel, start, className = 'pt-2' }: FormActionsProps) {
  const { t } = useLanguage();
  return (
    <footer className={`${SECTION_PADDING} flex items-center justify-end gap-2 pb-6 ${className}`}>
      {start}
      <Button type="button" variant="ghost" size="sm" className="text-jira-secondary" onClick={onCancel}>
        {t('Cancel')}
      </Button>
      <Button type="submit" size="sm" className={FORM_SUBMIT_CLASS} disabled={submitting}>
        {submitLabel}
      </Button>
    </footer>
  );
}
