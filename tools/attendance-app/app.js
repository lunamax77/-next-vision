const STORAGE_KEY = "attendance-app-entries";

const statusEl = document.getElementById("status");
const logListEl = document.getElementById("logList");
const modal = document.getElementById("cameraModal");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const camShot = document.getElementById("camShot");
const camCancel = document.getElementById("camCancel");

let stream = null;
let pendingType = null;
let pendingLabel = null;
let pendingLocation = null;

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function setStatus(text) {
  statusEl.textContent = text || "";
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  });
}

async function openCamera(type, label) {
  pendingType = type;
  pendingLabel = label;
  setStatus(`${label}: 位置情報を取得中...`);
  pendingLocation = await getLocation();
  setStatus("");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    modal.classList.add("open");
  } catch (err) {
    setStatus("カメラを使用できませんでした。位置情報のみ記録します。");
    addEntry(type, label, pendingLocation, null);
  }
}

function closeCamera() {
  modal.classList.remove("open");
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

function takeShot() {
  const w = video.videoWidth || 480;
  const h = video.videoHeight || 640;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, w, h);
  const photo = canvas.toDataURL("image/jpeg", 0.7);

  addEntry(pendingType, pendingLabel, pendingLocation, photo);
  closeCamera();
}

function addEntry(type, label, location, photo) {
  const entries = loadEntries();
  entries.unshift({
    type,
    label,
    time: new Date().toISOString(),
    location,
    photo,
  });
  saveEntries(entries);
  renderLog();
  setStatus(`${label} を記録しました`);
}

function renderLog() {
  const entries = loadEntries();
  if (entries.length === 0) {
    logListEl.innerHTML = '<div class="empty">まだ記録がありません</div>';
    return;
  }
  logListEl.innerHTML = entries
    .map((e) => {
      const locText = e.location
        ? `${e.location.lat.toFixed(5)}, ${e.location.lng.toFixed(5)} (±${Math.round(
            e.location.accuracy || 0
          )}m)`
        : "位置情報なし";
      const img = e.photo
        ? `<img src="${e.photo}" alt="">`
        : `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='52' height='52'/>" alt="">`;
      return `
        <div class="entry">
          ${img}
          <div class="info">
            <div class="label"><span class="badge ${e.type}">${e.label}</span></div>
            <div class="meta">${formatTime(e.time)} ・ ${locText}</div>
          </div>
        </div>`;
    })
    .join("");
}

document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    openCamera(btn.dataset.type, btn.dataset.label);
  });
});

camShot.addEventListener("click", takeShot);
camCancel.addEventListener("click", closeCamera);

renderLog();
