/***********************
 * Frontend for Vercel
 ***********************/

const API_URL = "https://script.google.com/macros/s/AKfycbxCYfcCKkP4aK53dikRLFqv43ELokP3WkmIL8ruxCPQTyVz9gDNZCcszizEah8fVc2Y/exec";

const $ = (id) => document.getElementById(id);

let session = {
  token: localStorage.getItem("token") || "",
  role: localStorage.getItem("role") || "",
  displayName: localStorage.getItem("displayName") || ""
};

let cached = { headers: [], rows: [] };
let deferredPrompt = null;

function setMsg(el, text, type) {
  el.classList.remove("error", "ok");
  if (!text) { el.textContent = ""; return; }
  el.textContent = text;
  if (type) el.classList.add(type);
}

function show(view) {
  ["viewLogin","viewHome","viewAccount"].forEach(v => $(v).classList.add("hidden"));
  $(view).classList.remove("hidden");

  const loggedIn = !!session.token;
  $("btnLogout").classList.toggle("hidden", !loggedIn);
  $("bottomNav").classList.toggle("hidden", !loggedIn);
}

function setNavActive(which){
  document.querySelectorAll(".navBtn").forEach(b => b.classList.remove("active"));
  document.querySelector(`.navBtn[data-go="${which}"]`)?.classList.add("active");
}

function hideSplash(){
  const s = $("splash");
  if (s) s.classList.add("hide");
}
function showSplash(){
  const s = $("splash");
  if (s) s.classList.remove("hide");
}

async function api(action, payload = {}) {
  const body = { action, ...payload };
  if (session.token) body.token = session.token;

  const res = await fetch(API_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body)
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("NETWORK/CORS: Cannot read response. Check Deploy access + API_URL /exec");
  }

  if (data.status !== "ok") throw new Error(data.error || "ERROR");
  return data;
}

function isAdmin(){ return session.role === "admin"; }

function persistSession(s) {
  session = { ...session, ...s };
  localStorage.setItem("token", session.token || "");
  localStorage.setItem("role", session.role || "");
  localStorage.setItem("displayName", session.displayName || "");
}

function clearSession(){
  session = { token:"", role:"", displayName:"" };
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("displayName");
}

function renderRole(){
  $("roleBadge").textContent = isAdmin() ? "Role: Admin (Edit Enabled)" : "Role: User (View Only)";
  $("accountRole").textContent = isAdmin() ? "Admin" : "User";
  $("btnAdd").classList.toggle("hidden", !isAdmin());
}

