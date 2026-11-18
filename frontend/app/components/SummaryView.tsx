'use client';
import { useMemo } from 'react';
import { SUMMARY_CLASS, SUMMARY_COMPACT_CLASS, renderSummary } from '../utils/summaryFormat';

type Props = { text: string; compact?: boolean; className?: string };

// Sammanfattningen med formatering, utan editor (Tiptaps statiska renderare ger React-element, ingen HTML-sträng).
// compact: kortets framsida, tre rader
export default function SummaryView({ text, compact = false, className = '' }: Props) {
  const content = useMemo(() => renderSummary(text), [text]);
  return <div className={`${compact ? SUMMARY_COMPACT_CLASS : SUMMARY_CLASS} ${className}`}>{content}</div>;
}
