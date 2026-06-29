import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  TikTokLiveConnection,
  SignConfig,
  WebcastEvent,
} from "tiktok-live-connector";
import ytSearch from "yt-search";

// IQRO BACALAH
// ganti TIKTOK_USERNAME, EULER_API_KEY, dan ADMINS sebelum menjalankan
const PORT = 3000;
const TIKTOK_USERNAME = "";
const EULER_API_KEY = "euler_APIKEY"; // ← dari https://eulerstream.com/dashboard

const ADMINS = [].map((x) => x.toLowerCase());

const MAX_QUEUE = 50;
const REQUEST_COOLDOWN = 2500;

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

const VERBOSE = process.env.VERBOSE === "1";
const log = {
  info: (...a) => console.log(...a),
  event: (...a) => {
    if (VERBOSE) console.log(...a);
  },
  err: (...a) => {
    if (VERBOSE) console.error(...a);
  },
};

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static("public"));

const queue = [];
let currentSong = null;
const cooldownMap = new Map();

SignConfig.apiKey = EULER_API_KEY;

function createClient() {
  return new TikTokLiveConnection(TIKTOK_USERNAME, {
    processInitialData: false,
  });
}

let tiktok = createClient();

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
    log.err(err);
    return null;
  }
}

function playNextSong() {
  if (currentSong || queue.length === 0) return;
  currentSong = queue.shift();
  log.info("▶️  NOW PLAYING:", currentSong.title);
  io.emit("song-request", currentSong);
  io.emit("queue-update", queue);
}

function emitIdleState() {
  io.emit("song-ended");
}

app.get("/next", (req, res) => {
  currentSong = null;
  if (queue.length === 0) emitIdleState();
  playNextSong();
  res.send("NEXT");
});

app.get("/restart", async (req, res) => {
  log.info("🔄 RESTARTING...");

  queue.length = 0;
  currentSong = null;
  cooldownMap.clear();

  io.emit("queue-update", queue);
  emitIdleState();

  try {
    tiktok.disconnect();
    log.info("🔌 TikTok disconnected");
  } catch (e) {}

  setTimeout(async () => {
    tiktok = createClient();
    registerTikTokEvents();
    try {
      await tiktok.connect();
      log.info("✅ TikTok Reconnected");
    } catch (err) {
      log.info("❌ TikTok Reconnect Error:", err.message);
    }
  }, 1500);

  log.info("✅ APP RESTARTED");
  res.send("OK — State direset, TikTok sedang reconnect...");
});

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

app.get("/test-bulk", async (req, res) => {
  const DEFAULT_SONGS = [
    "akad - payungteduh",
    "keepyousafe - yahya",
    "blue jeans - gangga",
    "Satu satunya - hivi",
    "Tersenyum untuk siapa - hivi",
    "C.H.R.I.S.Y.E",
  ];

  const queries = req.query.q
    ? req.query.q
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6)
    : DEFAULT_SONGS;

  const results = [];

  for (const query of queries) {
    const song = await searchSong(query);
    if (!song) {
      log.info(`❌ BULK: tidak ditemukan untuk "${query}"`);
      continue;
    }
    const songData = {
      ...song,
      queueId: Date.now().toString(36) + Math.random().toString(36).slice(2),
      requester: "ADMIN",
      avatar: "https://github.com/github.png",
    };
    queue.push(songData);
    io.emit("song-queued", songData);
    results.push(songData.title);
    log.info(`✅ BULK QUEUED: ${songData.title}`);
  }

  io.emit("queue-update", queue);
  if (!currentSong) playNextSong();

  res.json({
    queued: results.length,
    songs: results,
  });
});

io.on("connection", (socket) => {
  log.info("🖥️  Overlay connected");
  socket.emit("queue-update", queue);
  if (currentSong) {
    socket.emit("song-request", currentSong);
  } else {
    socket.emit("song-ended");
  }
});

