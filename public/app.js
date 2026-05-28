const socket = io();

// ELEMENTS
const overlay = document.getElementById("overlay");
const title = document.getElementById("title");
const artist = document.getElementById("artist");
const requester = document.getElementById("requester");
const thumbnail = document.getElementById("thumbnail");
const avatar = document.getElementById("avatar");
const progress = document.getElementById("progress");
const queueList = document.getElementById("queueList");
const unlock = document.getElementById("unlock");
const enableAudio = document.getElementById("enableAudio");

const MAX_VISIBLE_QUEUE = 5;
const queueEls = new Map();

// PLAYER
let player;
let playerReady = false;
let audioUnlocked = false;

// LOAD YOUTUBE API
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
document.body.appendChild(tag);

// RESET PROGRESS
function resetProgress() {
  clearInterval(window.progressInterval);

  progress.style.width = "0%";
}

// START PROGRESS
function startProgress() {
  resetProgress();

  window.progressInterval = setInterval(() => {
    if (!player) return;

    const current = player.getCurrentTime();

    const duration = player.getDuration();

    if (!duration || duration <= 0) {
      return;
    }

    const percent = (current / duration) * 100;

    progress.style.width = `${percent}%`;
  }, 250);
}

// duration
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) {
    return "--:--";
  }

  const mins = Math.floor(seconds / 60);

  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function queueKey(song) {
  return song.queueId;
}

// YOUTUBE READY
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player("ytplayer", {
    height: "1",

    width: "1",

    playerVars: {
      autoplay: 1,
      controls: 0,
      rel: 0,
      modestbranding: 1,
      mute: 0,
      playsinline: 1,
    },

    events: {
      // READY
      onReady: () => {
        playerReady = true;

        console.log("✅ PLAYER READY");
      },

      // STATE CHANGE
      onStateChange: async (event) => {
        console.log("PLAYER STATE:", event.data);

        // PLAYING
        if (event.data === 1) {
          startProgress();
        }

        // ENDED
        if (event.data === 0) {
          resetProgress();

          overlay.style.display = "none";

          await fetch("/next");
        }

        // penyesuaian
        if (event.data === 0) {
          const overlayEl = document.getElementById("overlay");

          overlayEl.style.opacity = "0";

          setTimeout(() => {
            overlayEl.style.display = "none";
          }, 250);
        }
      },

      // ERROR
      onError: async (err) => {
        console.log("YT ERROR:", err.data);

        resetProgress();

        overlay.style.display = "none";

        await fetch("/next");
      },
    },
  });
};

// ENABLE AUDIO
enableAudio.addEventListener("click", async () => {
  if (!playerReady) return;

  try {
    player.loadVideoById("zh7xbTd2-wA");

    setTimeout(() => {
      player.unMute();
      player.setVolume(100);
      player.playVideo();
      audioUnlocked = true;
      unlock.remove();
      console.log("✅ AUDIO ENABLED");
    }, 1000);
  } catch (err) {
    console.log(err);
  }
});

// SONG REQUEST
socket.on("song-request", (song) => {
  console.log("▶️ PLAY:", song.title);

  // SHOW OVERLAY
  overlay.style.display = "flex";

  // animation frame
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    overlay.style.transform = "translateY(0)";
  });

  // SONG INFO
  title.innerText = song.title || "Unknown";
  artist.innerText = song.artist || "Unknown Artist";
  requester.innerText = `Requested by @${song.requester || "anonymous"}`;

  thumbnail.src = song.thumbnail || "";
  avatar.src = song.avatar || "";

  resetProgress();

  // AUDIO CHECK
  if (!audioUnlocked || !playerReady) {
    console.log("Audio/player not ready");

    return;
  }

  // PLAY VIDEO
  try {
    player.loadVideoById(song.videoId);

    setTimeout(() => {
      player.unMute();

      player.setVolume(100);

      player.playVideo();
    }, 500);
  } catch (err) {
    console.log("PLAY ERROR:", err);
  }
});

// render antrean
function renderQueue(queue) {
  const queueCount = document.getElementById("queueCount");

  const data = Array.isArray(queue) ? queue : [];

  const visibleQueue = data.slice(0, MAX_VISIBLE_QUEUE);

  if (queueCount) {
    queueCount.textContent = `${data.length} Songs`;
  }

  const nextKeys = new Set(
    visibleQueue.map((song, index) => queueKey(song, index)),
  );

  // REMOVE
  for (const [key, el] of queueEls.entries()) {
    if (!nextKeys.has(key)) {
      el.classList.remove("show");

      el.classList.add("leave");

      setTimeout(() => {
        if (el.parentElement) {
          el.remove();
        }

        queueEls.delete(key);
      }, 250);
    }
  }

  // EMPTY
  if (!visibleQueue.length) {
    queueList.innerHTML = `
      <div
        style="
          opacity:.5;
          text-align:center;
          padding:20px;
          font-size:14px;
        "
      >
        No Queue
      </div>
    `;

    return;
  }

  // REMOVE NO QUEUE
  if (queueList.innerText.includes("No Queue")) {
    queueList.innerHTML = "";
  }

  // ADD / UPDATE
  visibleQueue.forEach((song, index) => {
    const key = queueKey(song, index);

    let el = queueEls.get(key);

    // duration
    const duration =
      song.durationText || song.duration || formatDuration(song.seconds);

    const content = `
      <div class="queueIndex"></div>

      <img
        class="queueThumb"
        src="${escapeHtml(song.thumbnail || "")}"
      />

      <div class="queueInfo">

        <div class="queueSong">
          ${escapeHtml(song.title || "Unknown")}
        </div>

        <div class="queueArtist">
          ${escapeHtml(song.artist || "Unknown Artist")}
        </div>

        <div class="queueUser">
          Requested by @${escapeHtml(song.requester || "anonymous")}
        </div>

      </div>

      <div class="queueDuration">
        ${escapeHtml(duration)}
      </div>
    `;

    if (!el) {
      el = document.createElement("div");

      el.className = "queueItem";

      el.dataset.key = key;

      el.innerHTML = content;

      queueEls.set(key, el);

      queueList.appendChild(el);

      requestAnimationFrame(() => {
        el.classList.add("show");
      });
    } else {
      el.innerHTML = content;
    }

    el.classList.remove("leave");

    el.style.transitionDelay = `${index * 40}ms`;

    const currentAtIndex = queueList.children[index];

    if (currentAtIndex !== el) {
      queueList.insertBefore(el, currentAtIndex || null);
    }
  });

  while (queueList.children.length > visibleQueue.length) {
    const last = queueList.lastElementChild;

    if (!last) break;

    last.remove();
  }
  // FIX NUMBERING
  [...queueList.querySelectorAll(".queueItem")].forEach((item, i) => {
    const number = item.querySelector(".queueIndex");

    if (number) {
      number.textContent = i + 1;
    }
  });
}

// QUEUE UPDATE
socket.on("queue-update", (queue) => {
  renderQueue(queue);
});

// AUTO ENABLE
setTimeout(() => {
  if (!audioUnlocked && enableAudio) {
    enableAudio.click();
  }
}, 3000);

// SOCKET
socket.on("connect", () => {
  console.log("✅ SOCKET CONNECTED");
});

socket.on("disconnect", () => {
  console.log("❌ SOCKET DISCONNECTED");
});
