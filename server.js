const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const ytSearch = require("yt-search");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ─── CONFIG ───
// Ganti username dan admins sebelum run
const PORT = 3000;
const TIKTOK_USERNAME = "change this";
const ADMINS = ["change this"].map((x) => x.toLowerCase());
const MAX_QUEUE = 50;
const REQUEST_COOLDOWN = 5000; // ms

app.use(express.static("public"));

// ─── STATE ───
const queue = [];
let currentSong = null;
const cooldownMap = new Map();

// ─── TIKTOK ───
const tiktok = new WebcastPushConnection(TIKTOK_USERNAME);

// ─── HELPER: SEARCH LAGU ───
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
  // bug fix: jangan play kalau currentSong masih ada
  if (currentSong || queue.length === 0) return;
  currentSong = queue.shift();
  console.log("▶️ NOW PLAYING:", currentSong.title);
  io.emit("song-request", currentSong);
  io.emit("queue-update", queue);
}

// ─── IDLE STATE ───
function emitIdleState() {
  io.emit("song-ended");
}

// ─── ROUTE: NEXT ───
app.get("/next", (req, res) => {
  currentSong = null;
  if (queue.length === 0) {
    emitIdleState();
  }
  playNextSong();
  res.send("NEXT");
});

// ─── ROUTE: TEST (lagu pertama) ───
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
  // Emit toast ke overlay
  io.emit("song-queued", songData);
  if (!currentSong) playNextSong();
  res.send("TEST OK");
});

// ─── ROUTE: TEST2 (lagu kedua) ───
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
  // Kirim state awal ke client yang baru connect
  socket.emit("queue-update", queue);
  if (currentSong) {
    socket.emit("song-request", currentSong);
  } else {
    socket.emit("song-ended");
  }
});

// ─── TIKTOK CHAT HANDLER ───
async function start() {
  try {
    await tiktok.connect();
    console.log("✅ TikTok Connected");

    tiktok.on("chat", async (data) => {
      try {
        const message = data.comment?.trim();
        const username = data.uniqueId?.toLowerCase();
        if (!message || !username) return;

        // SKIP — hanya admin
        if (message === "!skip" && ADMINS.includes(username)) {
          const skipped = currentSong;
          currentSong = null;

          // bug fix: emit skip event dengan info lagu yang di-skip
          io.emit("song-skipped", skipped || null);

          if (queue.length === 0) emitIdleState();
          playNextSong();
          return;
        }

        // DEL — hanya admin
        if (message.startsWith("!del") && ADMINS.includes(username)) {
          const trimmed = message.trim().toLowerCase();

          // !del all
          if (trimmed === "!del all") {
            queue.length = 0;
            io.emit("queue-update", queue);
            io.emit("song-deleted", { index: "all", song: null });
            console.log("🗑️ ALL QUEUE CLEARED");
            return;
          }

          // !del N
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
          // Emit event delete supaya overlay bisa animasi yang tepat
          io.emit("song-deleted", { index, song: removed });
          return;
        }

        // QUEUE LOG — hanya admin
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
        console.log(`🔍 SEARCH: "${query}" oleh @${username}`);

        const song = await searchSong(query);
        if (!song) {
          console.log("❌ NO RESULT");
          return;
        }

        const songData = {
          ...song,
          queueId:
            Date.now().toString(36) + Math.random().toString(36).slice(2),
          requester: username,
          // bug fix: fallback ke github jika profilePictureUrl kosong
          avatar: data.profilePictureUrl || "https://github.com/github.png",
        };

        queue.push(songData);
        console.log(`✅ QUEUED: ${songData.title} (@${username})`);

        io.emit("queue-update", queue);
        // Emit event khusus buat toast
        io.emit("song-queued", songData);

        playNextSong();
      } catch (err) {
        console.log(err);
      }
    });
  } catch (err) {
    console.log("❌ TIKTOK ERROR:", err);
  }
}

start();

server.listen(PORT, () => {
  console.log(`\n🎵 Server running at http://localhost:${PORT}\n`);
});
