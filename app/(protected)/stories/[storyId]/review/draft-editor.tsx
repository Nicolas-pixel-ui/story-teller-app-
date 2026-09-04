"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useReview } from './review-context';
import { useEffect } from 'react';

export function DraftEditor() {
    const { draftContent, setDraftContent, saveDraft, isGenerating } = useReview();

    const editor = useEditor({
        extensions: [StarterKit],
        content: draftContent,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'story-draft-editor max-w-none focus:outline-none min-h-[500px] p-4',
            },
        },
        onUpdate: ({ editor }) => {
            // Tiptap returns HTML, but our fallback is Markdown/Plaintext. 
            // We should store what the user sees.
            setDraftContent(editor.getHTML());
        },
        onBlur: () => {
            saveDraft();
        }
    });

    useEffect(() => {
        if (editor && draftContent) {
            const currentHTML = editor.getHTML();
            // Simple check: if content is drastically different, update it.
            // This handles the "Generate Draft" case where draftContent becomes a new large string
            // while preserving small user edits if they match.
            if (currentHTML !== draftContent) {
                 // Force update if we are not focused (external update)
                 // OR if the content is completely different (likely a new generation replacing the old one)
                 const isNewGeneration = Math.abs(currentHTML.length - draftContent.length) > 20;
                 
                 if (!editor.isFocused || isNewGeneration) {
                     // Parse HTML if it looks like HTML (starts with <)
                     if (draftContent.trim().startsWith('<')) {
                         editor.commands.setContent(draftContent, { emitUpdate: true });
                     } else {
                         // Treat as Markdown/Text
                         editor.commands.setContent(draftContent, { emitUpdate: true });
                     }
                 }
            }
        }
    }, [draftContent, editor]);

    if (!editor) return null;

    return (
        <div className="story-draft-shell rounded-lg overflow-hidden shadow-sm">
            <div className="story-draft-toolbar p-2 flex gap-2 overflow-x-auto">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`px-2 py-1 text-sm rounded ${editor.isActive('bold') ? 'story-draft-toolbar-active' : ''}`}>Bold</button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`px-2 py-1 text-sm rounded ${editor.isActive('italic') ? 'story-draft-toolbar-active' : ''}`}>Italic</button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`px-2 py-1 text-sm rounded ${editor.isActive('heading', { level: 1 }) ? 'story-draft-toolbar-active' : ''}`}>H1</button>
                <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`px-2 py-1 text-sm rounded ${editor.isActive('heading', { level: 2 }) ? 'story-draft-toolbar-active' : ''}`}>H2</button>
                <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`px-2 py-1 text-sm rounded ${editor.isActive('bulletList') ? 'story-draft-toolbar-active' : ''}`}>List</button>
            </div>
            <div className="relative">
                 {isGenerating && (
                    <div className="absolute inset-0 story-draft-overlay flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="story-draft-generating font-medium animate-pulse">Generating Draft...</div>
                    </div>
                )}
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
