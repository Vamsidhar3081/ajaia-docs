const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbAll, dbRun } = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.post('/', (req, res) => {
  const { document_id, shared_with_email, permission } = req.body;
  if (!document_id || !shared_with_email) return res.status(400).json({ error: 'document_id and shared_with_email required' });

  const doc = dbGet('SELECT * FROM documents WHERE id = ?', [document_id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can share this document' });

  const targetUser = dbGet('SELECT * FROM users WHERE email = ?', [shared_with_email.toLowerCase().trim()]);
  if (!targetUser) return res.status(404).json({ error: 'User not found with that email' });
  if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Cannot share with yourself' });

  const perm = ['view', 'edit'].includes(permission) ? permission : 'view';
  const id = uuidv4();

  try {
    dbRun('INSERT OR REPLACE INTO document_shares (id, document_id, shared_with_id, permission) VALUES (?, ?, ?, ?)', [id, document_id, targetUser.id, perm]);
    const share = dbGet(`
      SELECT ds.*, u.name, u.email FROM document_shares ds
      JOIN users u ON u.id = ds.shared_with_id
      WHERE ds.document_id = ? AND ds.shared_with_id = ?
    `, [document_id, targetUser.id]);
    res.status(201).json(share);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:document_id/:user_id', (req, res) => {
  const doc = dbGet('SELECT * FROM documents WHERE id = ?', [req.params.document_id]);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (doc.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can remove shares' });
  dbRun('DELETE FROM document_shares WHERE document_id = ? AND shared_with_id = ?', [req.params.document_id, req.params.user_id]);
  res.json({ success: true });
});

module.exports = router;
