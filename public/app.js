const socket = io();

// ─── ELEMENTS ───
const overlay = document.getElementById("overlay");
const titleEl = document.getElementById("title");
const artistEl = document.getElementById("artist");
const requesterEl = document.getElementById("requester");
const thumbnail = document.getElementById("thumbnail");
const avatar = document.getElementById("avatar");
const progress = document.getElementById("progress");
const queueList = document.getElementById("queueList");
const unlock = document.getElementById("unlock");
const enableAudio = document.getElementById("enableAudio");
const overlayContent = document.getElementById("overlayContent");
const overlayBg = document.getElementById("overlayBg");
const eqBars = document.getElementById("eqBars");
const toastContainer = document.getElementById("toast");

const MAX_VISIBLE_QUEUE = 5;

const queueEls = new Map();

// Simpan snapshot queue sebelumnya untuk deteksi delete vs masuk normal
let prevQueueKeys = [];

// ─── PLAYER ───
let player;
let playerReady = false;
let audioUnlocked = false;

let currentDisplayedSong = null;

// ─── TOAST NOTIFIKASI ───
function showToast(icon, text, duration = 2800) {
  const item = document.createElement("div");
  item.className = "toast-item";
  item.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
  toastContainer.appendChild(item);

  setTimeout(() => {
    item.classList.add("out");
    setTimeout(() => item.remove(), 320);
  }, duration);
}

//youtube api load
const tag = document.createElement("script");
tag.src = "https://www.youtube.com/iframe_api";

tag.onerror = () => {
  console.warn("⚠️ YouTube IFrame API gagal dimuat");
  if (enableAudio) {
    enableAudio.textContent = "Lanjut (tanpa audio)";
    enableAudio.disabled = false;
  }
};
document.body.appendChild(tag);

// mana buktinya, ini buktinya
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

// ─── PROGRESS ───
function resetProgress() {
  clearInterval(window.progressInterval);
  progress.style.width = "0%";
}

function startProgress() {
  resetProgress();
  window.progressInterval = setInterval(() => {
    if (!player) return;
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (!duration || duration <= 0) return;
    progress.style.width = `${(current / duration) * 100}%`;
  }, 250);
}

// ─── FORMAT DURASI ───
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

// ─── ESCAPE HTML (bug fix: pastikan selalu string) ───
function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Key unik per item queue
function queueKey(song) {
  return song.queueId;
}

// ─── YOUTUBE READY ───
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
        console.log("PLAYER STATE:", event.data);

        // 1 = playing
        if (event.data === 1) {
          startProgress();
          thumbnail.classList.add("spinning");
          eqBars.style.display = "flex";
        }

        // 2 = paused
        if (event.data === 2) {
          thumbnail.classList.remove("spinning");
          eqBars.style.display = "none";
        }

        // 0 = ended — bug fix: jangan panggil /next berkali-kali
        // pakai flag agar tidak double-fire
        if (event.data === 0) {
          resetProgress();
          thumbnail.classList.remove("spinning");
          eqBars.style.display = "none";
          showIdleState();
          await fetch("/next");
        }
      },

      onError: async (err) => {
        console.log("YT ERROR:", err.data);
        resetProgress();
        thumbnail.classList.remove("spinning");
        eqBars.style.display = "none";
        showIdleState();
        await fetch("/next");
      },
    },
  });
};

// ─── ENABLE AUDIO ───
enableAudio.addEventListener("click", async () => {
  // Hindari double click saat sedang loading
  if (enableAudio.disabled) return;
  enableAudio.disabled = true;
  enableAudio.textContent = "Memuat player...";

  try {
    // Tunggu YouTube player siap, maksimal 8 detik
    await waitForPlayer(8000);

    // Load video pendek untuk unlock autoplay browser
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

    console.log("✅ AUDIO ENABLED");
  } catch (err) {
    console.warn("⚠️ Player tidak ready:", err.message);
  }

  if (unlock && unlock.parentElement) {
    unlock.remove();
  }
});

