const STORAGE_KEY = "attendance-app-entries";
const NAME_KEY = "attendance-app-staff-name";

const CONFIG = window.ATTENDANCE_CONFIG || { API_URL: "", APP_TOKEN: "" };

const statusEl = document.getElementById("status");
const logListEl = document.getElementById("logList");
const modal = document.getElementById("cameraModal");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const camShot = document.getElementById("camShot");
const camCancel = document.getElementById("camCancel");
const staffNameInput = document.getElementById("staffName");

let stream = null;
let pendingType = null;
let pendingLabel = null;
let pendingLocation = null;

staffNameInput.value = localStorage.getItem(NAME_KEY) || "";
staffNameInput.addEventListener("change", () => {
  localStorage.setItem(NAME_KEY, staffNameInput.value.trim());
});

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
  const staffName = staffNameInput.value.trim();
  if (!staffName) {
    setStatus("先に氏名を入力してください");
    staffNameInput.focus();
    return;
  }

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
  const entry = {
    staffName: staffNameInput.value.trim(),
    type,
    label,
    time: new Date().toISOString(),
    location,
    photo,
    synced: false,
  };
  const entries = loadEntries();
  entries.unshift(entry);
  saveEntries(entries);
  renderLog();
  setStatus(`${label} を記録しました`);

  syncEntry(entry, entries[0]);
}

async function syncEntry(entry, storedRef) {
  if (!CONFIG.API_URL) return;

  try {
    const res = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": CONFIG.APP_TOKEN || "",
      },
      body: JSON.stringify({
        staff_name: entry.staffName,
        type: entry.type,
        label: entry.label,
        time: entry.time,
        lat: entry.location ? entry.location.lat : null,
        lng: entry.location ? entry.location.lng : null,
        accuracy: entry.location ? entry.location.accuracy : null,
        photo: entry.photo,
      }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const entries = loadEntries();
    const target = entries.find((e) => e.time === entry.time && e.type === entry.type);
    if (target) {
      target.synced = true;
      saveEntries(entries);
      renderLog();
    }
  } catch (err) {
    setStatus(`${entry.label}: サーバー送信に失敗(端末内には保存済み)`);
  }
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
      const syncText = CONFIG.API_URL ? (e.synced ? "・送信済み" : "・未送信") : "";
      return `
        <div class="entry">
          ${img}
          <div class="info">
            <div class="label"><span class="badge ${e.type}">${e.label}</span>${e.staffName || ""}</div>
            <div class="meta">${formatTime(e.time)} ・ ${locText}${syncText}</div>
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
