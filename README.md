# LANTERN

Local-first, privacy-first educational productivity tools — free, open source, and no trackers.

Visit the live demo on GitHub Pages: https://lantern-project.github.io/LANTERN/

---

Table of contents
- [About](#about)
- [Demo](#demo)
- [Key Features](#key-features)
- [Quick start](#quick-start)
- [Project structure](#project-structure)
- [Workspace & data model](#workspace--data-model)
- [Security & privacy](#security--privacy)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Contact](#contact)

---

## About

LANTERN is a small suite of local-first web tools aimed at learners, students and makers who want an offline-capable, privacy-respecting environment for notes, documents, and simple workspace management. It is MIT-licensed and built with plain HTML, CSS and JavaScript so you can run it anywhere — no server required.

Philosophy in short:
- Local-first: your data lives on your device.
- Transparent: open-source code you can inspect and host.
- No trackers: no analytics by default unless you enable them.

---

## Demo

A live copy of LANTERN is published via GitHub Pages:

https://lantern-project.github.io/LANTERN/

(If the Pages site is not yet enabled for this repository, open the local files in your browser to try LANTERN offline.)

---

## Key features

- Notes app: free-form note containers, rich-text, images, checklists, tags, and an inline drawing canvas.
- Workspaces: local workspaces that you create, unlock, lock, delete — all stored in browser localStorage.
- Themes: multiple visual themes (Walnut, Ash, Paper) with per-workspace preferences.
- Settings: export/import workspace settings JSON, reset defaults, and per-workspace toggles.
- Offline-friendly: single-page static app; works from the file system or any static host.
- Accessibility & keyboard-first interactions: keyboard shortcuts for fast workflows.

---

## Quick start

Clone the repository and open the site locally:

1. Clone
   ```
   git clone https://github.com/LANTERN-PROJECT/LANTERN.git
   cd LANTERN
   ```

2. Open in your browser
   - Double-click `index.html`
   - Or run a lightweight static server (recommended to avoid some browser restrictions):
     ```
     npx serve .
     ```
     then open the server URL (e.g., http://localhost:3000)

3. Try the Notes tool:
   - Open Tools → Notes (or visit `tools/notes/index.html`).
   - Create notebooks, pages and notes. Everything will be saved to localStorage for the current workspace.

4. Create a workspace
   - Click Workspace → Create Workspace, or visit the Login UI (`login/V2`) to create a local account and workspace.

---

## Project structure (high level)

- index.html — landing page and global workspace selector
- common/commonStyles.css — design system & variables
- settings/ — settings UI and management
- tools/notes/ — Notes application (HTML, CSS, JS)
  - tools/notes/index.html
  - tools/notes/noteStyle.css
  - tools/notes/noteScript.js
- login/ — login and workspace management flows (V1, V2)
- workspace/ — workspace unlock/create UI
- 404.html — friendly not-found page

---

## Workspace & data model

LANTERN stores user and workspace information in browser localStorage with per-workspace prefixes to keep settings and content separated.

Examples:
- `${userId}-lantern-account` — account metadata
- `${userId}-lantern-workspaces` — array of workspaces for a user
- `${workspaceId}-lantern-theme` — workspace-specific theme
- `${workspaceId}-lantern-notes-*` — notes data (tools store using workspace-prefixed keys)

Because data is local, be mindful:
- Back up settings or export from Settings → Export if you want to move or preserve data.
- If you lose your passphrase for a workspace, there is no server-side recovery.

---

## Security & privacy

- No external trackers or analytics by default.
- All workspace data is stored in your browser localStorage.
- Passwords/passphrases are hashed client-side in some flows (demo SHA-256 used for simplicity), but this project is not a replacement for secure, server-backed account systems.
- For sensitive data, consider using an encrypted container or storing data with an encryption layer you control.

---

## Contributing

We welcome contributions — especially from educators, designers and folks who want to improve usability.

Guidelines:
1. Fork the repository and create a branch for your change.
2. Make focused, small commits with clear messages.
3. Open a pull request describing the change, why it helps, and any screenshots if UI is affected.
4. If you propose a new feature that affects data format, explain migration or backward compatibility.

Suggested first issues:
- Improve autosave and undo behavior in Notes.
- Add export/import for notes (Markdown / JSON).
- Improve drawing performance and pressure/stylus support.

---

## Roadmap

Planned improvements:
- Better encryption of workspace data (optional local encryption).
- Markdown import/export and sync helpers (local-first sync adapters).
- Plugin architecture for extra tools (boards, todos, simple kanban).
- Improved mobile/touch UX for the notes canvas and drawing tools.

If you'd like to sponsor a feature or help implement it, open an issue or discussion.

---

## License

LANTERN is open source under the MIT License — see the LICENSE file in this repository.

---

## Acknowledgements

Built with plain HTML/CSS/JS and inspired by the need for private, offline-first learning tools. Thanks to everyone who files issues, proposes patches, and helps with testing.

---

## Contact

Project: https://github.com/LANTERN-PROJECT/LANTERN  
Pages demo: https://lantern-project.github.io/LANTERN/

If you have questions, file an issue in the GitHub repository or open a discussion there.

Enjoy — and keep your data yours. ✨
