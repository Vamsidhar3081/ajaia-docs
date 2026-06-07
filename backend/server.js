const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initDB().then(() => {
  const authRoutes = require('./routes/auth');
  const documentRoutes = require('./routes/documents');
  const shareRoutes = require('./routes/shares');

  app.use('/api/auth', authRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/shares', shareRoutes);

  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});

module.exports = app;
