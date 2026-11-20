'use client';
import { useMemo } from 'react';
import { SUMMARY_CLASS, SUMMARY_COMPACT_CLASS, renderSummary } from '../utils/summaryFormat';

type Props = { text: string; compact?: boolean; className?: string };

// The summary with formatting, without an editor (Tiptap's static renderer gives React elements, no HTML string).
// compact: the card face, three lines
export default function SummaryView({ text, compact = false, className = '' }: Props) {
  const content = useMemo(() => renderSummary(text), [text]);
  return <div className={`${compact ? SUMMARY_COMPACT_CLASS : SUMMARY_CLASS} ${className}`}>{content}</div>;
}
