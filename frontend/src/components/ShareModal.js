import React, { useState } from 'react';
import axios from 'axios';
import { useToast } from '../context/ToastContext';
import './ShareModal.css';

export default function ShareModal({ doc, onClose, onUpdate }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('edit');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return;
    setLoading(true);
    try {
      await axios.post('/api/shares', {
        document_id: doc.id,
        shared_with_email: email.trim(),
        permission
      });
      toast.success(`Shared with ${email}`);
      setEmail('');
      // Refresh doc data
      const res = await axios.get(`/api/documents/${doc.id}`);
      onUpdate(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName}'s access?`)) return;
    try {
      await axios.delete(`/api/shares/${doc.id}/${userId}`);
      toast.success(`Removed ${userName}'s access`);
      const res = await axios.get(`/api/documents/${doc.id}`);
      onUpdate(res.data);
    } catch {
      toast.error('Failed to remove access');
    }
  };

  const shares = doc.shares || [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Share "{doc.title}"</div>

        <form onSubmit={handleShare}>
          <div className="form-group">
            <label className="form-label">Share with (email)</label>
            <input
              className="input"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Permission</label>
            <div className="permission-toggle">
              <button
                type="button"
                className={`perm-btn ${permission === 'view' ? 'active' : ''}`}
                onClick={() => setPermission('view')}
              >
                👁 View only
              </button>
              <button
                type="button"
                className={`perm-btn ${permission === 'edit' ? 'active' : ''}`}
                onClick={() => setPermission('edit')}
              >
                ✏️ Can edit
              </button>
            </div>
          </div>

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sharing...' : 'Share Document'}
          </button>
        </form>

        {shares.length > 0 && (
          <>
            <div className="divider" />
            <div className="share-label">People with access</div>
            <div className="share-list">
              {shares.map(s => (
                <div key={s.shared_with_id || s.id} className="share-row">
                  <div className="share-avatar">{s.name?.[0]?.toUpperCase()}</div>
                  <div className="share-info">
                    <div className="share-name">{s.name}</div>
                    <div className="share-email">{s.email}</div>
                  </div>
                  <span className={`badge badge-${s.permission}`}>{s.permission}</span>
                  <button
                    className="btn btn-ghost btn-sm share-remove"
                    onClick={() => handleRemove(s.shared_with_id || s.id, s.name)}
                    title="Remove access"
                  >✕</button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="divider" />
        <button className="btn btn-secondary" style={{ width: '100%' }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
