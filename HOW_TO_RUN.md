# How to Run — One ngrok URL for everything

## Every time you want to play:

### Terminal 1 — Build & start client
```
cd client
npm install
npm run build
```

### Terminal 2 — Start server (also serves the client)
```
cd server
npm install
npm start
```

### Terminal 3 — Start ngrok (just ONE tunnel)
```
ngrok http 3001
```

That's it!

- **You play at:** http://localhost:3001
- **Friend plays at:** https://facecloth-exhume-pang.ngrok-free.dev

Both connect to the same game server automatically.
