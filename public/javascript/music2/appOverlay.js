import { animate } from "motion";

const widgetContainer = document.getElementById("widgetContainer");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const requesterBadge = document.getElementById("requesterBadge");
const avatar = document.getElementById("avatar");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("currentTime");
const durationTimeEl = document.getElementById("durationTime");
const overlayBg = document.getElementById("overlayBg");
const eqBars = document.getElementById("eqBars");
const unlock = document.getElementById("unlock");
const enableAudio = document.getElementById("enableAudio");

let player;
let playerReady = false;
let audioUnlocked = false;
let currentDisplayedSong = null;

const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";
tag.onerror = () => {
  console.warn("YouTube IFrame API gagal dimuat");
  if (enableAudio) {
    enableAudio.textContent = "Lanjut (tanpa audio)";
    enableAudio.disabled = false;
  }
};
document.body.appendChild(tag);

function waitForPlayer(timeout = 8000) {
  return new Promise((resolve, reject) => {
    if (playerReady) return resolve();
    const start = Date.now();
    const interval = setInterval(() => {
      if (playerReady) {
        clearInterval(interval);
        return resolve();
      }
      if (Date.now() - start >= timeout) {
        clearInterval(interval);
        reject(new Error("Player timeout setelah " + timeout + "ms"));
      }
    }, 100);
  });
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function resetProgress() {
  clearInterval(window.progressInterval);
  progress.style.width = "0%";
  currentTimeEl.innerText = "0:00";
}

function startProgress() {
  resetProgress();
  window.progressInterval = setInterval(() => {
    if (!player) return;
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (!duration || duration <= 0) return;

    progress.style.width = `${(current / duration) * 100}%`;
    currentTimeEl.innerText = formatTime(current);
    durationTimeEl.innerText = formatTime(duration);
  }, 250);
}

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
      onReady: () => {
        playerReady = true;
        console.log("✅ PLAYER READY");
      },
      onStateChange: async (event) => {
        if (event.data === 1) {
          startProgress();
          eqBars.style.display = "flex";
        }
        if (event.data === 2) {
          eqBars.style.display = "none";
        }
        if (event.data === 0) {
          resetProgress();
          eqBars.style.display = "none";
          showIdleState();
          await fetch("/api/next").catch(() => {});
        }
      },
      onError: async (err) => {
        resetProgress();
        eqBars.style.display = "none";
        showIdleState();
        await fetch("/api/next").catch(() => {});
      },
    },
  });
};

enableAudio.addEventListener("click", async () => {
  if (enableAudio.disabled) return;
  enableAudio.disabled = true;
  enableAudio.textContent = "Memuat player...";

  try {
    await waitForPlayer(8000);
    player.loadVideoById("zh7xbTd2-wA");
    await new Promise((r) => setTimeout(r, 800));
    player.unMute();
    player.setVolume(100);
    player.playVideo();
    audioUnlocked = true;

    if (currentDisplayedSong) {
      setTimeout(() => {
        player.loadVideoById(currentDisplayedSong.videoId);
        setTimeout(() => {
          player.unMute();
          player.setVolume(100);
          player.playVideo();
        }, 500);
      }, 900);
    }
  } catch (err) {
    console.warn("⚠️ Player tidak ready:", err.message);
  }

  if (unlock && unlock.parentElement) unlock.remove();
});

function showIdleState() {
  titleEl.innerText = "Tidak ada lagu rekkk";
  artistEl.innerText = "Menunggu member request...";
  requesterBadge.innerText = "Requester by -";

  overlayBg.style.backgroundImage = `url('assets/music-idle.png')`;
  avatar.src = "assets/avatar-idle.png";

  progress.style.width = "0%";
  currentTimeEl.innerText = "0:00";
  durationTimeEl.innerText = "0:00";
  eqBars.style.display = "none";

  animate(
    widgetContainer,
    { opacity: 0.4, scale: 0.95, y: 10, rotateX: 5 },
    { duration: 0.6, easing: "ease-in-out" },
  );
}

function updateOverlayBackground(imageUrl) {
  overlayBg.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : "none";
}

let overlayTransitioning = false;

if (typeof socket !== "undefined") {
  socket.on("song-request", async (song) => {
    if (overlayTransitioning) return;
    overlayTransitioning = true;

    animate(
      widgetContainer,
      { opacity: 0, y: 20 },
      { duration: 0.3 },
    ).finished.then(() => {
      titleEl.innerText = song.title || "Unknown";
      artistEl.innerText = song.artist || "Unknown Artist";
      requesterBadge.innerText = `Requester by @${song.requester || "anonymous"}`;
      avatar.src = song.avatar || "assets/avatar-idle.png";

      updateOverlayBackground(song.thumbnail);
      resetProgress();
      currentDisplayedSong = song;

      animate(
        widgetContainer,
        {
          opacity: [0, 1],
          x: [80, 0],
          y: [0, 0],
          rotateX: [25, 0],
          rotateY: [-15, 0],
          scale: [0.85, 1],
        },
        { duration: 0.8, type: "spring", bounce: 0.45, visualDuration: 0.6 },
      );

      animate(
        ".avatar-container",
        { scale: [0, 1], rotateZ: [-45, 0] },
        { duration: 0.6, type: "spring", bounce: 0.6, delay: 0.15 },
      );

      overlayTransitioning = false;

      if (!audioUnlocked || !playerReady) return;
      try {
        player.loadVideoById(song.videoId);
        setTimeout(() => {
          player.unMute();
          player.setVolume(100);
          player.playVideo();
        }, 500);
      } catch (err) {
        console.log(err);
      }
    });
  });

  socket.on("song-ended", () => {
    showIdleState();
    eqBars.style.display = "none";
  });
}

setTimeout(() => {
  if (!audioUnlocked && enableAudio) {
    enableAudio.click();
  }
}, 3000);

showIdleState();
