const socket = io();
function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function showToast(icon, text, duration = 2800) {
  const toastContainer = document.getElementById("toast");
  if (!toastContainer) return;

  const item = document.createElement("div");
  item.className = "toast-item";
  item.innerHTML = `<span class="toast-icon">${icon}</span><span>${text}</span>`;
  toastContainer.appendChild(item);

  setTimeout(() => {
    item.classList.add("out");
    setTimeout(() => item.remove(), 320);
  }, duration);
}

socket.on("connect", () => {
  console.log("✅ SOCKET CONNECTED");
});

socket.on("disconnect", () => {
  console.log("❌ SOCKET DISCONNECTED");
});

socket.on("song-queued", (song) => {
  showToast(
    "🎶",
    `<b>@${escapeHtml(song?.requester || "anonymous")}</b> request: ${escapeHtml(song?.title || "Unknown")}`,
  );
});

socket.on("song-pause", () => {
  showToast("⏸️", "Lagu dijeda oleh admin");
});

socket.on("song-resume", () => {
  showToast("▶️", "Lagu dilanjutkan oleh admin");
});

socket.on("connection-status", (status) => {
  if (status?.connected) {
    showToast("🟢", "Terhubung ke TikTok Live");
  } else {
    showToast("🔴", "Terputus dari TikTok Live");
  }
});

socket.on("gift", (gift) => {
  const times = gift?.repeatCount > 1 ? ` x${gift.repeatCount}` : "";
  showToast(
    "🎁",
    `<b>@${escapeHtml(gift?.nickname || "seseorang")}</b> mengirim ${escapeHtml(gift?.giftName || "gift")}${times}`,
  );
});

socket.on("follow", (ev) => {
  showToast(
    "➕",
    `<b>@${escapeHtml(ev?.nickname || "seseorang")}</b> follow host!`,
  );
});

socket.on("share", (ev) => {
  showToast(
    "🔗",
    `<b>@${escapeHtml(ev?.nickname || "seseorang")}</b> share live ini`,
  );
});
