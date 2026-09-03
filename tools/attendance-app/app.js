const STORAGE_KEY = "attendance-app-entries";
const SESSION_KEY = "attendance-app-session";

const CONFIG = window.ATTENDANCE_CONFIG || { API_URL: "", APP_TOKEN: "" };

function loginApiUrl() {
  return CONFIG.API_URL.replace(/\/save\.php$/, "/login.php");
}

const statusEl = document.getElementById("status");
const modal = document.getElementById("cameraModal");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const camShot = document.getElementById("camShot");
const camCancel = document.getElementById("camCancel");

const loginBox = document.getElementById("loginBox");
const appBody = document.getElementById("appBody");
const loginIdInput = document.getElementById("loginId");
const loginPasswordInput = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const sessionNameEl = document.getElementById("sessionName");
const logoutBtn = document.getElementById("logoutBtn");

const extraBox = document.getElementById("extraBox");
const extraTitle = document.getElementById("extraTitle");
const extraCancel = document.getElementById("extraCancel");
const extraNext = document.getElementById("extraNext");
const transportMethodInput = document.getElementById("transportMethod");
const routeInput = document.getElementById("routeInput");
const amountInput = document.getElementById("amountInput");
const extraStatusEl = document.getElementById("extraStatus");

const TYPES_WITH_EXTRA = ["checkin", "move", "checkout"];

let stream = null;
let pendingType = null;
let pendingLabel = null;
let pendingLocation = null;
let pendingExtra = null;
let session = null;

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function applySession(s) {
  session = s;
  if (session) {
    loginBox.hidden = true;
    appBody.hidden = false;
    sessionNameEl.textContent = session.display_name;
  } else {
    loginBox.hidden = false;
    appBody.hidden = true;
  }
}

applySession(loadSession());

loginBtn.addEventListener("click", async () => {
  const loginId = loginIdInput.value.trim();
  const password = loginPasswordInput.value;
  loginError.textContent = "";
  loginError.classList.remove("is-error");

  if (!loginId || !password) {
    loginError.textContent = "IDとパスワードを入力してください";
    loginError.classList.add("is-error");
    return;
  }
  if (!CONFIG.API_URL) {
    loginError.textContent = "サーバーが設定されていないため、ログインできません";
    loginError.classList.add("is-error");
    return;
  }

  loginBtn.disabled = true;
  try {
    const res = await fetch(loginApiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Token": CONFIG.APP_TOKEN || "",
      },
      body: JSON.stringify({ login_id: loginId, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "ログインに失敗しました");
    }
    const newSession = { login_id: data.login_id, display_name: data.display_name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    loginPasswordInput.value = "";
    applySession(newSession);
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.add("is-error");
  } finally {
    loginBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  applySession(null);
  loginIdInput.value = "";
  loginPasswordInput.value = "";
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
  extraStatusEl.textContent = "";
  extraStatusEl.classList.remove("is-error");
  extraBox.hidden = false;
  extraBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

extraCancel.addEventListener("click", () => {
  extraBox.hidden = true;
  pendingType = null;
  pendingLabel = null;
});

extraNext.addEventListener("click", () => {
  const transportMethod = transportMethodInput.value;
  const route = routeInput.value.trim();
  const amount = amountInput.value;

  if (!transportMethod || !route || amount === "") {
    extraStatusEl.textContent = "移動手段・経路・金額はすべて入力してください";
    extraStatusEl.classList.add("is-error");
    return;
  }

  const extra = {
    transportMethod,
    route,
    amount: Number(amount),
  };
  extraBox.hidden = true;
  openCamera(pendingType, pendingLabel, extra);
});

async function openCamera(type, label, extra) {
  if (!session) {
    setStatus("ログインしてください", true);
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
    loginId: session.login_id,
    staffName: session.display_name,
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
        login_id: entry.loginId,
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
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "HTTP " + res.status);

    const entries = loadEntries();
    const target = entries.find((e) => e.time === entry.time && e.type === entry.type);
    if (target) {
      target.synced = true;
      target.address = data.address || null;
      saveEntries(entries);
    }
  } catch (err) {
    setStatus(`${entry.label}: サーバー送信に失敗(端末内には保存済み)`, true);
  }
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
