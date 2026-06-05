# TikTok LIVE Music Request Overlay

<p align="center">
  <img src="https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/tiktoklogo.png" width="180" />
</p>

<p align="center">
  Real-time TikTok LIVE music request overlay using YouTube audio playback.
</p>

---

## ✨ Features

- 🎵 TikTok LIVE `!req` music request
- ▶️ Real-time autoplay music
- 📃 Live queue system with smooth animations
- ⏭️ Admin skip & delete command
- 🖼️ Requester avatar support
- 📊 Real-time progress bar
- 🔥 Lightweight & optimized
- ⚡ Socket.IO realtime sync
- 🎬 OBS / TikTok Live Studio compatible
- 🧠 Auto next song
- 🛡️ Cooldown anti spam
- 🚫 Blocked words filter
- 🔔 Toast notification (req, skip, delete)
- 📱 Modern overlay UI — Syne + DM Sans font
- 🎨 Dynamic background color from thumbnail
- 💿 Spinning thumbnail + equalizer bar saat lagu diputar

---

## 📸 Preview

<img src="https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/previewlogo.png" width="100%" />

---

## 🚀 Installation

### 1. Clone Repository

```bash
git clone https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Server

```bash
node server.js
```

### 4. Expose Port (khusus TikTok Live Studio)

Kalau kamu live pakai TikTok, browser source harus bisa diakses dari luar localhost. Gunakan Cloudflare Tunnel:

```bash
cloudflared tunnel --url http://localhost:3000
```

Nanti akan muncul URL seperti ini:

```
https://example.generated-with-cloudflare-tunnel.com
```

URL itulah yang dipakai sebagai browser source di TikTok Live Studio.

---

## 🌐 Open Browser

```
http://localhost:3000
```

---

## 🎵 Enable Audio

Saat pertama kali buka overlay:

1. Klik tombol **Enable Audio**
2. Browser akan unlock autoplay
3. Music request akan langsung play otomatis

---

## 💬 TikTok Commands

### Request Lagu

```
!req nama lagu
```

Contoh:

```
!req multo
!req lalu biru
!req the art of chasing you
```

### Skip Lagu (Admin)

```
!skip
```

### Hapus Lagu dari Queue (Admin)

```
!del 2
```

Hapus lagu nomor 2 dari queue. Nomor sesuai urutan yang tampil di overlay.

### Hapus Semua Queue (Admin)

```
!del all
```

### Lihat Queue di Terminal (Admin)

```
!queue
```

---

## ⚙️ Configuration

Semua konfigurasi ada di bagian atas `server.js`:

```js
const PORT = 3000;
const TIKTOK_USERNAME = "your_username";
const ADMINS = ["your_username", "co_admin"];
const MAX_QUEUE = 50;
const REQUEST_COOLDOWN = 2500; // ms
```

### Blocked Words

Tambah kata yang ingin diblokir di array `BLOCKED_WORDS`:

```js
const BLOCKED_WORDS = [
  "jomok",
  "bokep",
  "ngentot",
  "dj",
  "dangdut",
  // tambah sesukamu
];
```

Kalau ada yang request lagu dengan judul mengandung kata tersebut, request langsung diabaikan dan tidak akan diproses ke YouTube. Filter ini **case-insensitive** (huruf besar/kecil tidak berpengaruh) dan berbasis substring, jadi kata `"dj"` akan menangkap `"dj santuy"`, `"dj remix"`, dan sejenisnya.

### MAX_QUEUE

Batas maksimal lagu yang bisa masuk queue sekaligus. Kalau sudah penuh, request baru diabaikan sampai ada lagu yang selesai diputar.

### REQUEST_COOLDOWN

Jeda waktu (dalam milidetik) sebelum user yang sama bisa request lagi. Default `2500` = 2.5 detik. Naikkan kalau chat terlalu rame dan mau lebih ketat.

---

## 🧠 How It Works

1. `server.js` jalan di komputermu dan konek ke TikTok LIVE lewat `tiktok-live-connector`
2. User kirim chat `!req nama lagu` di live
3. Server cek cooldown → cek max queue → cek blocked words
4. Kalau lolos semua, server cari lagu di YouTube lewat `yt-search`
5. Data lagu masuk ke `queue[]` dan disync ke browser lewat Socket.IO
6. Browser render queue dengan animasi, lalu putar audio lewat YouTube IFrame API

```
TikTok Live chat
      ↓
  server.js
  ├── cek cooldown
  ├── cek max queue
  ├── cek blocked words
  └── searchSong (yt-search)
      ↓
  Socket.IO → browser
      ↓
  YouTube IFrame API (audio)
```

---

## 🎨 UI / Animasi

| Kejadian              | Animasi                                        |
| --------------------- | ---------------------------------------------- |
| Lagu baru masuk queue | Item geser masuk dari kanan                    |
| Lagu diputar / next   | Item teratas keluar ke atas                    |
| !del                  | Item keluar ke kanan + flash merah             |
| Queue kosong          | Fade in teks kosong                            |
| Lagu sedang diputar   | Thumbnail berputar + equalizer bar             |
| Background overlay    | Warna otomatis dari thumbnail lagu             |
| Toast notifikasi      | Muncul di pojok kiri bawah (req, skip, delete) |

---

## 📦 Built With

- Node.js
- Express.js
- Socket.IO
- YouTube IFrame API
- tiktok-live-connector
- yt-search

---

## 📌 OBS / TikTok Live Studio Setup

Tambahkan **Browser Source** dengan URL:

```
http://localhost:3000
```

Atau kalau pakai Cloudflare Tunnel, gunakan URL yang di-generate. Set width dan height sesuai kebutuhan overlay-mu.

> Tips: kalau pakai Brave Browser atau ada adblocker, switch ke mode **Allow Ads & Trackers** untuk URL overlay ini. Karena cara kerja Socket.IO mirip tracker di mata adblocker — bukan karena ada iklan di overlay ini.

---

## ⚠️ Notes

- Project ini untuk keperluan edukasi dan personal streaming
- `tiktok-live-connector` bukan library resmi TikTok — sewaktu-waktu bisa berubah mengikuti update dari TikTok
- `yt-search` juga bukan API resmi Google — untuk penggunaan skala satu streamer sangat aman
- YouTube autoplay policy mungkin berbeda tergantung browser. Sudah ditest di Brave Browser untuk sesi live ~2 jam tanpa masalah

---

## ❤️ Support

Kalau project ini berguna buat kamu:

⭐ Star the repository

🍴 Fork the project

🛠️ Contribute improvements

---

## 📄 License

MIT License

---

## 👨‍💻 Author

Made with passion by satellacodes
