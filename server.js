const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const ytSearch = require("yt-search");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ─── CONFIG ───
// change tiktok_username and admins before running the app
const PORT = 3000;
const TIKTOK_USERNAME = "changeTHIS";
const ADMINS = ["ADD_THIS_ARRAY_ADMIN"].map((x) => x.toLowerCase());
const MAX_QUEUE = 50;
const REQUEST_COOLDOWN = 2500;

//blocked word, you cant change anything you want
const BLOCKED_WORDS = [
  "jomok",
  "bokep",
  "ngentot",
  "dj",
  "kicau",
  "mania",
  "mbg",
  "dangdut",
  "jorok",
  "baon",
  "cikidap",
  "yamete",
  "asade",
  "kontol",
  "jembut",
];

app.use(express.static("public"));

// ─── STATE ───
const queue = [];
let currentSong = null;
const cooldownMap = new Map();

// ─── TIKTOK ───
// Pakai let bukan const supaya bisa diganti instance baru saat /restart
let tiktok = new WebcastPushConnection(TIKTOK_USERNAME);

// ─── HELPER: SEARCH ───
async function searchSong(query) {
  try {
    const result = await ytSearch(query);
    const video = result.videos[0];
    if (!video) return null;
    return {
      title: video.title,
      artist: video.author.name,
      thumbnail: video.thumbnail,
      videoId: video.videoId,
      durationText: video.timestamp,
      seconds: video.seconds,
    };
  } catch (err) {
    console.log(err);
    return null;
  }
}

// ─── PLAY NEXT ───
function playNextSong() {
  if (currentSong || queue.length === 0) return;
  currentSong = queue.shift();
  console.log("▶️ NOW PLAYING:", currentSong.title);
  io.emit("song-request", currentSong);
  io.emit("queue-update", queue);
}

// ─── IDLE ───
function emitIdleState() {
  io.emit("song-ended");
}

// ─── ROUTE: NEXT ───
app.get("/next", (req, res) => {
  currentSong = null;
  if (queue.length === 0) emitIdleState();
  playNextSong();
  res.send("NEXT");
});

// ─── ROUTE: RESTART ───
// Reset semua state tanpa menghentikan Node.js sama sekali
// Queue dikosongkan, currentSong di-reset, cooldown dihapus
// TikTok reconnect dengan instance baru supaya tidak ada listener ganda
app.get("/restart", async (req, res) => {
  console.log("🔄 RESTARTING...");

  // Reset semua state
  queue.length = 0;
  currentSong = null;
  cooldownMap.clear();

  // Beritahu semua overlay client untuk kembali ke idle
  io.emit("queue-update", queue);
  emitIdleState();

  // Putuskan koneksi TikTok yang lama
  try {
    tiktok.disconnect();
    console.log("🔌 TikTok disconnected");
  } catch (e) {
    // Abaikan error kalau memang sudah tidak terkoneksi
  }

  // Buat instance TikTok baru dan reconnect setelah jeda sebentar
  // Instance baru mencegah event listener terdaftar dobel
  setTimeout(async () => {
    tiktok = new WebcastPushConnection(TIKTOK_USERNAME);
    registerTikTokEvents();
    try {
      await tiktok.connect();
      console.log("✅ TikTok Reconnected");
    } catch (err) {
      console.log("❌ TikTok Reconnect Error:", err.message);
    }
  }, 1500);

  console.log("✅ APP RESTARTED");
  res.send("OK — State direset, TikTok sedang reconnect...");
});

// ─── ROUTE: TEST ───
app.get("/test", async (req, res) => {
  const song = await searchSong("lalu biru");
  if (!song) return res.send("NO SONG");
  const songData = {
    ...song,
    queueId: Date.now().toString(36) + Math.random().toString(36).slice(2),
    requester: "debug",
    avatar: "https://github.com/github.png",
  };
  queue.push(songData);
  io.emit("queue-update", queue);
  io.emit("song-queued", songData);
  if (!currentSong) playNextSong();
  res.send("TEST OK");
});

// ─── ROUTE: TEST2 ───
app.get("/test2", async (req, res) => {
  const song = await searchSong("the art of chasing you");
  if (!song) return res.send("NO SONG");
  const songData = {
    ...song,
    queueId: Date.now().toString(36) + Math.random().toString(36).slice(2),
    requester: "debug2",
    avatar: "https://github.com/satellacodes.png",
  };
  queue.push(songData);
  io.emit("queue-update", queue);
  io.emit("song-queued", songData);
  if (!currentSong) playNextSong();
  res.send("TEST OK");
});

