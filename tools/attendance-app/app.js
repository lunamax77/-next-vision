const STORAGE_KEY = "attendance-app-entries";
const SESSION_KEY = "attendance-app-session";
const LAST_LOGIN_ID_KEY = "attendance-app-last-login-id";
const LAST_LOGIN_PW_KEY = "attendance-app-last-login-pw";

function prefillLoginForm() {
  try {
    loginIdInput.value = localStorage.getItem(LAST_LOGIN_ID_KEY) || "";
    loginPasswordInput.value = localStorage.getItem(LAST_LOGIN_PW_KEY) || "";
  } catch {}
}
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // ログイン後24時間で自動ログアウト

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
const routeFromInput = document.getElementById("routeFrom");
const routeToInput = document.getElementById("routeTo");
const stationList = document.getElementById("stationList");
const historyTitle = document.getElementById("historyTitle");
const historyChips = document.getElementById("historyChips");
const amountInput = document.getElementById("amountInput");
const extraStatusEl = document.getElementById("extraStatus");
const todayLogList = document.getElementById("todayLogList");

function toHalfWidthDigits(str) {
  return str.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

amountInput.addEventListener("input", () => {
  const converted = toHalfWidthDigits(amountInput.value).replace(/[^0-9]/g, "");
  if (converted !== amountInput.value) amountInput.value = converted;
});

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

function isSessionExpired(s) {
  if (!s) return false;
  if (!s.logged_in_at) return true; // 旧形式(ログイン時刻なし)は一度ログインし直してもらう
  return Date.now() - s.logged_in_at > SESSION_MAX_AGE_MS;
}

function expireSession() {
  localStorage.removeItem(SESSION_KEY);
  applySession(null);
  prefillLoginForm();
  loginError.textContent = "ログインから24時間経過したため、再度ログインしてください";
  loginError.classList.add("is-error");
}

function checkSessionExpiry() {
  if (session && isSessionExpired(session)) expireSession();
}

function applySession(s) {
  session = s;
  if (session) {
    loginBox.hidden = true;
    appBody.hidden = false;
    sessionNameEl.textContent = session.display_name;
    pruneOldEntries();
    renderTodayLog();
    loadMonthRecords();
  } else {
    loginBox.hidden = false;
    appBody.hidden = true;
  }
}

function formatEntryTime(iso) {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

// サーバーの recorded_at は UTC("YYYY-MM-DD HH:MM:SS")なので Date に変換する
function serverTimeToDate(s) {
  return new Date(String(s).replace(" ", "T") + "Z");
}

function formatDateHeading(d) {
  return d.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", weekday: "short" });
}

// 端末内の記録は今月分だけ残す(月が変わったら前月分は削除)
function pruneOldEntries() {
  const now = new Date();
  const entries = loadEntries().filter((e) => {
    const d = new Date(e.time);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  saveEntries(entries);
}

let monthRecords = [];

function renderTodayLog() {
  if (!session) return;
  const now = new Date();
  const title = document.getElementById("todayLogTitle");
  if (title) title.textContent = `${now.getMonth() + 1}月の記録`;

  // サーバーに未送信の端末内記録(今月分)を先頭に出す
  const pending = loadEntries()
    .filter((e) => e.loginId === session.login_id && !e.synced)
    .map((e) => ({
      label: e.label,
      date: new Date(e.time),
      transport_method: e.transportMethod,
      route: e.route,
      amount: e.amount,
      pending: true,
      location_mismatch: false,
    }));
  const synced = monthRecords.map((r) => ({
    label: r.label,
    date: serverTimeToDate(r.time),
    transport_method: r.transport_method,
    route: r.route,
    amount: r.amount,
    pending: false,
    location_mismatch: r.location_mismatch,
  }));
  const items = [...pending, ...synced].sort((a, b) => b.date - a.date);

  if (items.length === 0) {
    todayLogList.innerHTML = '<div class="today-log-empty">まだ今月の記録はありません</div>';
    return;
  }

  let lastDay = "";
  todayLogList.innerHTML = items
    .map((e) => {
      const subParts = [];
      if (e.transport_method) subParts.push(e.transport_method);
      if (e.route) subParts.push(e.route);
      if (e.amount !== null && e.amount !== undefined) {
        subParts.push(`&yen;${Number(e.amount).toLocaleString("ja-JP")}`);
      }
      if (e.pending) subParts.push("送信中...");
      const dayKey = e.date.toDateString();
      const heading = dayKey !== lastDay ? `<div class="today-log-date">${formatDateHeading(e.date)}</div>` : "";
      lastDay = dayKey;
      return `${heading}
        <div class="today-log-item ${e.pending ? "pending" : ""}">
          <span class="label">${e.label}</span>
          <span class="time">${formatEntryTime(e.date)}</span>
          ${subParts.length ? `<span class="sub">${subParts.join(" ・ ")}</span>` : ""}
          ${e.location_mismatch ? '<span class="warn">⚠ 最寄駅から離れています</span>' : ""}
        </div>`;
    })
    .join("");
}

async function loadMonthRecords() {
  if (!session || !CONFIG.API_URL) return;
  try {
    const url = CONFIG.API_URL.replace(/\/save\.php$/, "/records.php") +
      "?login_id=" + encodeURIComponent(session.login_id);
    const res = await fetch(url, { headers: { "X-App-Token": CONFIG.APP_TOKEN || "" } });
    const data = await res.json();
    if (res.ok && data.ok) {
      monthRecords = data.records || [];
      renderTodayLog();
    }
  } catch {
    // オフライン時は端末内の記録のみ表示
  }
}

// 起動時にサーバーから最新のアカウント情報(氏名・最寄駅)を取り直す。
// 再ログインしなくても管理画面での変更が反映され、無効化されたアカウントは自動でログアウトする。
async function refreshProfile() {
  if (!session || !CONFIG.API_URL) return;
  try {
    const url = CONFIG.API_URL.replace(/\/save\.php$/, "/profile.php") +
      "?login_id=" + encodeURIComponent(session.login_id);
    const res = await fetch(url, { headers: { "X-App-Token": CONFIG.APP_TOKEN || "" } });
    const data = await res.json();
    if (res.status === 401) {
      localStorage.removeItem(SESSION_KEY);
      applySession(null);
      loginError.textContent = data.error || "アカウントが無効です";
      loginError.classList.add("is-error");
      return;
    }
    if (res.ok && data.ok) {
      const updated = {
        login_id: data.login_id,
        display_name: data.display_name,
        nearest_station: data.nearest_station || "",
        logged_in_at: session.logged_in_at,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      applySession(updated);
    }
  } catch {
    // オフライン等で取れなくても保存済みのセッションで続行
  }
}

{
  const saved = loadSession();
  if (saved && isSessionExpired(saved)) {
    expireSession();
  } else {
    applySession(saved);
    refreshProfile();
  }
}
if (!session) prefillLoginForm();
// アプリを開いたままでも期限が来たらログアウトする
setInterval(checkSessionExpiry, 60 * 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkSessionExpiry();
});

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
    const newSession = {
      login_id: data.login_id,
      display_name: data.display_name,
      nearest_station: data.nearest_station || "",
      logged_in_at: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    localStorage.setItem(LAST_LOGIN_ID_KEY, newSession.login_id);
    localStorage.setItem(LAST_LOGIN_PW_KEY, password);
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
  prefillLoginForm();
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

function splitRoute(route) {
  const parts = String(route || "").split("→").map((s) => s.trim());
  return parts.length >= 2 ? { from: parts[0], to: parts.slice(1).join(" → ") } : { from: route || "", to: "" };
}

function applyHistoryItem(item) {
  const r = splitRoute(item.route);
  routeFromInput.value = r.from;
  routeToInput.value = r.to;
  if (item.transport_method) transportMethodInput.value = item.transport_method;
  if (item.amount !== null && item.amount !== undefined) amountInput.value = String(item.amount);
}

function renderHistory(items) {
  historyChips.innerHTML = "";
  stationList.innerHTML = "";
  historyTitle.hidden = items.length === 0;
  if (items.length === 0) return;

  const stations = new Set();
  items.forEach((item) => {
    const r = splitRoute(item.route);
    if (r.from) stations.add(r.from);
    if (r.to) stations.add(r.to);

    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "history-chip";
    const parts = [item.route];
    if (item.transport_method) parts.push(item.transport_method);
    if (item.amount !== null && item.amount !== undefined) {
      parts.push(`¥${Number(item.amount).toLocaleString("ja-JP")}`);
    }
    chip.textContent = parts.join(" ・ ");
    chip.addEventListener("click", () => applyHistoryItem(item));
    historyChips.appendChild(chip);
  });
  stations.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s;
    stationList.appendChild(opt);
  });
}

async function loadHistory() {
  if (!CONFIG.API_URL || !session) return;
  try {
    const url = CONFIG.API_URL.replace(/\/save\.php$/, "/history.php") +
      "?login_id=" + encodeURIComponent(session.login_id);
    const res = await fetch(url, { headers: { "X-App-Token": CONFIG.APP_TOKEN || "" } });
    const data = await res.json();
    if (res.ok && data.ok) renderHistory(data.history || []);
  } catch {
    // 履歴が取れなくても入力自体は可能なので無視
  }
}

const TYPES_WITH_TIME = ["checkin", "checkout"];
const timeField = document.getElementById("timeField");
const timeHourSelect = document.getElementById("timeHour");
const timeMinuteSelect = document.getElementById("timeMinute");
for (let h = 0; h < 24; h++) {
  const opt = document.createElement("option");
  opt.value = String(h);
  opt.textContent = String(h).padStart(2, "0");
  timeHourSelect.appendChild(opt);
}

function setTimePickerToNow() {
  const now = new Date();
  const rounded = Math.round(now.getMinutes() / 15) * 15;
  let hour = now.getHours();
  let minute = rounded;
  if (rounded === 60) {
    minute = 0;
    hour = (hour + 1) % 24;
  }
  timeHourSelect.value = String(hour);
  timeMinuteSelect.value = String(minute);
}

// 選択された時刻を「今日のその時刻」として返す(選択欄が非表示なら現在時刻)
function selectedRecordTime() {
  if (timeField.hidden) return new Date();
  const d = new Date();
  d.setHours(Number(timeHourSelect.value), Number(timeMinuteSelect.value), 0, 0);
  return d;
}

function openExtraForm(type, label) {
  pendingType = type;
  pendingLabel = label;
  extraTitle.textContent = label;
  timeField.hidden = !TYPES_WITH_TIME.includes(type);
  if (!timeField.hidden) setTimePickerToNow();
  transportMethodInput.value = "";
  routeFromInput.value = (session && session.nearest_station) || "";
  routeToInput.value = "";
  amountInput.value = "";
  extraStatusEl.textContent = "";
  extraStatusEl.classList.remove("is-error");
  extraBox.hidden = false;
  extraBox.scrollIntoView({ behavior: "smooth", block: "center" });
  loadHistory();
}

extraCancel.addEventListener("click", () => {
  extraBox.hidden = true;
  pendingType = null;
  pendingLabel = null;
});

extraNext.addEventListener("click", () => {
  const transportMethod = transportMethodInput.value;
  const routeFrom = routeFromInput.value.trim();
  const routeTo = routeToInput.value.trim();
  const route = routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : "";
  const amount = amountInput.value;

  if (!transportMethod || !route || amount === "") {
    extraStatusEl.textContent = "移動手段・出発駅・到着駅・金額はすべて入力してください";
    extraStatusEl.classList.add("is-error");
    return;
  }

  const extra = {
    transportMethod,
    route,
    amount: Number(amount),
    recordTime: selectedRecordTime().toISOString(),
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
    time: (extra && extra.recordTime) || new Date().toISOString(),
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
  renderTodayLog();

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
      loadMonthRecords();
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
