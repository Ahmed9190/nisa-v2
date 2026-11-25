import { useEffect, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Redo2,
  RemoveFormatting,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  dir?: 'ltr' | 'rtl';
  minHeight?: number;
  label?: string;
}

function cleanNbsp(html: string): string {
  return (html || '').replace(/&nbsp;|\u00a0/g, ' ');
}

export function RichTextEditor({
  value,
  onChange,
  dir = 'ltr',
  minHeight = 140,
  label,
}: RichTextEditorProps) {
  const [sourceMode, setSourceMode] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: cleanNbsp(value),
    editorProps: {
      attributes: {
        dir,
        style: `min-height: ${minHeight}px;`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  // Sync external prop resets without breaking active cursor edits
  useEffect(() => {
    if (!editor) return;
    const normalized = cleanNbsp(value);
    if (normalized !== cleanNbsp(editor.getHTML()) && !editor.isFocused) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [value, editor]);

  const promptLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL (leave empty to remove link):', prev);
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  if (!editor) return null;

  return (
    <div className="rte-wrapper">
      {label && <div className="rte-label">{label}</div>}
      <div className="rte-shell">
        <div className="rte-toolbar" role="toolbar" aria-label="Text formatting">
          {!sourceMode && (
            <>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                title="Heading 2"
              >
                <Heading2 size={15} />
              </button>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                title="Heading 3"
              >
                <Heading3 size={15} />
              </button>
              <span className="rte-sep" />
              <button
                type="button"
                className={`rte-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleBold().run()}
                title="Bold"
              >
                <Bold size={15} />
              </button>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                title="Italic"
              >
                <Italic size={15} />
              </button>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                title="Underline"
              >
                <UnderlineIcon size={15} />
              </button>
              <span className="rte-sep" />
              <button
                type="button"
                className={`rte-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                title="Bullet List"
              >
                <List size={15} />
              </button>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                title="Numbered List"
              >
                <ListOrdered size={15} />
              </button>
              <button
                type="button"
                className={`rte-btn ${editor.isActive('link') ? 'is-active' : ''}`}
                onClick={promptLink}
                title="Link"
              >
                <Link2 size={15} />
              </button>
              <span className="rte-sep" />
              <button
                type="button"
                className="rte-btn"
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                title="Clear Formatting"
              >
                <RemoveFormatting size={15} />
              </button>
              <button
                type="button"
                className="rte-btn"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                className="rte-btn"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo"
              >
                <Redo2 size={15} />
              </button>
            </>
          )}

          <button
            type="button"
            className={`rte-btn rte-source-btn ${sourceMode ? 'is-active' : ''}`}
            onClick={() => setSourceMode((v) => !v)}
            title="Toggle HTML Source"
          >
            <Code2 size={14} />
            <span>{sourceMode ? 'Visual' : 'HTML'}</span>
          </button>
        </div>

        {sourceMode ? (
          <textarea
            className="rte-source"
            dir="ltr"
            style={{ minHeight }}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              editor.commands.setContent(cleanNbsp(e.target.value), { emitUpdate: false });
            }}
          />
        ) : (
          <EditorContent editor={editor} className="rte-content" />
        )}
      </div>
    </div>
  );
}
