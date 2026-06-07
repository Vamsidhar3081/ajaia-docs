# AI Workflow Notes

## Tools Used
- **Claude (Anthropic)** — primary assistant for code generation, architecture decisions, and debugging
- **GitHub Copilot** — inline autocomplete during implementation

---

## Where AI Materially Sped Up Work

### 1. TipTap Extension Configuration (~45 min saved)
Setting up TipTap with multiple extensions (TextAlign, Color, Highlight, Link) and getting the toolbar to correctly reflect active states requires reading through documentation and trial-and-error. Claude generated the correct extension config and toolbar `isActive()` calls in one shot.

### 2. SQLite Schema + Seed Data (~20 min saved)
The database schema with proper foreign keys and ON DELETE CASCADE, plus the seed script that only runs once on first boot — Claude generated this correctly without me having to look up better-sqlite3's synchronous API.

### 3. Mammoth DOCX Conversion (~15 min saved)
The file upload route integrating mammoth for .docx, the markdown-to-HTML regex conversion for .md files, and the proper cleanup of temp files — this would've involved reading Mammoth docs carefully. Claude got it right first try.

### 4. JWT Auth Middleware + Route Protection (~25 min saved)
Standard but tedious: the middleware, the React ProtectedRoute component, and the axios default header setup. AI handled the boilerplate so I could focus on product logic.

---

## What I Changed or Rejected

### Changed: Autosave Strategy
AI initially suggested saving on every `onUpdate` call. I changed this to a **debounced approach (1.5s)** after the last keystroke — otherwise it would fire dozens of API calls per second while typing. I also added the save status indicator (Saving/Saved/Unsaved) which the AI didn't include.

### Changed: File Upload Error Handling
AI-generated upload route didn't clean up the temp file on error. I added `fs.unlinkSync(filePath)` in the catch block to prevent orphaned files.

### Rejected: AI's Suggested CSS Framework
Claude suggested using Tailwind CSS. I rejected this because:
1. CRA + Tailwind requires extra build config
2. Custom CSS gives full control over the dark theme design tokens
3. Faster to iterate on visual design without hunting for utility class names

### Rejected: Suggested WebSocket for Autosave
Claude initially suggested using Socket.io to sync saves across tabs. I rejected this — overkill for a 4-6 hour timebox. Last-write-wins HTTP autosave is fine for the scope.

### Rejected: Redux for State Management
Suggested for auth state. Context API is sufficient here; Redux would add unnecessary complexity.

---

## How I Verified Correctness

1. **Manual testing**: Every feature was tested by hand — login/register, creating/editing/deleting docs, sharing between demo accounts (opened two browser windows), file uploads of all three types.

2. **Automated tests**: `backend/tests/api.test.js` covers the core API surface with real HTTP calls to the running server.

3. **Cross-account sharing**: Logged in as alice, shared a doc with bob (edit) and carol (view). Logged in as bob — confirmed edits worked. Logged in as carol — confirmed view-only banner appeared and editor was non-interactive.

4. **File import**: Tested with a real .docx, a .md file with headings/bold/lists, and a plain .txt. All converted correctly.

5. **Persistence**: Stopped and restarted the backend server, confirmed documents and shares survived across restarts.

---

## Practical AI Usage Assessment

AI is fast for: boilerplate, standard patterns, documentation lookups, initial drafts.  
AI needs review for: error handling edge cases, UX details, performance decisions.  
AI should not decide: product scope, what to cut, visual design direction.
