export function getUI(token?: string): string {
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>girl-agent</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0a0a0b;--bg2:#111114;--bg3:#18181d;--bg4:#222228;
    --border:#2a2a33;--border2:#3a3a45;
    --text:#e8e8f0;--text2:#9090a8;--text3:#5a5a70;
    --accent:#c084fc;--accent2:#a855f7;
    --green:#4ade80;--red:#f87171;--blue:#60a5fa;--yellow:#facc15;
    --font-mono:'JetBrains Mono','Fira Code','Cascadia Code',monospace;
    --radius:8px;
  }
  html,body{height:100%;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.5}
  #app{display:grid;grid-template-rows:48px 1fr;height:100vh;overflow:hidden}

  /* Header */
  header{
    display:flex;align-items:center;gap:12px;padding:0 16px;
    background:var(--bg2);border-bottom:1px solid var(--border);
    font-size:13px;
  }
  header .logo{font-weight:700;font-size:15px;color:var(--accent);letter-spacing:-0.5px}
  header .sep{color:var(--border2)}
  header .name{font-weight:600}
  header .stage{color:var(--text2);font-size:12px;background:var(--bg3);padding:2px 8px;border-radius:20px;border:1px solid var(--border)}
  header .dot{width:8px;height:8px;border-radius:50%;background:var(--text3)}
  header .dot.online{background:var(--green);box-shadow:0 0 6px var(--green)}
  header .spacer{flex:1}
  header .conn{font-size:11px;color:var(--text3)}
  header .conn.ok{color:var(--green)}

  /* Main layout */
  main{display:grid;grid-template-columns:220px 1fr;overflow:hidden}

  /* Sidebar */
  aside{
    background:var(--bg2);border-right:1px solid var(--border);
    overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:16px;
  }
  .section-title{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:6px}

  /* Score bars */
  .score-row{display:flex;flex-direction:column;gap:3px;margin-bottom:4px}
  .score-label{display:flex;justify-content:space-between;font-size:11px;color:var(--text2)}
  .score-label span:last-child{font-family:var(--font-mono);color:var(--text)}
  .bar-track{height:4px;background:var(--bg4);border-radius:2px;overflow:hidden}
  .bar-fill{height:100%;border-radius:2px;transition:width .4s ease}
  .bar-interest{background:var(--accent)}
  .bar-trust{background:var(--blue)}
  .bar-attraction{background:#f472b6}
  .bar-annoyance{background:var(--yellow)}
  .bar-cringe{background:var(--red)}

  /* Quick commands */
  .quick-btn{
    width:100%;text-align:left;padding:5px 8px;border-radius:var(--radius);
    border:1px solid var(--border);background:var(--bg3);color:var(--text2);
    cursor:pointer;font-size:12px;font-family:var(--font-mono);transition:all .15s;
  }
  .quick-btn:hover{background:var(--bg4);color:var(--text);border-color:var(--border2)}
  .quick-btns{display:flex;flex-direction:column;gap:4px}

  /* Content area */
  .content{display:flex;flex-direction:column;overflow:hidden}

  /* Tabs */
  .tabs{display:flex;gap:0;border-bottom:1px solid var(--border);background:var(--bg2);padding:0 12px;flex-shrink:0}
  .tab{
    padding:10px 14px;font-size:12px;font-weight:500;color:var(--text3);
    cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;margin-bottom:-1px;
    white-space:nowrap;
  }
  .tab:hover{color:var(--text2)}
  .tab.active{color:var(--accent);border-bottom-color:var(--accent)}

  /* Log panel */
  #panel-log{flex:1;overflow:hidden;display:flex;flex-direction:column}
  .log-scroll{flex:1;overflow-y:auto;padding:8px 12px;font-family:var(--font-mono);font-size:12px;line-height:1.7}
  .log-entry{display:flex;gap:8px;padding:1px 0}
  .log-ts{color:var(--text3);flex-shrink:0;font-size:11px;padding-top:1px}
  .log-tag{flex-shrink:0;font-weight:700;min-width:14px}
  .log-text{color:var(--text2);word-break:break-word}
  .log-entry.incoming .log-tag{color:var(--green)}
  .log-entry.incoming .log-text{color:var(--text)}
  .log-entry.outgoing .log-tag{color:var(--blue)}
  .log-entry.outgoing .log-text{color:var(--text)}
  .log-entry.error .log-tag{color:var(--red)}
  .log-entry.error .log-text{color:var(--red)}
  .log-entry.ignored .log-tag{color:var(--text3)}
  .log-entry.score{display:none}

  /* Command bar */
  .cmd-bar{
    display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--border);
    background:var(--bg2);flex-shrink:0;
  }
  .cmd-input{
    flex:1;background:var(--bg3);border:1px solid var(--border);color:var(--text);
    padding:7px 12px;border-radius:var(--radius);font-family:var(--font-mono);font-size:13px;
    outline:none;transition:border-color .15s;
  }
  .cmd-input:focus{border-color:var(--accent2)}
  .cmd-input::placeholder{color:var(--text3)}
  .cmd-send{
    background:var(--accent2);color:#fff;border:none;border-radius:var(--radius);
    padding:7px 16px;cursor:pointer;font-size:13px;font-weight:600;transition:background .15s;
  }
  .cmd-send:hover{background:var(--accent)}

  /* Command result */
  .cmd-result{
    background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);
    padding:8px 12px;margin:0 12px 8px;font-family:var(--font-mono);font-size:12px;
    color:var(--text2);white-space:pre-wrap;word-break:break-word;display:none;max-height:200px;overflow-y:auto;
  }
  .cmd-result.visible{display:block}

  /* Other panels */
  #panel-memory,#panel-history,#panel-calendar{
    flex:1;overflow-y:auto;padding:16px;display:none;
  }
  .panel.active{display:flex;flex-direction:column;flex:1;overflow:hidden}
  #panel-memory.active,#panel-history.active,#panel-calendar.active{display:block}

  /* Memory tabs */
  .mem-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
  .mem-tab{
    padding:4px 10px;border-radius:20px;border:1px solid var(--border);background:var(--bg3);
    color:var(--text2);cursor:pointer;font-size:11px;transition:all .15s;
  }
  .mem-tab:hover{border-color:var(--border2);color:var(--text)}
  .mem-tab.active{background:var(--accent2);border-color:var(--accent2);color:#fff}
  .mem-toolbar{display:flex;justify-content:flex-end;gap:8px;margin-bottom:8px}
  .mem-btn{
    padding:5px 12px;border-radius:var(--radius);border:1px solid var(--border);
    background:var(--bg3);color:var(--text2);cursor:pointer;font-size:12px;transition:all .15s;
  }
  .mem-btn:hover{border-color:var(--border2);color:var(--text)}
  .mem-btn.save{background:var(--accent2);border-color:var(--accent2);color:#fff}
  .mem-btn.save:hover{background:var(--accent)}
  .mem-content{
    background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);
    padding:14px;font-family:var(--font-mono);font-size:12px;color:var(--text2);
    white-space:pre-wrap;word-break:break-word;line-height:1.8;min-height:200px;
  }
  .mem-editor{
    width:100%;background:var(--bg3);border:1px solid var(--accent2);border-radius:var(--radius);
    padding:14px;font-family:var(--font-mono);font-size:12px;color:var(--text);
    line-height:1.8;resize:vertical;min-height:300px;outline:none;
  }
  .mem-empty{color:var(--text3);font-style:italic}
  .mem-saved{color:var(--green);font-size:11px;padding:4px 0}

  /* History */
  .hist-days{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
  .hist-day{
    padding:6px 12px;border-radius:var(--radius);border:1px solid var(--border);
    background:var(--bg3);color:var(--text2);cursor:pointer;font-family:var(--font-mono);
    font-size:12px;transition:all .15s;
  }
  .hist-day:hover{border-color:var(--border2);color:var(--text)}
  .hist-day.active{border-color:var(--accent2);color:var(--accent)}
  .hist-content{
    background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius);
    padding:14px;font-family:var(--font-mono);font-size:12px;color:var(--text2);
    white-space:pre-wrap;word-break:break-word;line-height:1.8;max-height:60vh;overflow-y:auto;
  }

  /* Calendar */
  .cal-empty{color:var(--text3);font-style:italic;padding:8px 0}
  .cal-item{
    display:flex;gap:12px;padding:10px 12px;border-radius:var(--radius);
    border:1px solid var(--border);background:var(--bg3);margin-bottom:6px;
  }
  .cal-date{font-family:var(--font-mono);font-size:12px;color:var(--accent);flex-shrink:0;min-width:90px}
  .cal-title{color:var(--text)}
  .cal-notes{font-size:11px;color:var(--text3)}

  /* Scrollbar */
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px}
  ::-webkit-scrollbar-thumb:hover{background:var(--text3)}

  @media(max-width:600px){
    main{grid-template-columns:1fr}
    aside{display:none}
  }
