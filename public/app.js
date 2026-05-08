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

  // SONG INFO
  title.innerText = song.title;
  artist.innerText = song.artist;
  requester.innerText = `Requested by @${song.requester}`;
  thumbnail.src = song.thumbnail;
  avatar.src = song.avatar;

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

// QUEUE UPDATE
socket.on("queue-update", (queue) => {
  queueList.innerHTML = "";

  if (!queue.length) {
    queueList.innerHTML = "No Queue";

    return;
  }

  queue.forEach((song) => {
    const div = document.createElement("div");

    div.className = "queueItem";

    div.innerHTML = `
      <div class="queueSong">
        ${song.title}
      </div>

      <div class="queueUser">
        @${song.requester}
      </div>
    `;

    queueList.appendChild(div);
  });
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
