const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const ytSearch = require("yt-search");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// CONFIG
// before running the app
// u must switch tiktok username or admins in here
const PORT = 3000;

const TIKTOK_USERNAME = "yourusername tiktok";

const ADMINS = ["admin_username_tiktok"];

const MAX_QUEUE = 50;

const REQUEST_COOLDOWN = 5000;

app.use(express.static("public"));

// STATE

const queue = [];

let currentSong = null;

const cooldownMap = new Map();

// TIKTOK

const tiktok = new WebcastPushConnection(TIKTOK_USERNAME);

// SEARCH SONG
async function searchSong(query) {
  try {
    const result = await ytSearch(query);

    const video = result.videos[0];

    if (!video) {
      return null;
    }

    return {
      title: video.title,

      artist: video.author.name,

      thumbnail: video.thumbnail,

      videoId: video.videoId,
    };
  } catch (err) {
    console.log(err);

    return null;
  }
}

// PLAY NEXT
function playNextSong() {
  if (currentSong || queue.length === 0) {
    return;
  }

  currentSong = queue.shift();

  console.log("▶️ NOW PLAYING:", currentSong.title);

  io.emit("song-request", currentSong);

  io.emit("queue-update", queue);
}

// NEXT
app.get("/next", (req, res) => {
  currentSong = null;

  playNextSong();

  res.send("NEXT");
});

// TEST
app.get("/test", async (req, res) => {
  const song = await searchSong("multo");

  if (!song) {
    return res.send("NO SONG");
  }

  const songData = {
    ...song,

    requester: "debug",

    avatar: "https://github.com/github.png",
  };

  queue.push(songData);

  io.emit("queue-update", queue);

  playNextSong();

  res.send("TEST OK");
});

// SOCKET
io.on("connection", (socket) => {
  console.log("Overlay connected");

  socket.emit("queue-update", queue);

  if (currentSong) {
    socket.emit("song-request", currentSong);
  }
});

// START TIKTOK
async function start() {
  try {
    await tiktok.connect();

    console.log("TikTok Connected");

    tiktok.on("chat", async (data) => {
      try {
        const message = data.comment?.trim();

        const username = data.uniqueId;

        console.log("RAW CHAT:", message);

        if (!message) return;

        // SKIP
        if (message === "!skip" && ADMINS.includes(username)) {
          currentSong = null;

          playNextSong();

          return;
        }

        // ONLY !REQ
        if (!message.startsWith("!req ")) {
          return;
        }

        // COOLDOWN
        if (cooldownMap.has(username)) {
          const last = cooldownMap.get(username);

          if (Date.now() - last < REQUEST_COOLDOWN) {
            console.log("Cooldown");

            return;
          }
        }

        cooldownMap.set(username, Date.now());

        // MAX QUEUE
        if (queue.length >= MAX_QUEUE) {
          return;
        }

        // QUERY
        const query = message.replace("!req ", "").trim();

        console.log("SEARCH:", query);

        const song = await searchSong(query);

        if (!song) {
          console.log("NO RESULT");

          return;
        }

        const songData = {
          ...song,

          requester: username,

          avatar: data.profilePictureUrl || "https://github.com/github.png",
        };

        queue.push(songData);

        console.log("✅ QUEUED:", songData.title);

        io.emit("queue-update", queue);

        playNextSong();
      } catch (err) {
        console.log(err);
      }
    });
  } catch (err) {
    console.log(err);
  }
}

start();

server.listen(PORT, () => {
  console.log(`
http://localhost:${PORT}
  `);
});