</style>
</head>
<body>
<div id="app">
  <header>
    <span class="logo">girl-agent</span>
    <span class="sep">·</span>
    <span class="name" id="h-name">...</span>
    <span class="stage" id="h-stage">...</span>
    <span class="dot" id="h-dot"></span>
    <span class="spacer"></span>
    <span class="conn" id="h-conn">connecting...</span>
  </header>
  <main>
    <aside>
      <div>
        <div class="section-title">Отношения</div>
        ${["interest","trust","attraction","annoyance","cringe"].map(k => `
        <div class="score-row">
          <div class="score-label"><span>${k}</span><span id="sv-${k}">0</span></div>
          <div class="bar-track"><div class="bar-fill bar-${k}" id="sb-${k}" style="width:50%"></div></div>
        </div>`).join("")}
      </div>
      <div>
        <div class="section-title">Быстрые команды</div>
        <div class="quick-btns">
          ${[":status",":relationship",":persona",":why",":appearance show",":edit vibe normal",":edit vibe alt",":edit vibe cute"].map(cmd =>
            `<button class="quick-btn" onclick="runCmd('${cmd}')">${cmd}</button>`
          ).join("")}
        </div>
      </div>
    </aside>
    <div class="content">
      <div class="tabs">
        <div class="tab active" data-tab="log">Лог</div>
        <div class="tab" data-tab="memory">Память</div>
        <div class="tab" data-tab="history">История</div>
        <div class="tab" data-tab="calendar">Календарь</div>
      </div>

      <!-- Log panel -->
      <div id="panel-log" class="panel active">
        <div class="log-scroll" id="log"></div>
        <div class="cmd-result" id="cmd-result"></div>
        <div class="cmd-bar">
          <input class="cmd-input" id="cmd-input" placeholder=":status · :edit persona · :edit vibe cute ..." autocomplete="off" spellcheck="false">
          <button class="cmd-send" id="cmd-send">→</button>
        </div>
      </div>

      <!-- Memory panel -->
      <div id="panel-memory" class="panel">
        <div class="mem-tabs" id="mem-tabs">
          ${["persona.md","speech.md","communication.md","memory/long-term.md","memory/appearance.md"].map((f,i) =>
            `<div class="mem-tab${i===0?" active":""}" data-file="${f}">${f.replace("memory/","")}</div>`
          ).join("")}
        </div>
        <div class="mem-toolbar">
          <span class="mem-saved" id="mem-saved"></span>
          <button class="mem-btn" id="mem-edit-btn">✎ Редактировать</button>
          <button class="mem-btn save" id="mem-save-btn" style="display:none">💾 Сохранить</button>
          <button class="mem-btn" id="mem-cancel-btn" style="display:none">✕ Отмена</button>
        </div>
        <div class="mem-content" id="mem-content"><span class="mem-empty">загрузка...</span></div>
        <textarea class="mem-editor" id="mem-editor" style="display:none"></textarea>
      </div>

      <!-- History panel -->
      <div id="panel-history" class="panel">
        <div class="hist-days" id="hist-days"></div>
        <div class="hist-content" id="hist-content"></div>
      </div>

      <!-- Calendar panel -->
      <div id="panel-calendar" class="panel">
        <div id="cal-list"></div>
      </div>
    </div>
  </main>
