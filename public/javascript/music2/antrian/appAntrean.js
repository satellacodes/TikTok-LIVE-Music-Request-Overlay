const queueList = document.getElementById("queueList");
const queueCount = document.getElementById("queueCount");
const queueBg = document.getElementById("queue-bg");

const toastEl = document.getElementById("dynamic-toast");
const toastIcon = document.getElementById("toast-icon");
const toastText = document.getElementById("toast-text");
let toastTimeout;

const IDLE_ICON = "S";
const IDLE_TEXT = "Ini Notif";

function showToast(icon, htmlMessage) {
  clearTimeout(toastTimeout);

  toastText.style.opacity = "0";
  toastText.style.transform = "scale(0.9)";
  toastIcon.style.transform = "scale(0.5) rotate(-15deg)";

  setTimeout(() => {
    toastIcon.innerHTML = icon;
    toastText.innerHTML = htmlMessage;

    toastEl.classList.remove("toast-idle");
    toastEl.classList.add("toast-active");

    toastText.style.opacity = "1";
    toastText.style.transform = "scale(1)";
    toastIcon.style.transform = "scale(1) rotate(0deg)";
  }, 250);

  toastTimeout = setTimeout(() => {
    toastText.style.opacity = "0";
    toastText.style.transform = "scale(0.9)";
    toastIcon.style.transform = "scale(0.5)";

    setTimeout(() => {
      toastIcon.innerHTML = IDLE_ICON;
      toastText.innerHTML = IDLE_TEXT;

      toastEl.classList.remove("toast-active");
      toastEl.classList.add("toast-idle");

      toastText.style.opacity = "1";
      toastText.style.transform = "scale(1)";
      toastIcon.style.transform = "scale(1)";
    }, 250);
  }, 4000);
}

function updateQueueBackground(thumbnailUrl) {
  if (thumbnailUrl) {
    queueBg.style.backgroundImage = `url('${thumbnailUrl}')`;
    queueBg.style.opacity = "1";
  } else {
    queueBg.style.backgroundImage = "none";
    queueBg.style.opacity = "0";
  }
}

const MAX_VISIBLE_QUEUE = 5;
const queueEls = new Map();

function renderQueue(queue, deletedKey = null) {
  const data = Array.isArray(queue) ? queue : [];
  const visible = data.slice(0, MAX_VISIBLE_QUEUE);

  if (queueCount) {
    const n = data.length;
    queueCount.textContent = `${n} Song${n !== 1 ? "s" : ""}`;
  }

  const nextKeys = new Set(visible.map((s) => s.queueId));

  for (const [key, { el }] of queueEls.entries()) {
    if (!nextKeys.has(key)) {
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

  if (!visible.length) {
    setTimeout(() => {
      if (queueEls.size === 0) {
        queueList.innerHTML = `<div class="queueEmpty">Queue kosong — ketik !req untuk request lagu</div>`;
      }
    }, 350);
    return;
  }

  const emptyMsg = queueList.querySelector(".queueEmpty");
  if (emptyMsg) emptyMsg.remove();

  visible.forEach((song, index) => {
    const key = song.queueId;
    const duration =
      song.durationText || song.duration || formatDuration(song.seconds);
    const isNew = !queueEls.has(key);
    let el;

    if (isNew) {
      el = document.createElement("div");
      el.className = "queueItem enter-new";
      el.dataset.key = key;
      queueEls.set(key, { el, song });
      queueList.appendChild(el);
    } else {
      el = queueEls.get(key).el;
    }

    el.innerHTML = `
      <div class="queueIndex"></div>
      <img class="queueThumb" src="${escapeHtml(song.thumbnail || "")}" alt="" onerror="this.style.background='rgba(255,255,255,0.05)'; this.src=''" />
      <div class="queueInfo">
        <div class="queueSong">${escapeHtml(song.title || "Unknown")}</div>
        <div class="queueArtist">${escapeHtml(song.artist || "Unknown Artist")}</div>
        <div class="queueUser">@${escapeHtml(song.requester || "anonymous")}</div>
      </div>
      <div class="queueDuration">${escapeHtml(duration)}</div>
    `;

    el.classList.remove("leave-up", "leave-delete", "enter-new");
    el.style.transitionDelay = `${index * 35}ms`;

    const currentAtIndex = queueList.children[index];
    if (currentAtIndex !== el) {
      queueList.insertBefore(el, currentAtIndex || null);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.add("show");
      });
    });
  });

  while (queueList.children.length > visible.length) {
    const last = queueList.lastElementChild;
    if (!last) break;
    last.remove();
  }

  [...queueList.querySelectorAll(".queueItem")].forEach((item, i) => {
    const num = item.querySelector(".queueIndex");
    if (num) num.textContent = i + 1;
  });
}

if (typeof socket !== "undefined") {
  socket.on("queue-update", (queue) => {
    renderQueue(queue);
  });

  socket.on("song-request", (song) => {
    updateQueueBackground(song.thumbnail);

    showToast(
      "🎵",
      `<b>@${escapeHtml(song.requester || "anonymous")}</b> req: ${escapeHtml(song.title)}`,
    );
  });

  socket.on("song-ended", () => {
    updateQueueBackground(null);
  });

  socket.on("song-skipped", (song) => {
    showToast(
      "⏭️",
      `Lagu di-skip${song?.title ? `: ${escapeHtml(song.title)}` : ""}`,
    );
  });

  socket.on("song-deleted", (data) => {
    const msg = data?.song?.title
      ? `Dihapus: ${escapeHtml(data.song.title)}`
      : `Lagu #${data?.index ?? "?"} dihapus`;
    showToast("🗑️", msg);
  });
}

renderQueue([]);
