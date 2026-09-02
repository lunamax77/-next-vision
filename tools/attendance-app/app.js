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

const extraBox = document.getElementById("extraBox");
const extraTitle = document.getElementById("extraTitle");
const extraCancel = document.getElementById("extraCancel");
const extraNext = document.getElementById("extraNext");
const transportMethodInput = document.getElementById("transportMethod");
const routeInput = document.getElementById("routeInput");
const amountInput = document.getElementById("amountInput");

const TYPES_WITH_EXTRA = ["checkin", "move", "checkout"];

let stream = null;
let pendingType = null;
let pendingLabel = null;
let pendingLocation = null;
let pendingExtra = null;

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

function setStatus(text, isError = false) {
  statusEl.textContent = text || "";
  statusEl.classList.toggle("is-error", Boolean(isError));
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

function openExtraForm(type, label) {
  pendingType = type;
  pendingLabel = label;
  extraTitle.textContent = label;
  transportMethodInput.value = "";
  routeInput.value = "";
  amountInput.value = "";
  extraBox.hidden = false;
  extraBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

extraCancel.addEventListener("click", () => {
  extraBox.hidden = true;
  pendingType = null;
  pendingLabel = null;
});

extraNext.addEventListener("click", () => {
  const extra = {
    transportMethod: transportMethodInput.value || null,
    route: routeInput.value.trim() || null,
    amount: amountInput.value !== "" ? Number(amountInput.value) : null,
  };
  extraBox.hidden = true;
  openCamera(pendingType, pendingLabel, extra);
});

async function openCamera(type, label, extra) {
  const staffName = staffNameInput.value.trim();
  if (!staffName) {
    setStatus("先に氏名を入力してください", true);
    staffNameInput.focus();
    return;
  }

  pendingType = type;
  pendingLabel = label;
  pendingExtra = extra || null;
  setStatus(`${label}: 位置情報を取得中...`);
  const location = await getLocation();
  if (!location) {
    setStatus("位置情報を取得できませんでした。GPSを有効にして再度お試しください。", true);
    return;
  }
  pendingLocation = location;
  setStatus("");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    video.srcObject = stream;
    modal.classList.add("open");
  } catch (err) {
    setStatus("カメラを使用できませんでした。カメラへのアクセスを許可してから再度お試しください。", true);
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

  addEntry(pendingType, pendingLabel, pendingLocation, photo, pendingExtra);
  closeCamera();
}

function addEntry(type, label, location, photo, extra) {
  const entry = {
    staffName: staffNameInput.value.trim(),
    type,
    label,
    time: new Date().toISOString(),
    location,
    photo,
    transportMethod: extra ? extra.transportMethod : null,
    route: extra ? extra.route : null,
    amount: extra ? extra.amount : null,
    synced: false,
  };
  const entries = loadEntries();
  entries.unshift(entry);
  saveEntries(entries);
  renderLog();
  setStatus(`${label} を記録しました`);

  syncEntry(entry);
}

async function syncEntry(entry) {
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
        transport_method: entry.transportMethod,
        route: entry.route,
        amount: entry.amount,
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
    setStatus(`${entry.label}: サーバー送信に失敗(端末内には保存済み)`, true);
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
        : `<img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44'/>" alt="">`;
      const syncEl = CONFIG.API_URL
        ? `<span class="sync ${e.synced ? "ok" : "pending"}">${e.synced ? "送信済み" : "未送信"}</span>`
        : "";
      const tripParts = [];
      if (e.transportMethod) tripParts.push(e.transportMethod);
      if (e.route) tripParts.push(e.route);
      if (e.amount !== null && e.amount !== undefined && e.amount !== "") {
        tripParts.push(`¥${Number(e.amount).toLocaleString("ja-JP")}`);
      }
      const tripMeta = tripParts.length
        ? `<div class="meta">${tripParts.join(" ・ ")}</div>`
        : "";
      return `
        <div class="entry">
          ${img}
          <div class="info">
            <div class="row1">
              <span class="type-label">${e.label}</span>
              <span class="staff">${e.staffName || ""}</span>
              ${syncEl}
            </div>
            <div class="meta">${formatTime(e.time)} ・ ${locText}</div>
            ${tripMeta}
          </div>
        </div>`;
    })
    .join("");
}

document.querySelectorAll(".action-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const type = btn.dataset.type;
    const label = btn.dataset.label;
    if (TYPES_WITH_EXTRA.includes(type)) {
      openExtraForm(type, label);
    } else {
      openCamera(type, label, null);
    }
  });
});

camShot.addEventListener("click", takeShot);
camCancel.addEventListener("click", closeCamera);

renderLog();