</div>
<script>
const TOKEN = "${tokenParam}";
const api = (path, opts) => fetch(path + TOKEN, opts).then(r => r.json());
const apiText = (path) => fetch(path + TOKEN).then(r => r.text());

// ── Profile & relationship ───────────────────────────────────────────────────
async function loadProfile() {
  const p = await api("/api/profile");
  document.getElementById("h-name").textContent = p.name + ", " + p.age;
  document.getElementById("h-stage").textContent = p.stage;
  document.title = p.name + " · girl-agent";
  loadRelationship();
}

async function loadRelationship() {
  const r = await api("/api/relationship");
  if (!r.score) return;
  const s = r.score;
  ["interest","trust","attraction","annoyance","cringe"].forEach(k => {
    const v = s[k] ?? 0;
    document.getElementById("sv-" + k).textContent = v;
    // bar: 0% = score -100, 50% = score 0, 100% = score 100
    const pct = Math.round((v + 100) / 2);
    document.getElementById("sb-" + k).style.width = pct + "%";
  });
}

// ── SSE event log ────────────────────────────────────────────────────────────
const logEl = document.getElementById("log");
let autoScroll = true;
logEl.addEventListener("scroll", () => {
  autoScroll = logEl.scrollTop + logEl.clientHeight >= logEl.scrollHeight - 20;
});

