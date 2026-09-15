# Ready-to-Run Chat Application — Go Live

This version is designed specifically to run **directly with VS Code Live Server / Go Live**.

## Run

1. Extract the ZIP.
2. Open the folder in VS Code.
3. Right-click `frontend/index.html`.
4. Select **Open with Live Server**.
5. Open the resulting page in two browser tabs/windows.
6. Register two different usernames and enter the same room.
7. Chat in real time.

No Python installation, npm install, database server, or terminal command is required.

## Architecture

Because VS Code Live Server only serves static files, it cannot start a Python server automatically.

Therefore this Go-Live edition implements the backend/data layer in the browser:

- `backend/chat_backend.js` — browser-side chat/auth/history backend module
- IndexedDB — persistent local database
- BroadcastChannel — real-time synchronization between tabs/windows on the same browser profile
- localStorage — session data
- Web Notifications API — desktop notifications

This means it is **ready for Go Live**, but the realtime transport is local to the browser/origin. It is not a production internet chat server.

## Features

- Registration and login
- Password hashing using Web Crypto PBKDF2
- Multiple rooms
- Create/join rooms
- Real-time bidirectional chat between tabs/windows
- Message timestamps
- Message history
- Join/leave/disconnect notifications
- Emoji shortcodes
- Desktop notifications
- Responsive GUI
- Security transparency

## Security transparency

This is an educational local Go-Live application.

- Messages are stored locally in IndexedDB.
- They are not end-to-end encrypted.
- This application does not provide a real internet-facing server.
- Passwords are stored as PBKDF2-derived hashes, but this should not be treated as production authentication.
- For a real multi-device deployment, replace the browser backend with a Python/Node/WebSocket server and HTTPS/WSS.

## Project structure

chat_application/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── backend/
│   └── chat_backend.js
└── README.md