function registerTikTokEvents() {
  tiktok.on(WebcastEvent.CHAT, async (data) => {
    try {
      const message = (data.content || data.comment || "").trim();
      const u = data.user || data;
      const username = (u.displayId || u.uniqueId || "").toLowerCase();
      if (!message || !username) return;

      if (message === "!skip" && ADMINS.includes(username)) {
        const skipped = currentSong;
        currentSong = null;
        io.emit("song-skipped", skipped || null);
        if (queue.length === 0) emitIdleState();
        playNextSong();
        return;
      }

      if (message.startsWith("!del") && ADMINS.includes(username)) {
        const trimmed = message.trim().toLowerCase();

        if (trimmed === "!del all") {
          queue.length = 0;
          io.emit("queue-update", queue);
          io.emit("song-deleted", { index: "all", song: null });
          log.info("🗑️  ALL QUEUE CLEARED");
          return;
        }

        const indexStr = message.replace(/!del\s*/i, "").trim();
        const index = parseInt(indexStr, 10);
        if (isNaN(index)) {
          log.event("INVALID DEL INDEX:", indexStr);
          return;
        }

        const queueIndex = index - 1;
        if (queueIndex < 0 || queueIndex >= queue.length) {
          log.event(`QUEUE INDEX ${index} TIDAK DITEMUKAN`);
          return;
        }
        const removed = queue.splice(queueIndex, 1)[0];
        log.info(`🗑️  REMOVED: ${removed.title}`);
        io.emit("queue-update", queue);
        io.emit("song-deleted", { index, song: removed });
        return;
      }

      if (message === "!queue" && ADMINS.includes(username)) {
        log.info("========== QUEUE ==========");
        queue.forEach((s, i) => log.info(`${i + 1}. ${s.title}`));
        log.info("===========================");
        return;
      }

      if (!message.startsWith("!req ")) return;

      if (cooldownMap.has(username)) {
        const last = cooldownMap.get(username);
        if (Date.now() - last < REQUEST_COOLDOWN) {
          log.event(`⏳ COOLDOWN: @${username}`);
          return;
        }
      }
      cooldownMap.set(username, Date.now());

      if (queue.length >= MAX_QUEUE) {
        log.info("❌ QUEUE FULL");
        return;
      }

      const query = message.replace(/!req\s*/i, "").trim();
      if (!query) return;

      const queryLower = query.toLowerCase();
      const isBlocked = BLOCKED_WORDS.some((word) => queryLower.includes(word));
      if (isBlocked) {
        log.info(`🚫 BLOCKED: "${query}" oleh @${username}`);
        return;
      }

      log.info(`🔍 SEARCH: "${query}" oleh @${username}`);
      const song = await searchSong(query);
      if (!song) {
        log.info("❌ NO RESULT");
        return;
      }

      const avatar =
        u.avatarThumb?.urlList?.[0] ||
        u.profilePictureUrl ||
        "https://github.com/github.png";

      const songData = {
        ...song,
        queueId: Date.now().toString(36) + Math.random().toString(36).slice(2),
        requester: username,
        avatar,
      };

      queue.push(songData);
      log.info(`✅ QUEUED: ${songData.title} (@${username})`);
      io.emit("queue-update", queue);
      io.emit("song-queued", songData);
      playNextSong();
    } catch (err) {
      log.err(err);
    }
  });

  tiktok.on("disconnected", () => {
    log.info("⚠️  Disconnected — retry dalam 30 detik...");
    setTimeout(async () => {
      try {
        tiktok = createClient();
        registerTikTokEvents();
        await tiktok.connect();
        log.info("✅ Auto-reconnect berhasil");
      } catch (e) {
        log.info("❌ Auto-reconnect gagal:", e.message);
      }
    }, 30_000);
  });

  tiktok.on("error", (err) => {
    log.info("⚠️  TikTok error:", err?.message || err);
  });
}

async function start() {
  if (!EULER_API_KEY || EULER_API_KEY === "GANTI_DENGAN_API_KEY_KAMU") {
    log.info("❌ EULER_API_KEY belum diisi!");
    log.info("   Dari: https://eulerstream.com/dashboard → API Keys");
    process.exit(1);
  }

  try {
    await tiktok.connect();
    log.info("✅ TikTok Connected");
    registerTikTokEvents();
  } catch (err) {
    log.info("❌ TIKTOK ERROR:", err.message);
    log.info("   Server tetap jalan — coba /restart saat live dimulai");
  }
}

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
  log.info(`\n🎵 Server running at http://localhost:${PORT}`);
  log.info(
    `📋 Log mode: ${VERBOSE ? "VERBOSE (semua event)" : "MINIMAL (hanya status penting)"}`,
  );
  log.info(`   Untuk log semua: VERBOSE=1 node music-server.js\n`);
});