// ─── IDLE STATE ───
function showIdleState() {
  overlayContent.classList.remove("visible");
  overlayContent.classList.add("hidden");
  setTimeout(() => {
    titleEl.innerText = "Tidak ada lagu rekkk";
    artistEl.innerText = "Menunggu member request...";
    requesterEl.innerText = "Ketik !req nama lagu";
    thumbnail.src = "assets/music-idle.png";
    avatar.src = "assets/avatar-idle.png";
    progress.style.width = "0%";
    thumbnail.classList.remove("spinning");
    eqBars.style.display = "none";
    overlayBg.style.background = `
      linear-gradient(135deg, rgba(40,40,40,.93), rgba(10,10,10,.95))
    `;
    overlayContent.classList.remove("hidden");
    overlayContent.classList.add("visible");
  }, 220);
}

// ─── SONG REQUEST ───
let overlayTransitioning = false;

socket.on("song-request", async (song) => {
  // Overlay selalu tampil
  overlay.style.display = "block";
  overlay.style.opacity = "1";

  if (overlayTransitioning) return;
  overlayTransitioning = true;

  overlayContent.classList.remove("visible");
  overlayContent.classList.add("hidden");

  setTimeout(() => {
    titleEl.innerText = song.title || "Unknown";
    artistEl.innerText = song.artist || "Unknown Artist";
    requesterEl.innerText = `Requested by @${song.requester || "anonymous"}`;
    thumbnail.src = song.thumbnail || "";
    avatar.src = song.avatar || "";

    updateOverlayBackground(song.thumbnail);

    overlayContent.classList.remove("hidden");
    overlayContent.classList.add("visible");
    overlayTransitioning = false;
  }, 220);

  resetProgress();

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

// ─── WARNA BACKGROUND DARI THUMBNAIL ───
function updateOverlayBackground(imageUrl) {
  if (!imageUrl) return;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(img, 0, 0, 50, 50);
    const pixels = ctx.getImageData(0, 0, 50, 50).data;
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count++;
    }
    r = Math.floor(r / count);
    g = Math.floor(g / count);
    b = Math.floor(b / count);

    overlayBg.style.background = `
      linear-gradient(
        135deg,
        rgba(${r}, ${g}, ${b}, 0.88),
        rgba(${Math.floor(r * 0.3)}, ${Math.floor(g * 0.3)}, ${Math.floor(b * 0.3)}, 0.95)
      )
    `;
  };
}

