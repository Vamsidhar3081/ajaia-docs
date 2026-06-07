import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from "../api";app.use
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import ShareModal from '../components/ShareModal';
import './EditorPage.css';

const AUTOSAVE_DELAY = 1500;

export default function EditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving | unsaved
  const [showShare, setShowShare] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const saveTimer = useRef(null);
  const titleRef = useRef();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    onUpdate: () => {
      setSaveStatus('unsaved');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(autoSave, AUTOSAVE_DELAY);
    },
    editable: true,
  });

  const autoSave = useCallback(async () => {
    if (!editor || !doc) return;
    setSaveStatus('saving');
    try {
      await axios.put(`/api/documents/${id}`, {
        title,
        content: editor.getHTML()
      });
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('unsaved');
      if (err.response?.status === 403) toast.error('You only have view access');
    }
  }, [editor, doc, id, title]);

  useEffect(() => {
    axios.get(`/api/documents/${id}`)
      .then(res => {
        setDoc(res.data);
        setTitle(res.data.title);
        if (editor && res.data.content) {
          editor.commands.setContent(res.data.content);
        }
        // Set read-only for view-only shares
        if (res.data.role === 'view') {
          editor?.setEditable(false);
        }
      })
      .catch(err => {
        if (err.response?.status === 403) toast.error('Access denied');
        else toast.error('Document not found');
        navigate('/dashboard');
      });
  }, [id, editor]);

  useEffect(() => {
    if (editor && doc?.content) {
      editor.commands.setContent(doc.content);
    }
  }, [doc]);

  const handleTitleSave = async () => {
    setEditingTitle(false);
    if (!title.trim()) setTitle('Untitled Document');
    setSaveStatus('saving');
    try {
      await axios.put(`/api/documents/${id}`, { title: title.trim() || 'Untitled Document', content: editor?.getHTML() });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('unsaved');
    }
  };

  const isOwner = doc?.owner_id === user?.id;
  const canEdit = isOwner || doc?.role === 'edit';

  const ToolbarBtn = ({ onClick, active, title: tip, children }) => (
    <button className={`toolbar-btn ${active ? 'active' : ''}`} onClick={onClick} title={tip} type="button">
      {children}
    </button>
  );

  if (!doc || !editor) return (
    <div className="editor-loading">
      <div>Loading document...</div>
    </div>
  );

  return (
    <div className="editor-root">
      {/* Top bar */}
      <header className="editor-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>

        <div className="editor-title-wrap">
          {editingTitle && canEdit ? (
            <input
              ref={titleRef}
              className="editor-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
              autoFocus
            />
          ) : (
            <div className="editor-title" onClick={() => canEdit && setEditingTitle(true)} title={canEdit ? 'Click to rename' : ''}>
              {title}
            </div>
          )}

          <div className={`save-status save-${saveStatus}`}>
            {saveStatus === 'saving' && '⏳ Saving...'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'unsaved' && '● Unsaved'}
          </div>
        </div>

        <div className="editor-header-right">
          {!canEdit && <span className="badge badge-view">View only</span>}
          {isOwner && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowShare(true)}>
              👥 Share
            </button>
          )}
        </div>
      </header>

      {/* Toolbar */}
      {canEdit && (
        <div className="toolbar">
          <div className="toolbar-group">
            <select
              className="toolbar-select"
              value={
                editor.isActive('heading', { level: 1 }) ? '1' :
                editor.isActive('heading', { level: 2 }) ? '2' :
                editor.isActive('heading', { level: 3 }) ? '3' : '0'
              }
              onChange={e => {
                const v = e.target.value;
                if (v === '0') editor.chain().focus().setParagraph().run();
                else editor.chain().focus().toggleHeading({ level: parseInt(v) }).run();
              }}
            >
              <option value="0">Paragraph</option>
              <option value="1">Heading 1</option>
              <option value="2">Heading 2</option>
              <option value="3">Heading 3</option>
            </select>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><b>B</b></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><i>I</i></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><u>U</u></ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><s>S</s></ToolbarBtn>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left">⬅</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Center">☰</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right">➡</ToolbarBtn>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">• List</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered list">1. List</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Quote">" "</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">{`</>`}</ToolbarBtn>
          </div>

          <div className="toolbar-divider" />

          <div className="toolbar-group">
            <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo">↩</ToolbarBtn>
            <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo">↪</ToolbarBtn>
          </div>
        </div>
      )}

      {/* Editor content */}
      <div className="editor-scroll">
        <div className="editor-page">
          {doc?.role === 'view' && (
            <div className="view-banner">👁 You have view-only access to this document</div>
          )}
          <EditorContent editor={editor} className="editor-content" />
        </div>
      </div>

      {showShare && (
        <ShareModal doc={doc} onClose={() => setShowShare(false)} onUpdate={d => setDoc(d)} />
      )}
    </div>
  );
}
