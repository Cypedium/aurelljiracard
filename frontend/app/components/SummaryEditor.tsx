'use client';
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent, type SVGProps } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';
import { BoldIcon, H1Icon, H2Icon, ListBulletIcon } from '@heroicons/react/20/solid';
import { continueList, toggleBold, toggleLineFormat, type TextEdit } from '../utils/richText';
import { EDITOR_TAB_ACTIVE_CLASS, EDITOR_TAB_CLASS, EDITOR_TOOL_CLASS } from '../utils/styles';
import { FormControl, useFormField } from './ui/form';
import { Textarea } from './ui/textarea';
import RichText from './RichText';

type Change = (value: string, start: number, end: number) => TextEdit | null;
type Tool = { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; change: Change };

type Props = {
  // react-hook-form-fältet för sammanfattningen
  field: Pick<ControllerRenderProps, 'onChange' | 'onBlur' | 'name' | 'ref'> & { value: string };
  placeholder?: string;
};

// Sammanfattningens textruta med verktygsrad (fet, punktlista, större text, rubrik) och förhandsvisning.
// Knapparna skriver in markdown-tecknen (se utils/richText.ts). Renderas inuti en FormItem
export default function SummaryEditor({ field, placeholder }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [preview, setPreview] = useState(false);
  const { error } = useFormField();

  // Ett valideringsfel syns bara bredvid textrutan, så den visas igen
  useEffect(() => {
    if (error) setPreview(false);
  }, [error]);

  const tools: Tool[] = [
    { label: 'Bold (Ctrl+B)', Icon: BoldIcon, change: toggleBold },
    { label: 'Bullet list', Icon: ListBulletIcon, change: (v, s, e) => toggleLineFormat(v, s, e, 'bullet') },
    { label: 'Large text', Icon: H2Icon, change: (v, s, e) => toggleLineFormat(v, s, e, 'large') },
    { label: 'Heading', Icon: H1Icon, change: (v, s, e) => toggleLineFormat(v, s, e, 'heading') },
  ];

  // Kör en ändring på markeringen; true om texten ändrades
  const run = (change: Change) => {
    const el = textareaRef.current;
    if (!el) return false;
    const edit = change(el.value, el.selectionStart, el.selectionEnd);
    if (!edit) return false;
    field.onChange(edit.value);
    // Markeringen sätts efter att React har ritat det nya värdet
    requestAnimationFrame(() => {
      const current = textareaRef.current;
      if (!current) return;
      current.focus();
      current.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
    return true;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      run(toggleBold);
      return;
    }
    if (event.key === 'Enter' && !modifier && !event.shiftKey && !event.nativeEvent.isComposing && run(continueList)) {
      event.preventDefault();
    }
  };

  const tab = (active: boolean) => `${EDITOR_TAB_CLASS} ${active ? EDITOR_TAB_ACTIVE_CLASS : ''}`;

  return (
    <>
      <div className="mb-1 flex items-center gap-0.5">
        <div className="flex items-center gap-0.5" role="toolbar" aria-label="Summary formatting">
          {tools.map(({ label, Icon, change }) => (
            <button
              key={label}
              type="button"
              className={EDITOR_TOOL_CLASS}
              aria-label={label}
              title={label}
              disabled={preview}
              // Behåll fokus och markering i textrutan
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => run(change)}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <button type="button" className={tab(!preview)} aria-pressed={!preview} onClick={() => setPreview(false)}>
            Write
          </button>
          <button type="button" className={tab(preview)} aria-pressed={preview} onClick={() => setPreview(true)}>
            Preview
          </button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[88px] rounded-md border border-input px-3 py-2 text-sm text-jira-text">
          {field.value.trim() ? (
            <RichText text={field.value} />
          ) : (
            <p className="text-jira-secondary">Nothing to preview</p>
          )}
        </div>
      ) : (
        <FormControl>
          <Textarea
            className="min-h-[88px] resize-y bg-white text-jira-text"
            placeholder={placeholder}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            onKeyDown={onKeyDown}
            ref={(el) => {
              textareaRef.current = el;
              field.ref(el);
            }}
          />
        </FormControl>
      )}
    </>
  );
}
