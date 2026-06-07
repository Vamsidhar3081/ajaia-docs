# SUBMISSION.md

## Candidate
Vamsidhar Reddy Dandu — vamsidharreddydandu@gmail.com

## What's Included

| File/Folder | Description |
|-------------|-------------|
| `backend/` | Express.js API server |
| `backend/server.js` | App entry point |
| `backend/db.js` | SQLite setup with auto-seeding |
| `backend/routes/` | Auth, Documents, Shares routes |
| `backend/middleware/auth.js` | JWT middleware |
| `backend/tests/api.test.js` | Integration test suite |
| `frontend/` | React 18 frontend |
| `frontend/src/pages/` | LoginPage, DashboardPage, EditorPage |
| `frontend/src/components/ShareModal.js` | Sharing UI |
| `frontend/src/context/` | Auth + Toast context providers |
| `README.md` | Setup and run instructions |
| `ARCHITECTURE.md` | Design decisions and tradeoffs |
| `AI_WORKFLOW.md` | AI tool usage notes |
| `SUBMISSION.md` | This file |

## What Works End-to-End

- ✅ User registration and login (JWT auth)
- ✅ Create, rename, delete documents
- ✅ Rich-text editing: bold, italic, underline, strikethrough, headings (H1/H2/H3), bullet/numbered lists, blockquotes, inline code, text alignment
- ✅ Autosave with visual status indicator
- ✅ File import: .txt, .md, .docx → new editable document
- ✅ Share documents by email (view or edit permission)
- ✅ Separate "My Documents" and "Shared with Me" sections
- ✅ View-only enforcement (editor non-interactive for view shares)
- ✅ Remove shares
- ✅ Full persistence via SQLite (survives server restart)
- ✅ Automated API test suite (9 tests)
- ✅ Demo users pre-seeded (alice, bob, carol)

## What's Incomplete / Intentionally Skipped

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time collaboration | Skipped | Would require WebSockets; out of timebox scope |
| Image embedding in editor | Skipped | TipTap supports it; cut for time |
| Email notifications on share | Skipped | Requires SMTP/3rd party |
| Document version history | Skipped | Schema supports it; UI would take extra time |
| Deployed live URL | See below | Deployable to Railway/Render/Vercel |
| Export to PDF/Markdown | Stretch | Not implemented |

## Demo Credentials

| Email | Password | Role in Demo |
|-------|----------|--------------|
| alice@demo.com | password123 | Primary user, owns welcome doc |
| bob@demo.com | password123 | Secondary, can receive shares |
| carol@demo.com | password123 | Tertiary, can receive shares |

## To Demo Sharing Flow
1. Login as alice@demo.com
2. Open any document → click "Share"
3. Enter bob@demo.com → "Can edit" → Share
4. In another browser/incognito: login as bob@demo.com
5. See the document in "Shared with Me" section
6. Open it — Bob can edit; try with carol@demo.com and "View only"

## If I Had 2-4 More Hours

1. **Real-time collaborative cursors** — WebSocket + presence indicators
2. **Document version history** — snapshots on save, ability to revert
3. **Export to PDF** — browser print API or html2pdf
4. **Live deployment** — Railway.app (backend) + Vercel (frontend), ~30 min
5. **Image upload in editor** — TipTap Image extension + S3/local storage
