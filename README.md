# TikTok LIVE Music Request Overlay

<p align="center">
  <img src="https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/tiktoklogo.png" width="180" />
</p>

<p align="center">
  Real-time TikTok LIVE music request overlay using YouTube audio playback.
</p>

I am Indonesian, I hope you can use translate if you can't understand my language.

> [!NOTE]
> Before starting, I would like to thank the creators of tiktok-live-connector and eulerstream.

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
- 🐳 Docker ready

---

## 📸 Preview

<img src="https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay/blob/main/preview/previewlogo.png" width="100%" />

---

## 🚀 Installation

Ada dua cara menjalankan project ini — **manual dengan Node.js** atau **lewat Docker**.

---

## BUAT APIKEY DULU DI eulerstream.com

---

### 🟢 Cara 1 — Manual (Node.js)

#### 1. Clone Repository

```bash
git clone https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay.git
cd TikTok-LIVE-Music-Request-Overlay
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Start Server

```bash
node server.js
```

---

### 🐳 Cara 2 — Docker (Recommended untuk VPS)

Pastikan Docker sudah terinstall di VPS kamu. Kalau belum:

```bash
# CentOS / RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 1. Clone Repository

```bash
git clone https://github.com/satellacodes/TikTok-LIVE-Music-Request-Overlay.git
cd TikTok-LIVE-Music-Request-Overlay
```

#### 2. Build Docker Image

```bash
docker build -t tiktok-music-overlay .
```

#### 3. Run Container

```bash
docker run -d \
  --name music-overlay \
  --restart unless-stopped \
  -p 3000:3000 \
  tiktok-music-overlay
```

Penjelasan flag:

| Flag                       | Fungsi                              |
| -------------------------- | ----------------------------------- |
| `-d`                       | Jalankan di background (detached)   |
| `--name music-overlay`     | Nama container biar gampang diingat |
| `--restart unless-stopped` | Auto restart kalau VPS reboot       |
| `-p 3000:3000`             | Expose port 3000 ke luar            |

#### 4. Cek Status Container

```bash
docker ps
```

#### 5. Lihat Log

```bash
docker logs -f music-overlay
```

#### Perintah Docker Lainnya

```bash
# Stop container
docker stop music-overlay

# Start lagi
docker start music-overlay

# Restart
docker restart music-overlay

# Hapus container
docker rm -f music-overlay

# Rebuild setelah ada perubahan kode
docker rm -f music-overlay
docker build -t tiktok-music-overlay .
docker run -d --name music-overlay --restart unless-stopped -p 3000:3000 tiktok-music-overlay
```

---

### 🖥️ Menggunakan tmux (Recommended untuk VPS tanpa Docker)

Kalau tidak pakai Docker dan mau server tetap jalan meski terminal ditutup, gunakan tmux:

#### Install tmux

```bash
# CentOS / RHEL
sudo yum install -y tmux
```

#### Buat Session Baru

```bash
tmux new -s music-overlay
```

#### Jalankan Server di Dalam Session

```bash
node server.js
```

#### Detach dari Session (server tetap jalan di background)

```
Ctrl + B, lalu tekan D
```

#### Kembali ke Session

```bash
tmux attach -t music-overlay
```

#### Perintah tmux Lainnya

```bash
# Lihat semua session yang aktif
tmux ls

# Hapus session
tmux kill-session -t music-overlay

# Buat window baru di dalam session (bisa buka terminal lain sambil server jalan)
Ctrl + B, lalu tekan C

# Pindah antar window
Ctrl + B, lalu tekan angka (0, 1, 2, dst)

# Split terminal horizontal
Ctrl + B, lalu tekan "

# Split terminal vertikal
Ctrl + B, lalu tekan %

# Pindah antar panel
Ctrl + B, lalu tekan panah arah
```

> Tips: pakai tmux + Docker bisa dikombinasi. Jalankan `docker logs -f music-overlay` di dalam tmux session supaya bisa monitor log sambil tetap bisa buka terminal lain.

---

### ☁️ Expose Port dengan Cloudflare Tunnel

Wajib kalau mau pakai sebagai browser source di TikTok Live Studio dari luar localhost.

#### Install cloudflared (CentOS)

```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.rpm
sudo rpm -ivh cloudflared-linux-amd64.rpm
```

#### Jalankan Tunnel

```bash
cloudflared tunnel --url http://localhost:3000
```

Nanti akan muncul URL seperti ini:

```
https://example.generated-with-cloudflare-tunnel.com
```

URL itulah yang dipakai sebagai browser source di TikTok Live Studio.

> Kalau mau tunnel tetap jalan di background, jalankan di dalam tmux session tersendiri:

```bash
tmux new -s cloudflare
cloudflared tunnel --url http://localhost:3000
# Ctrl + B, D untuk detach
```

---

## 🌐 Open Browser

```
http://localhost:3000
```

Atau kalau di VPS, akses lewat URL Cloudflare Tunnel yang di-generate.

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

Kalau ada yang request lagu dengan judul mengandung kata tersebut, request langsung diabaikan dan tidak diproses ke YouTube. Filter ini **case-insensitive** dan berbasis substring — kata `"dj"` akan menangkap `"dj santuy"`, `"dj remix"`, dan sejenisnya.

### MAX_QUEUE

Batas maksimal lagu yang bisa masuk queue sekaligus. Kalau sudah penuh, request baru diabaikan sampai ada lagu yang selesai diputar.

### REQUEST_COOLDOWN

Jeda waktu (dalam milidetik) sebelum user yang sama bisa request lagi. Default `2500` = 2.5 detik. Naikkan kalau chat terlalu rame dan mau lebih ketat.

---

## 🧠 How It Works

1. `server.js` jalan di komputermu / VPS dan konek ke TikTok LIVE lewat `tiktok-live-connector`
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
| `!del`                | Item keluar ke kanan + flash merah             |
| Queue kosong          | Fade in teks kosong                            |
| Lagu sedang diputar   | Thumbnail berputar + equalizer bar             |
| Background overlay    | Warna otomatis diambil dari thumbnail lagu     |
| Toast notifikasi      | Muncul di pojok kiri bawah (req, skip, delete) |

---

## 📦 Built With

- Node.js
- Express.js
- Socket.IO
- YouTube IFrame API
- tiktok-live-connector
- yt-search
- Docker

---

## 📌 OBS / TikTok Live Studio Setup

Tambahkan **Browser Source** dengan URL:

```
http://localhost:3000
```

Atau kalau pakai Cloudflare Tunnel, gunakan URL yang di-generate tadi.

> Tips: kalau pakai Brave Browser atau ada adblocker, switch ke mode **Allow Ads & Trackers** untuk URL overlay ini. Karena cara kerja Socket.IO mirip tracker di mata adblocker — bukan karena ada iklan di overlay ini.

---

## ⚠️ Notes

- Project ini untuk keperluan edukasi dan personal streaming
- `tiktok-live-connector` bukan library resmi TikTok — sewaktu-waktu bisa berubah mengikuti update dari TikTok
- `yt-search` juga bukan API resmi Google — untuk penggunaan skala satu streamer sangat aman
- YouTube autoplay policy mungkin berbeda tergantung browser. Sudah ditest di Brave Browser untuk sesi live ~2 jam tanpa masalah
- Kalau jalan di VPS, pastikan port 3000 sudah dibuka di firewall:

```bash
# CentOS firewalld
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

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