// ─── SOCKET ───
io.on("connection", (socket) => {
  console.log("Overlay connected");
  socket.emit("queue-update", queue);
  if (currentSong) {
    socket.emit("song-request", currentSong);
  } else {
    socket.emit("song-ended");
  }
});

// ─── TIKTOK EVENTS ───
// Dipisah ke fungsi sendiri supaya bisa dipanggil ulang saat /restart
// tanpa membuat listener dobel di instance yang sama
function registerTikTokEvents() {
  tiktok.on("chat", async (data) => {
    try {
      const message = data.comment?.trim();
      const username = data.uniqueId?.toLowerCase();
      if (!message || !username) return;

      // SKIP — admin only
      if (message === "!skip" && ADMINS.includes(username)) {
        const skipped = currentSong;
        currentSong = null;
        io.emit("song-skipped", skipped || null);
        if (queue.length === 0) emitIdleState();
        playNextSong();
        return;
      }

      // DEL — admin only
      if (message.startsWith("!del") && ADMINS.includes(username)) {
        const trimmed = message.trim().toLowerCase();

        if (trimmed === "!del all") {
          queue.length = 0;
          io.emit("queue-update", queue);
          io.emit("song-deleted", { index: "all", song: null });
          console.log("🗑️ ALL QUEUE CLEARED");
          return;
        }

        const indexStr = message.replace(/!del\s*/i, "").trim();
        const index = parseInt(indexStr, 10);
        if (isNaN(index)) {
          console.log("INVALID DEL INDEX:", indexStr);
          return;
        }

        const queueIndex = index - 1;
        if (queueIndex < 0 || queueIndex >= queue.length) {
          console.log(`QUEUE INDEX ${index} TIDAK DITEMUKAN`);
          return;
        }
        const removed = queue.splice(queueIndex, 1)[0];
        console.log(`🗑️ REMOVED: ${removed.title}`);
        io.emit("queue-update", queue);
        io.emit("song-deleted", { index, song: removed });
        return;
      }

      // QUEUE LOG — admin only
      if (message === "!queue" && ADMINS.includes(username)) {
        console.log("========== QUEUE ==========");
        queue.forEach((s, i) => console.log(`${i + 1}. ${s.title}`));
        console.log("===========================");
        return;
      }

      // REQUEST — semua user
      if (!message.startsWith("!req ")) return;

      // COOLDOWN
      if (cooldownMap.has(username)) {
        const last = cooldownMap.get(username);
        if (Date.now() - last < REQUEST_COOLDOWN) {
          console.log(`⏳ COOLDOWN: @${username}`);
          return;
        }
      }
      cooldownMap.set(username, Date.now());

      // MAX QUEUE
      if (queue.length >= MAX_QUEUE) {
        console.log("❌ QUEUE FULL");
        return;
      }

      // QUERY
      const query = message.replace(/!req\s*/i, "").trim();
      if (!query) return;

      // CEK KATA BLOKIR
      const queryLower = query.toLowerCase();
      const isBlocked = BLOCKED_WORDS.some((word) => queryLower.includes(word));
      if (isBlocked) {
        console.log(`🚫 BLOCKED: "${query}" oleh @${username}`);
        return;
      }

      console.log(`🔍 SEARCH: "${query}" oleh @${username}`);
      const song = await searchSong(query);
      if (!song) {
        console.log("❌ NO RESULT");
        return;
      }

      const songData = {
        ...song,
        queueId: Date.now().toString(36) + Math.random().toString(36).slice(2),
        requester: username,
        avatar: data.profilePictureUrl || "https://github.com/github.png",
      };

      queue.push(songData);
      console.log(`✅ QUEUED: ${songData.title} (@${username})`);
      io.emit("queue-update", queue);
      io.emit("song-queued", songData);
      playNextSong();
    } catch (err) {
      console.log(err);
    }
  });
}

// ─── START ───
async function start() {
  try {
    await tiktok.connect();
    console.log("✅ TikTok Connected");
    registerTikTokEvents();
  } catch (err) {
    console.log("❌ TIKTOK ERROR:", err);
  }
}

// Bersihkan cooldownMap setiap 10 menit supaya tidak memory leak
// karena Map ini tidak pernah dihapus otomatis
setInterval(
  () => {
    const now = Date.now();
    for (const [user, time] of cooldownMap.entries()) {
      if (now - time > REQUEST_COOLDOWN * 2) cooldownMap.delete(user);
    }
  },
  10 * 60 * 1000,
);

start();

server.listen(PORT, () => {
  console.log(`\n🎵 Server running at http://localhost:${PORT}\n`);
});