function escapeHtml(s){
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function matchesSearch(values, q){
  if (!q) return true;
  const hay = values.map(v => String(v ?? "")).join(" ").toLowerCase();
  return hay.includes(q.toLowerCase());
}

function renderTable() {
  const { headers, rows } = cached;
  const q = $("searchInput").value.trim();

  const headCells = headers.map(h => `<th>${escapeHtml(h)}</th>`).join("");
  const actionsTh = isAdmin() ? `<th class="actionsCell">Actions</th>` : "";
  $("tableHead").innerHTML = `<tr>${headCells}${actionsTh}</tr>`;

  const filtered = rows.filter(r => matchesSearch(r.values, q));
  $("stats").textContent = `Rows: ${filtered.length} / ${rows.length}`;

  const body = filtered.map(r => {
    const tds = r.values.map(v => `<td>${escapeHtml(v)}</td>`).join("");
    const actions = isAdmin()
      ? `<td class="actionsCell">
          <button class="btn" data-edit="${r.rowNumber}">Edit</button>
        </td>`
      : "";
    return `<tr>${tds}${actions}</tr>`;
  }).join("");

  $("tableBody").innerHTML = body || `<tr><td colspan="${headers.length + (isAdmin()?1:0)}" class="muted">No data</td></tr>`;
}

async function loadData(){
  setMsg($("homeMsg"), "Loading...", "");
  try{
    const res = await api("getData");
    cached = res.data;
    renderRole();
    renderTable();
    setMsg($("homeMsg"), "Updated ✅", "ok");
  }catch(err){
    setMsg($("homeMsg"), `Error: ${err.message}`, "error");
  }
}

function openModal({ mode, rowNumber, values }){
  $("modal").classList.remove("hidden");
  setMsg($("modalMsg"), "", "");
  $("btnDelete").classList.toggle("hidden", mode !== "edit");
  $("modalTitle").textContent = mode === "add" ? "Add Row" : "Edit Row";
  $("modalSubtitle").textContent = mode === "add"
    ? "បន្ថែមទិន្នន័យថ្មី"
    : `កែទិន្នន័យ (row: ${rowNumber})`;

  const { headers } = cached;
  const form = $("rowForm");
  form.innerHTML = headers.map((h, i) => {
    const val = values?.[i] ?? "";
    return `
      <label class="field">
        <span>${escapeHtml(h)}</span>
        <input data-col="${i}" value="${escapeHtml(val)}" />
      </label>
    `;
  }).join("");

  $("btnSave").onclick = async () => {
    const inputs = Array.from(form.querySelectorAll("input"));
    const newValues = inputs.map(inp => inp.value);

    setMsg($("modalMsg"), "Saving...", "");
    try{
      if (mode === "add") {
        await api("addRow", { values: newValues });
      } else {
        await api("updateRow", { rowNumber, values: newValues });
      }
      setMsg($("modalMsg"), "Saved ✅", "ok");
      await loadData();
      setTimeout(() => $("modal").classList.add("hidden"), 500);
    }catch(err){
      setMsg($("modalMsg"), `Error: ${err.message}`, "error");
    }
  };

  $("btnDelete").onclick = async () => {
    if (!confirm("Delete this row?")) return;
    setMsg($("modalMsg"), "Deleting...", "");
    try{
      await api("deleteRow", { rowNumber });
      setMsg($("modalMsg"), "Deleted ✅", "ok");
      await loadData();
      setTimeout(() => $("modal").classList.add("hidden"), 500);
    }catch(err){
      setMsg($("modalMsg"), `Error: ${err.message}`, "error");
    }
  };
}

function closeModal(){
  $("modal").classList.add("hidden");
}

// Events
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg($("loginMsg"), "Logging in...", "");

  try{
    const username = $("username").value.trim();
    const password = $("password").value;

    const res = await api("login", { username, password });
    persistSession(res.data);

    $("loginMsg").textContent = "";
    show("viewHome");
    setNavActive("home");
    await loadData();
  }catch(err){
    setMsg($("loginMsg"), `Login failed: ${err.message}`, "error");
  }
});

$("btnLogout").addEventListener("click", () => {
  clearSession();
  cached = { headers: [], rows: [] };
  show("viewLogin");
  setMsg($("loginMsg"), "Logged out.", "ok");
});

$("btnRefresh").addEventListener("click", loadData);

$("searchInput").addEventListener("input", () => renderTable());

$("tableBody").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-edit]");
  if (!btn) return;
  const rowNumber = Number(btn.dataset.edit);
  const row = cached.rows.find(r => r.rowNumber === rowNumber);
  if (!row) return;
  openModal({ mode:"edit", rowNumber, values: row.values });
});

$("btnAdd").addEventListener("click", () => {
  openModal({ mode:"add", rowNumber:null, values: Array(cached.headers.length).fill("") });
});

$("btnCloseModal").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

document.querySelectorAll(".navBtn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const go = btn.dataset.go;
    setNavActive(go);

    if (go === "home") {
      show("viewHome");
      if (!cached.headers.length) await loadData();
    } else if (go === "account") {
      show("viewAccount");
      renderRole();
    }
  });
});

// PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("btnInstall").classList.remove("hidden");
});

$("btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt = null;
  $("btnInstall").classList.add("hidden");
});

// Init
(async function init(){
  showSplash();

  const loggedIn = !!session.token;
  if (!loggedIn) {
    show("viewLogin");
    hideSplash();
    return;
  }

  show("viewHome");
  setNavActive("home");
  renderRole();

  await loadData();
  hideSplash();
})();