// ─── RENDER QUEUE ───
// Bug fix utama:
// - queueKey hanya pakai song.queueId (bukan (song, index))
//   karena dulu ada bug: key berubah saat posisi bergeser → semua item re-render
// - Deteksi "masuk baru" (dari kanan) vs "naik ke atas" (dari server sort)
// - Deteksi delete (key hilang) → animasi geser kanan + merah
// - Posisi overlay player tidak bergerak sama sekali
function renderQueue(queue, deletedKey = null) {
  const queueCount = document.getElementById("queueCount");
  const data = Array.isArray(queue) ? queue : [];
  const visible = data.slice(0, MAX_VISIBLE_QUEUE);

  if (queueCount) {
    const n = data.length;
    queueCount.textContent = `${n} Song${n !== 1 ? "s" : ""}`;
  }

  const nextKeys = new Set(visible.map((s) => queueKey(s)));

  // REMOVE item yang tidak ada lagi
  for (const [key, { el }] of queueEls.entries()) {
    if (!nextKeys.has(key)) {
      // Cek apakah ini karena delete (deletedKey) atau karena diputar (shift)
      const leaveClass =
        deletedKey && key === deletedKey ? "leave-delete" : "leave-up";

      el.classList.remove("show");
      el.classList.add(leaveClass);

      setTimeout(() => {
        if (el.parentElement) el.remove();
        queueEls.delete(key);
      }, 320);
    }
  }

  // EMPTY STATE
  if (!visible.length) {
    // Hapus existing items dulu, lalu tampilkan empty
    setTimeout(() => {
      if (queueEls.size === 0) {
        queueList.innerHTML = `<div class="queueEmpty">Queue kosong — ketik !req untuk request lagu</div>`;
      }
    }, 350);
    return;
  }

  // Hapus pesan "Queue kosong" jika ada
  const emptyMsg = queueList.querySelector(".queueEmpty");
  if (emptyMsg) emptyMsg.remove();

  // ADD / UPDATE items
  visible.forEach((song, index) => {
    const key = queueKey(song);
    const duration =
      song.durationText || song.duration || formatDuration(song.seconds);

    const isNew = !queueEls.has(key);
    const isFirstPos = index === 0;

    let el;

    if (isNew) {
      el = document.createElement("div");
      el.className = "queueItem enter-new"; // masuk dari kanan
      el.dataset.key = key;
      queueEls.set(key, { el, song });
      queueList.appendChild(el);
    } else {
      el = queueEls.get(key).el;
    }

    // Update konten
    el.innerHTML = `
      <div class="queueIndex"></div>
      <img
        class="queueThumb"
        src="${escapeHtml(song.thumbnail || "")}"
        alt=""
        onerror="this.style.background='rgba(255,255,255,0.05)'; this.src=''"
      />
      <div class="queueInfo">
        <div class="queueSong">${escapeHtml(song.title || "Unknown")}</div>
        <div class="queueArtist">${escapeHtml(song.artist || "Unknown Artist")}</div>
        <div class="queueUser">@${escapeHtml(song.requester || "anonymous")}</div>
      </div>
      <div class="queueDuration">${escapeHtml(duration)}</div>
    `;

    el.classList.remove("leave-up", "leave-delete", "enter-new");
    el.style.transitionDelay = `${index * 35}ms`;

    // Masukkan ke posisi yang benar di DOM
    const currentAtIndex = queueList.children[index];
    if (currentAtIndex !== el) {
      queueList.insertBefore(el, currentAtIndex || null);
    }

    // Trigger animasi show setelah frame berikutnya
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("show");
      });
    });
  });

  // Hapus DOM node lebih dari yang dibutuhkan (safety)
  while (queueList.children.length > visible.length) {
    const last = queueList.lastElementChild;
    if (!last) break;
    last.remove();
  }

  // Fix numbering
  [...queueList.querySelectorAll(".queueItem")].forEach((item, i) => {
    const num = item.querySelector(".queueIndex");
    if (num) num.textContent = i + 1;
  });

  // Simpan keys untuk referensi berikutnya
  prevQueueKeys = visible.map((s) => queueKey(s));
}

// ─── SOCKET EVENTS ───

// Queue update — server mengirim queue terbaru
socket.on("queue-update", (queue) => {
  renderQueue(queue);
});

// Lagu selesai / skip → idle
socket.on("song-ended", () => {
  showIdleState();
  thumbnail.classList.remove("spinning");
  eqBars.style.display = "none";
});

// ─── (OPSIONAL) Event tambahan yang bisa kamu emit dari server ───
// Kalau mau server emit "song-queued" / "song-deleted" / "song-skipped"
// buat toast, uncomment dan tambahkan emit di server.js juga.

socket.on("song-queued", (song) => {
  showToast(
    "🎵",
    `<b>@${escapeHtml(song.requester)}</b> req: ${escapeHtml(song.title)}`,
  );
});

socket.on("song-skipped", (song) => {
  showToast(
    "⏭️",
    `Lagu di-skip${song?.title ? `: ${escapeHtml(song.title)}` : ""}`,
  );
});

socket.on("song-deleted", (data) => {
  // data = { index, song }
  const msg = data?.song?.title
    ? `Lagu dihapus: ${escapeHtml(data.song.title)}`
    : `Lagu #${data?.index ?? "?"} dihapus dari queue`;
  showToast("🗑️", msg);
  // Render ulang dengan deletedKey agar animasi delete tampil
  // queue terbaru akan datang via queue-update dari server
});

// ─── AUTO ENABLE (fallback jika overlay di OBS dan tidak ada interaksi) ───
setTimeout(() => {
  if (!audioUnlocked && enableAudio) {
    enableAudio.click();
  }
}, 3000);

// ─── SOCKET STATUS ───
socket.on("connect", () => {
  console.log("✅ SOCKET CONNECTED");
});

socket.on("disconnect", () => {
  console.log("❌ SOCKET DISCONNECTED");
});

// ─── INIT ───
showIdleState();