function appendLog(e) {
  const t = e.ts ? new Date(e.ts).toTimeString().slice(0,8) : "";
  const tag = e.type === "incoming" ? "←" : e.type === "outgoing" ? "→" : e.type === "error" ? "!" : e.type === "ignored" ? "·" : "i";
  const div = document.createElement("div");
  div.className = "log-entry " + e.type;
  div.innerHTML = \`<span class="log-ts">\${t}</span><span class="log-tag">\${tag}</span><span class="log-text">\${escHtml(e.text||"")}</span>\`;
  logEl.appendChild(div);
  if (logEl.children.length > 500) logEl.removeChild(logEl.firstChild);
  if (autoScroll) logEl.scrollTop = logEl.scrollHeight;
  if (e.type === "score") loadRelationship();
}

function escHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

let evtSrc;
function connectSSE() {
  if (evtSrc) evtSrc.close();
  evtSrc = new EventSource("/events" + TOKEN);
  evtSrc.onopen = () => {
    document.getElementById("h-conn").textContent = "●  live";
    document.getElementById("h-conn").className = "conn ok";
    document.getElementById("h-dot").className = "dot online";
  };
  evtSrc.onmessage = e => { try { appendLog(JSON.parse(e.data)); } catch {} };
  evtSrc.onerror = () => {
    document.getElementById("h-conn").textContent = "○  reconnecting";
    document.getElementById("h-conn").className = "conn";
    document.getElementById("h-dot").className = "dot";
    setTimeout(connectSSE, 3000);
  };
}

// ── Commands ─────────────────────────────────────────────────────────────────
const resultEl = document.getElementById("cmd-result");

async function runCmd(cmd) {
  if (!cmd) return;
  cmd = cmd.trim();
  if (!cmd.startsWith(":")) cmd = ":" + cmd;
  appendLog({ type: "info", text: cmd, ts: Date.now() });
  try {
    const r = await api("/api/command" + TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmd })
    });
    resultEl.textContent = r.result || r.error || "";
    resultEl.className = "cmd-result visible";
    if (cmd.includes("relationship") || cmd.includes("reset") || cmd.includes("stage")) loadRelationship();
    if (cmd.includes("memory") || cmd.includes("persona") || cmd.includes("appearance") || cmd.includes("edit")) {
      if (currentTab === "memory") loadMemoryFile(currentMemFile);
    }
  } catch(e) {
    resultEl.textContent = "ошибка: " + e.message;
    resultEl.className = "cmd-result visible";
  }
}

const input = document.getElementById("cmd-input");
document.getElementById("cmd-send").addEventListener("click", () => {
  runCmd(input.value); input.value = "";
});
input.addEventListener("keydown", e => {
  if (e.key === "Enter") { runCmd(input.value); input.value = ""; }
});

// ── Tabs ─────────────────────────────────────────────────────────────────────
let currentTab = "log";
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    document.getElementById("panel-" + currentTab).classList.add("active");
    if (currentTab === "memory") loadMemoryFile(currentMemFile);
    if (currentTab === "history") loadHistoryList();
    if (currentTab === "calendar") loadCalendar();
  });
});

// ── Memory ───────────────────────────────────────────────────────────────────
let currentMemFile = "persona.md";
let memEditMode = false;

document.querySelectorAll(".mem-tab").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".mem-tab").forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    currentMemFile = t.dataset.file;
    exitEditMode();
    loadMemoryFile(currentMemFile);
  });
});

async function loadMemoryFile(file) {
  const el = document.getElementById("mem-content");
  el.innerHTML = '<span class="mem-empty">загрузка...</span>';
  const content = await apiText("/api/memory/" + encodeURIComponent(file));
  el.textContent = content || "";
  if (!content) el.innerHTML = '<span class="mem-empty">(файл пуст)</span>';
  document.getElementById("mem-editor").value = content || "";
}

function enterEditMode() {
  memEditMode = true;
  const content = document.getElementById("mem-content");
  const editor = document.getElementById("mem-editor");
  const editBtn = document.getElementById("mem-edit-btn");
  const saveBtn = document.getElementById("mem-save-btn");
  const cancelBtn = document.getElementById("mem-cancel-btn");
  editor.value = content.textContent || "";
  content.style.display = "none";
  editor.style.display = "block";
  editBtn.style.display = "none";
  saveBtn.style.display = "";
  cancelBtn.style.display = "";
  editor.focus();
}

function exitEditMode() {
  memEditMode = false;
  const content = document.getElementById("mem-content");
  const editor = document.getElementById("mem-editor");
  content.style.display = "";
  editor.style.display = "none";
  document.getElementById("mem-edit-btn").style.display = "";
  document.getElementById("mem-save-btn").style.display = "none";
  document.getElementById("mem-cancel-btn").style.display = "none";
}

document.getElementById("mem-edit-btn").addEventListener("click", enterEditMode);

document.getElementById("mem-cancel-btn").addEventListener("click", () => {
  exitEditMode();
  document.getElementById("mem-saved").textContent = "";
});

document.getElementById("mem-save-btn").addEventListener("click", async () => {
  const editor = document.getElementById("mem-editor");
  const savedEl = document.getElementById("mem-saved");
  const body = editor.value;
  try {
    const r = await fetch("/api/memory/" + encodeURIComponent(currentMemFile) + TOKEN, {
      method: "PUT", body
    });
    if (!r.ok) throw new Error(await r.text());
    // Update view
    const content = document.getElementById("mem-content");
    content.textContent = body || "";
    if (!body) content.innerHTML = '<span class="mem-empty">(файл пуст)</span>';
    exitEditMode();
    savedEl.textContent = "✓ сохранено";
    setTimeout(() => { savedEl.textContent = ""; }, 3000);
  } catch(e) {
    savedEl.textContent = "ошибка: " + e.message;
    savedEl.style.color = "var(--red)";
  }
});

// ── History ──────────────────────────────────────────────────────────────────
let currentDay = null;
async function loadHistoryList() {
  const days = await api("/api/logs");
  const el = document.getElementById("hist-days");
  el.innerHTML = "";
  if (!days.length) { el.innerHTML = '<div style="color:var(--text3);font-size:12px">нет логов</div>'; return; }
  days.forEach(d => {
    const div = document.createElement("div");
    div.className = "hist-day" + (d === currentDay ? " active" : "");
    div.textContent = d;
    div.addEventListener("click", () => loadDay(d));
    el.appendChild(div);
  });
  if (!currentDay && days[0]) loadDay(days[0]);
}

async function loadDay(day) {
  currentDay = day;
  document.querySelectorAll(".hist-day").forEach(d => {
    d.classList.toggle("active", d.textContent === day);
  });
  const content = await apiText("/api/log/" + day);
  document.getElementById("hist-content").textContent = content || "(лог пуст)";
}

// ── Calendar ─────────────────────────────────────────────────────────────────
async function loadCalendar() {
  const events = await api("/api/calendar");
  const el = document.getElementById("cal-list");
  if (!events.length) { el.innerHTML = '<div class="cal-empty">нет событий · добавь через :cal add YYYY-MM-DD название</div>'; return; }
  el.innerHTML = events.map(e => \`
    <div class="cal-item">
      <div class="cal-date">\${e.date}\${e.time ? " "+e.time : ""}</div>
      <div><div class="cal-title">\${escHtml(e.title)}</div>\${e.notes ? '<div class="cal-notes">'+escHtml(e.notes)+'</div>' : ""}</div>
    </div>
  \`).join("");
}

// ── Init ─────────────────────────────────────────────────────────────────────
loadProfile();
connectSSE();
</script>
</body>
</html>`;
}
