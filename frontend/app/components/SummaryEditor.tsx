'use client';
import { useEffect, useRef, type ComponentType, type SVGProps } from 'react';
import type { ControllerRenderProps } from 'react-hook-form';
import { EditorContent, useEditor, useEditorState, type ChainedCommands } from '@tiptap/react';
import { Markdown } from '@tiptap/markdown';
import {
  BoldIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  H1Icon,
  H2Icon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  StrikethroughIcon,
} from '@heroicons/react/20/solid';
import { MARKED_OPTIONS, SUMMARY_CLASS, SUMMARY_EXTENSIONS } from '../utils/summaryFormat';
import {
  EDITOR_TOOL_CLASS,
  SUMMARY_EDITOR_BOX_CLASS,
  SUMMARY_EDITOR_CONTENT_CLASS,
  SUMMARY_PLACEHOLDER_CLASS,
} from '../utils/styles';
import { FormControl } from './ui/form';

type Tool = {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  // Namnet (och attributen) som editor.isActive känner igen
  active: [string, Record<string, unknown>?];
  run: (chain: ChainedCommands) => ChainedCommands;
};

// Kortkommandon står i title; Tiptap har dem inbyggda, liksom markdown medan man skriver ("- ", "# ", **fet**)
const TOOLS: Tool[] = [
  { label: 'Bold (Ctrl+B)', Icon: BoldIcon, active: ['bold'], run: (c) => c.toggleBold() },
  { label: 'Italic (Ctrl+I)', Icon: ItalicIcon, active: ['italic'], run: (c) => c.toggleItalic() },
  { label: 'Strikethrough (Ctrl+Shift+S)', Icon: StrikethroughIcon, active: ['strike'], run: (c) => c.toggleStrike() },
  { label: 'Code (Ctrl+E)', Icon: CodeBracketIcon, active: ['code'], run: (c) => c.toggleCode() },
  { label: 'Heading', Icon: H1Icon, active: ['heading', { level: 1 }], run: (c) => c.toggleHeading({ level: 1 }) },
  { label: 'Large text', Icon: H2Icon, active: ['heading', { level: 2 }], run: (c) => c.toggleHeading({ level: 2 }) },
  { label: 'Bullet list', Icon: ListBulletIcon, active: ['bulletList'], run: (c) => c.toggleBulletList() },
  { label: 'Numbered list', Icon: NumberedListIcon, active: ['orderedList'], run: (c) => c.toggleOrderedList() },
  { label: 'To-do list', Icon: CheckCircleIcon, active: ['taskList'], run: (c) => c.toggleTaskList() },
];

type Props = {
  // react-hook-form-fältet för sammanfattningen (markdown)
  field: Pick<ControllerRenderProps, 'onChange' | 'onBlur' | 'ref'> & { value: string };
  placeholder?: string;
};

// Sammanfattningen med formatering medan man skriver (Tiptap). Sparas som markdown via @tiptap/markdown,
// se utils/summaryFormat.ts. Renderas inuti en FormItem
export default function SummaryEditor({ field, placeholder }: Props) {
  // Senaste värdet editorn själv skickade; ett annat värde kommer utifrån (formuläret laddar ett kort)
  const emitted = useRef(field.value);

  const editor = useEditor({
    extensions: [...SUMMARY_EXTENSIONS, Markdown.configure({ markedOptions: MARKED_OPTIONS })],
    content: field.value,
    contentType: 'markdown',
    // Next renderar på servern först; editorn skapas i webbläsaren
    immediatelyRender: false,
    editorProps: {
      attributes: { class: `${SUMMARY_CLASS} ${SUMMARY_EDITOR_CONTENT_CLASS}`, 'aria-label': 'Summary', 'aria-multiline': 'true', role: 'textbox' },
    },
    onUpdate: ({ editor: e }) => {
      const markdown = e.isEmpty ? '' : e.getMarkdown();
      emitted.current = markdown;
      field.onChange(markdown);
    },
    onBlur: () => field.onBlur(),
  });

  useEffect(() => {
    if (!editor || field.value === emitted.current) return;
    emitted.current = field.value;
    editor.commands.setContent(field.value, { contentType: 'markdown', emitUpdate: false });
  }, [editor, field.value]);

  // Ett valideringsfel flyttar fokus hit (react-hook-form anropar focus på ref:en)
  const { ref } = field;
  useEffect(() => {
    if (editor) ref({ focus: () => editor.commands.focus() });
  }, [editor, ref]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e ? { empty: e.isEmpty, active: TOOLS.map((t) => e.isActive(...t.active)) } : { empty: !field.value, active: [] },
  });

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Summary formatting">
        {TOOLS.map(({ label, Icon, run }, i) => (
          <button
            key={label}
            type="button"
            className={EDITOR_TOOL_CLASS}
            aria-label={label}
            title={label}
            aria-pressed={state?.active[i] ?? false}
            disabled={!editor}
            // Behåll fokus och markering i editorn
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor && run(editor.chain().focus()).run()}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
      </div>
      <FormControl>
        <div className={SUMMARY_EDITOR_BOX_CLASS} onClick={() => editor?.commands.focus()}>
          {state?.empty && placeholder && <span className={SUMMARY_PLACEHOLDER_CLASS}>{placeholder}</span>}
          <EditorContent editor={editor} />
        </div>
      </FormControl>
    </>
  );
}
