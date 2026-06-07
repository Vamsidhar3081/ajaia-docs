import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from "../api";
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import './DashboardPage.css';

export default function DashboardPage() {
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef();
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await axios.get('/api/documents');
      setOwned(res.data.owned);
      setShared(res.data.shared);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createDoc = async () => {
    try {
      const res = await axios.post('/api/documents', { title: 'Untitled Document', content: '<p></p>' });
      navigate(`/doc/${res.data.id}`);
    } catch {
      toast.error('Failed to create document');
    }
  };

  const deleteDoc = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document?')) return;
    try {
      await axios.delete(`/api/documents/${id}`);
      setOwned(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'md', 'docx'].includes(ext)) {
      toast.error('Only .txt, .md, and .docx files are supported');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post('/api/documents/upload', fd);
      toast.success('File imported as new document!');
      navigate(`/doc/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const filter = (docs) => docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const timeAgo = (ts) => {
    try { return formatDistanceToNow(new Date(ts * 1000), { addSuffix: true }); }
    catch { return 'recently'; }
  };

  const DocCard = ({ doc, role }) => (
    <div className="doc-card" onClick={() => navigate(`/doc/${doc.id}`)}>
      <div className="doc-card-icon">📄</div>
      <div className="doc-card-body">
        <div className="doc-card-title">{doc.title}</div>
        <div className="doc-card-meta">
          <span>{timeAgo(doc.updated_at)}</span>
          <span className="doc-card-owner">by {role === 'owner' ? 'you' : doc.owner_name}</span>
        </div>
      </div>
      <div className="doc-card-right">
        <span className={`badge badge-${role}`}>{role}</span>
        {role === 'owner' && (
          <button className="btn btn-ghost btn-sm doc-delete" onClick={(e) => deleteDoc(e, doc.id)} title="Delete">✕</button>
        )}
      </div>
    </div>
  );

  return (
    <div className="dash-root">
      <header className="dash-header">
        <div className="dash-brand">
          <div className="login-logo" style={{ width: 32, height: 32, fontSize: 16 }}>A</div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Ajaia Docs</span>
        </div>
        <div className="dash-search">
          <span className="dash-search-icon">🔍</span>
          <input className="input" placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, background: 'var(--surface2)' }} />
        </div>
        <div className="dash-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <span className="user-name">{user?.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-actions">
          <button className="btn btn-primary btn-lg" onClick={createDoc}>+ New Document</button>
          <button className="btn btn-secondary btn-lg" onClick={() => fileInputRef.current.click()} disabled={uploading}>
            {uploading ? '⏳ Importing...' : '📎 Import File'}
          </button>
          <input ref={fileInputRef} type="file" accept=".txt,.md,.docx" style={{ display: 'none' }} onChange={handleFileUpload} />
          <span className="upload-hint">Supports .txt, .md, .docx</span>
        </div>

        {loading ? (
          <div className="dash-loading">Loading your documents...</div>
        ) : (
          <>
            <section className="dash-section">
              <div className="dash-section-header">
                <h2>My Documents</h2>
                <span className="section-count">{filter(owned).length}</span>
              </div>
              {filter(owned).length === 0 ? (
                <div className="dash-empty">
                  <div className="dash-empty-icon">📝</div>
                  <p>{search ? 'No documents match your search' : 'No documents yet — create your first one!'}</p>
                </div>
              ) : (
                <div className="doc-list">{filter(owned).map(d => <DocCard key={d.id} doc={d} role="owner" />)}</div>
              )}
            </section>

            {shared.length > 0 && (
              <section className="dash-section">
                <div className="dash-section-header">
                  <h2>Shared with Me</h2>
                  <span className="section-count">{filter(shared).length}</span>
                </div>
                <div className="doc-list">{filter(shared).map(d => <DocCard key={d.id} doc={d} role={d.role} />)}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
