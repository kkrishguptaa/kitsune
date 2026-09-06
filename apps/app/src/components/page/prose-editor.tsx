'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ProseEditor({
  value,
  disabled,
  onChange,
  className,
}: {
  value: string;
  disabled?: boolean;
  onChange: (markdown: string) => void;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: markdownToHtml(value),
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(htmlToMarkdown(current.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[160px] focus:outline-none px-3 py-2',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = htmlToMarkdown(editor.getHTML());
    if (normalize(current) === normalize(value)) return;
    editor.commands.setContent(markdownToHtml(value), { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  if (!editor) {
    return (
      <div className="min-h-[160px] rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-transparent shadow-xs',
        disabled && 'opacity-60',
        className,
      )}
    >
      {!disabled ? (
        <div className="flex flex-wrap gap-1 border-b border-border px-2 py-1.5">
          <ToolbarButton
            label="B"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="I"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="H2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          />
          <ToolbarButton
            label="•"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="1."
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="<>"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      className="h-7 px-2 font-mono text-xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Minimal markdown ↔ HTML bridge for starter kit nodes. */
function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeBuffer: string[] = [];

  const closeList = () => {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  for (const raw of lines) {
    const line = raw ?? '';
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
        codeBuffer = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) {
      closeList();
      html.push(`<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^###\s+/.test(line)) {
      closeList();
      html.push(`<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        closeList();
        html.push('<ul>');
        inList = 'ul';
      }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        closeList();
        html.push('<ol>');
        inList = 'ol';
      }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>`);
      continue;
    }
    if (line.trim() === '') {
      closeList();
      continue;
    }
    closeList();
    html.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
  }
  return html.join('') || '<p></p>';
}

function htmlToMarkdown(html: string): string {
  const withBreaks = html
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<h2[^>]*>/gi, '## ')
    .replace(/<\/h2>/gi, '\n\n')
    .replace(/<h3[^>]*>/gi, '### ')
    .replace(/<\/h3>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<pre><code>/gi, '```\n')
    .replace(/<\/code><\/pre>/gi, '\n```\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    .replace(/<[^>]+>/g, '');
  return decodeHtml(withBreaks).replace(/\n{3,}/g, '\n\n').trim();
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function decodeHtml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}
