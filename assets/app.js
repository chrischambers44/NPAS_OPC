// Minimal, fast revision UI. No build tools required.

function $(sel){ return document.querySelector(sel); }

function qparam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

async function loadJson(path){
  const res = await fetch(path, {cache: "no-store"});
  if(!res.ok) throw new Error("Failed to load " + path);
  return await res.json();
}

function norm(s){ return (s ?? "").toString().trim(); }

function shuffle(arr){
  for(let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function safeHtml(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function getLocal(key, fallback){
  try{
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  }catch(e){ return fallback; }
}
function setLocal(key, value){
  try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){}
}

// -------- Knowledge Bank index (kb.html uses this) --------
async function initIndex(){
  const topics = await loadJson("./data/topics.json");
  const q = $("#search");
  const grid = $("#topicGrid");

  function render(){
    const term = norm(q.value).toLowerCase();
    const filtered = topics.filter(t => t.topic.toLowerCase().includes(term));
    grid.innerHTML = filtered.map(t => `
      <a class="card" href="topic.html?topic=${encodeURIComponent(t.topic)}">
        <div class="row" style="justify-content:space-between">
          <div style="font-weight:600">${safeHtml(t.topic)}</div>
          <span class="pill">${t.count}</span>
        </div>
        <div class="small" style="margin-top:8px">Open quickfire</div>
      </a>
    `).join("");
    $("#count").textContent = `${filtered.length} topics`;
  }

  q.addEventListener("input", render);
  render();
}

// -------- Topic page (Knowledge Bank per topic) --------
async function initTopic(){
  const topic = qparam("topic") || "Uncategorised";
  $("#topicTitle").textContent = topic;

  const data = await loadJson("./data/qbank.json");
  const filtered = data.filter(r => norm(r.topic) === topic);

  $("#topicMeta").textContent = `${filtered.length} questions`;

  // Light “sim gotchas” placeholder: uses any notes in the dataset.
  const hints = filtered.map(r => norm(r.notes)).filter(n => n.length >= 8).slice(0, 12);
  if(hints.length === 0){
    hints.push("No notes captured for this topic yet. Consider adding topic-level gotchas in OPC Prep.");
  }
  $("#simHints").innerHTML = hints.map(h => `<li>${safeHtml(h)}</li>`).join("");

  // Quickfire state
  let deck = filtered.slice();
  let idx = 0;
  let showAnswer = false;

  const missedKey = `missed:topic:${topic}`;
  let missed = new Set(getLocal(missedKey, []));

  function applyFilters(){
    const includeHidden = $("#toggleHidden").checked;
    const onlyMissed = $("#toggleMissed").checked;

    let d = filtered.slice();
    if(!includeHidden){
      d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    }
    if(onlyMissed){
      d = d.filter(r => missed.has(norm(r.id)));
    }
    deck = shuffle(d);
    idx = 0;
    renderCard();
  }

  function current(){ return deck[idx] || null; }

  function renderCard(){
    const r = current();
    showAnswer = false;
    $("#answerBox").classList.add("hidden");
    if(!r){
      $("#qText").innerHTML = `<span class="small">No questions match these filters.</span>`;
      $("#aText").textContent = "";
      $("#refText").textContent = "";
      $("#progress").textContent = `0 / 0`;
      return;
    }
    $("#qText").textContent = r.question;
    $("#aText").textContent = r.answer;

    const meta = [];
    if(norm(r.id)) meta.push(`Q-${r.id}`);
    if(norm(r.ref)) meta.push(r.ref);
    if(norm(r.source)) meta.push(r.source);
    if(norm(r.status) === "needs_image") meta.push("needs image");
    $("#refText").textContent = meta.join(" · ");

    $("#progress").textContent = `${idx + 1} / ${deck.length}`;
  }

  $("#btnReveal").addEventListener("click", () => {
    if(!current()) return;
    showAnswer = !showAnswer;
    $("#answerBox").classList.toggle("hidden", !showAnswer);
  });

  $("#btnNext").addEventListener("click", () => {
    if(!current()) return;
    idx = (idx + 1) % deck.length;
    renderCard();
  });

  $("#btnMiss").addEventListener("click", () => {
    const r = current();
    if(!r) return;
    missed.add(norm(r.id));
    setLocal(missedKey, Array.from(missed));
    idx = (idx + 1) % deck.length;
    renderCard();
    $("#missedCount").textContent = `${missed.size} missed saved`;
  });

  $("#btnClearMissed").addEventListener("click", () => {
    missed = new Set();
    setLocal(missedKey, []);
    $("#missedCount").textContent = `0 missed saved`;
    applyFilters();
  });

  $("#toggleHidden").addEventListener("change", applyFilters);
  $("#toggleMissed").addEventListener("change", applyFilters);

  function setSize(n){
    const includeHidden = $("#toggleHidden").checked;
    const onlyMissed = $("#toggleMissed").checked;
    let d = filtered.slice();
    if(!includeHidden) d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    if(onlyMissed) d = d.filter(r => missed.has(norm(r.id)));
    d = shuffle(d).slice(0, n);
    deck = d;
    idx = 0;
    renderCard();
  }
  $("#btn10").addEventListener("click", () => setSize(10));
  $("#btn30").addEventListener("click", () => setSize(30));

  $("#missedCount").textContent = `${missed.size} missed saved`;
  applyFilters();
}

// -------- Drill page (filterable quickfire across topics/tags/source) --------
function parseListParam(name){
  const v = qparam(name);
  if(!v) return [];
  return v.split(",").map(s => decodeURIComponent(s).trim()).filter(Boolean);
}

function recordHasTags(r, wantTags){
  if(wantTags.length === 0) return true;
  const have = new Set(norm(r.tags).split(",").map(s => s.trim()).filter(Boolean));
  return wantTags.every(t => have.has(t));
}

async function initDrill(){
  const data = await loadJson("./data/qbank.json");

  const title = qparam("title") || "Drill";
  $("#drillTitle").textContent = title;

  const topics = parseListParam("topics");
  const tags = parseListParam("tags");
  const tag = qparam("tag");
  const sourceContains = qparam("source");
  const topic = qparam("topic");

  let filtered = data.slice();

  // Topic filter (single) or topics list
  if(topic){
    filtered = filtered.filter(r => norm(r.topic) === topic);
  }else if(topics.length){
    const set = new Set(topics);
    filtered = filtered.filter(r => set.has(norm(r.topic)));
  }

  // Tag filter(s)
  const wantTags = tags.length ? tags : (tag ? [tag] : []);
  if(wantTags.length){
    filtered = filtered.filter(r => recordHasTags(r, wantTags));
  }

  // Source substring
  if(sourceContains){
    const s = sourceContains.toLowerCase();
    filtered = filtered.filter(r => norm(r.source).toLowerCase().includes(s));
  }

  $("#drillMeta").textContent = `${filtered.length} questions`;

  // Quickfire state
  let deck = filtered.slice();
  let idx = 0;
  let showAnswer = false;

  const signature = JSON.stringify({topic, topics, wantTags, sourceContains});
  const missedKey = `missed:drill:${signature}`;
  let missed = new Set(getLocal(missedKey, []));

  function applyFilters(){
    const includeHidden = $("#toggleHidden").checked;
    const onlyMissed = $("#toggleMissed").checked;

    let d = filtered.slice();
    if(!includeHidden){
      d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    }
    if(onlyMissed){
      d = d.filter(r => missed.has(norm(r.id)));
    }
    deck = shuffle(d);
    idx = 0;
    renderCard();
  }

  function current(){ return deck[idx] || null; }

  function renderCard(){
    const r = current();
    showAnswer = false;
    $("#answerBox").classList.add("hidden");
    if(!r){
      $("#qText").innerHTML = `<span class="small">No questions match these filters.</span>`;
      $("#aText").textContent = "";
      $("#refText").textContent = "";
      $("#progress").textContent = `0 / 0`;
      return;
    }
    $("#qText").textContent = r.question;
    $("#aText").textContent = r.answer;

    const meta = [];
    if(norm(r.id)) meta.push(`Q-${r.id}`);
    if(norm(r.topic)) meta.push(r.topic);
    if(norm(r.ref)) meta.push(r.ref);
    if(norm(r.source)) meta.push(r.source);
    $("#refText").textContent = meta.join(" · ");

    $("#progress").textContent = `${idx + 1} / ${deck.length}`;
  }

  $("#btnReveal").addEventListener("click", () => {
    if(!current()) return;
    showAnswer = !showAnswer;
    $("#answerBox").classList.toggle("hidden", !showAnswer);
  });

  $("#btnNext").addEventListener("click", () => {
    if(!current()) return;
    idx = (idx + 1) % deck.length;
    renderCard();
  });

  $("#btnMiss").addEventListener("click", () => {
    const r = current();
    if(!r) return;
    missed.add(norm(r.id));
    setLocal(missedKey, Array.from(missed));
    idx = (idx + 1) % deck.length;
    renderCard();
    $("#missedCount").textContent = `${missed.size} missed saved`;
  });

  $("#btnClearMissed").addEventListener("click", () => {
    missed = new Set();
    setLocal(missedKey, []);
    $("#missedCount").textContent = `0 missed saved`;
    applyFilters();
  });

  $("#toggleHidden").addEventListener("change", applyFilters);
  $("#toggleMissed").addEventListener("change", applyFilters);

  function setSize(n){
    const includeHidden = $("#toggleHidden").checked;
    const onlyMissed = $("#toggleMissed").checked;
    let d = filtered.slice();
    if(!includeHidden) d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    if(onlyMissed) d = d.filter(r => missed.has(norm(r.id)));
    d = shuffle(d).slice(0, n);
    deck = d;
    idx = 0;
    renderCard();
  }
  $("#btn10").addEventListener("click", () => setSize(10));
  $("#btn30").addEventListener("click", () => setSize(30));

  $("#missedCount").textContent = `${missed.size} missed saved`;
  applyFilters();
}

// -------- OPC pages --------
async function initOpcIndex(){
  const mods = await loadJson("../data/opc_modules.json");
  const grid = $("#opcGrid");
  grid.innerHTML = mods.map(m => `
    <a class="card" href="module.html?id=${encodeURIComponent(m.id)}">
      <div class="row" style="justify-content:space-between">
        <div style="font-weight:700">${safeHtml(m.title)}</div>
        <span class="pill">module</span>
      </div>
      <div class="small" style="margin-top:8px">${safeHtml((m.summary||[])[0] || "")}</div>
    </a>
  `).join("");
}

async function initOpcModule(){
  const id = qparam("id");
  const mods = await loadJson("../data/opc_modules.json");
  const m = mods.find(x => x.id === id) || mods[0];

  $("#modTitle").textContent = m.title || "Module";

  $("#modSummary").innerHTML = (m.summary||[]).map(x => `<li>${safeHtml(x)}</li>`).join("");
  $("#modTRE").innerHTML = (m.tre_looks_for||[]).map(x => `<li>${safeHtml(x)}</li>`).join("");
  $("#modPickups").innerHTML = (m.common_pickups||[]).map(x => `<li>${safeHtml(x)}</li>`).join("");
  $("#modPatterns").innerHTML = (m.sim_patterns||[]).map(x => `<li>${safeHtml(x)}</li>`).join("");

  const drills = (m.drills||[]).map(d => `<a class="btn" href="${d.href}&title=${encodeURIComponent(m.title)}">${safeHtml(d.label)}</a>`).join("");
  $("#modDrills").innerHTML = drills || `<span class="small">No drills configured.</span>`;
}

// Auto-init by page
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex().catch(err => alert(err.message));
  if(page === "topic") initTopic().catch(err => alert(err.message));
  if(page === "drill") initDrill().catch(err => alert(err.message));
  if(page === "opc-index") initOpcIndex().catch(err => alert(err.message));
  if(page === "opc-module") initOpcModule().catch(err => alert(err.message));
});
