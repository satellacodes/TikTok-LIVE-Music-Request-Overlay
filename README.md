# TikTok LIVE Music Request Overlay

<p align="center">
  <img src=""https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/tiktoklogo.png" width="180" />
</p>

<p align="center">
  Real-time TikTok LIVE music request overlay using YouTube audio playback.
</p>

---

## ✨ Features

- 🎵 TikTok LIVE `!req` music request
- ▶️ Real-time autoplay music
- 📃 Live queue system
- ⏭️ Admin skip command
- 🖼️ Requester avatar support
- 📊 Real-time progress bar
- 🔥 Lightweight & optimized
- ⚡ Socket.IO realtime sync
- 🎬 OBS / TikTok Live Studio compatible
- 🧠 Auto next song
- 🛡️ Cooldown anti spam
- 📱 Modern overlay UI

---

## 📸 Preview

<img src="https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/previewlogo.png" width="100%" />

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone https://github.com/YOUR_USERNAME/tiktok-live-music-overlay.git
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Start Server

```bash
node server.js
```

---

### 4. If u live with tiktok, expose port 3000 with cloudflare tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

- the url generated with cloudflare tunnel is using for tiktok source display

```bash
Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):
https://example.generated-with-cloudflare-tunnel.com
```

---

# 🌐 Open Browser

```text
http://localhost:3000
```

---

# 🎵 Enable Audio

When opening the overlay for the first time:

1. Click `Enable Audio`
2. Browser will unlock autoplay
3. Music requests will play automatically

---

# 💬 TikTok Commands

## Request Song

```text
!req song name
```

Example:

```text
!req multo
```

---

## Skip Song (Admin)

```text
!skip
```

---

# ⚙️ Configuration

Inside `server.js`

```js
const TIKTOK_USERNAME = "your_username";
```

Admin users:

```js
const ADMINS = ["your_username"];
```

Cooldown:

```js
const REQUEST_COOLDOWN = 5000;
```

---

# 🧠 How It Works

1. TikTok LIVE chat is connected using:
   - `tiktok-live-connector`

2. User sends:

   ```text
   !req song name
   ```

3. Server searches song using:
   - YouTube Search

4. Queue syncs using:
   - Socket.IO

5. Browser plays audio using:
   - YouTube IFrame API

---

# 📦 Built With

- Node.js
- Express.js
- Socket.IO
- YouTube IFrame API
- tiktok-live-connector
- yt-search

---

# 📌 OBS / TikTok Live Studio

Use browser source:

```text
http://localhost:3000
```

Or expose with:

for my testing im using cloudflare tunnel

- Cloudflare Tunnel

```terminal
cloudflared tunnel --url http://localhost:3000
```

---

# ⚠️ Notes

This project is for educational purposes.

YouTube autoplay policies may differ depending on browser settings.

---

# ❤️ Support

If you like this project:

⭐ Star the repository

🍴 Fork the project

🛠️ Contribute improvements

---

# 📄 License

MIT License

---

# 👨‍💻 Author

Made with passion by satellacodes
