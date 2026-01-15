function $(sel){ return document.querySelector(sel); }

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

function qparam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
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

// Index: topic list
async function initIndex(){
  const topics = await loadJson("./data/topics.json");
  const q = $("#search");
  const grid = $("#topicGrid");

  function render(){
    const term = norm(q.value).toLowerCase();
    const filtered = topics.filter(t => (t.topic || "").toLowerCase().includes(term));
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

  q?.addEventListener("input", render);
  render();
}

// Topic: quickfire
async function initTopic(){
  const topic = qparam("topic") || "Uncategorised";
  $("#topicTitle").textContent = topic;

  const data = await loadJson("./data/qbank.json");
  const filtered = data.filter(r => norm(r.topic) === topic);

  $("#topicMeta").textContent = `${filtered.length} questions`;

  let deck = filtered.slice();
  let idx = 0;
  let showAnswer = false;

  // Flagged = saved-for-later review list (local to this device/browser)
  const flaggedKey = `flagged:${topic}`;
  let flagged = new Set(getLocal(flaggedKey, []));

  function current(){ return deck[idx] || null; }

  function renderCard(){
    const r = current();
    showAnswer = false;
    $("#answerBox")?.classList.add("hidden");

    if(!r){
      $("#qText").innerHTML = `<span class="small">No questions match these filters.</span>`;
      $("#aText").textContent = "";
      $("#refText").textContent = "";
      $("#progress").textContent = `0 / 0`;
      return;
    }

    $("#qText").textContent = r.question || "";
    $("#aText").textContent = r.answer || "";

    const meta = [];
    if(norm(r.id)) meta.push(`Q-${r.id}`);
    if(norm(r.ref)) meta.push(r.ref);
    if(norm(r.source)) meta.push(r.source);
    if(norm(r.status) === "needs_image") meta.push("needs image");
    $("#refText").textContent = meta.join(" · ");

    $("#progress").textContent = `${idx + 1} / ${deck.length}`;
  }

  function applyFilters(){
    const includeHidden = $("#toggleHidden")?.checked ?? false;
    const onlyFlagged = $("#toggleFlagged")?.checked ?? false;

    let d = filtered.slice();

    // "Hidden" means excluded from general users by default.
    if(!includeHidden){
      d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    }

    if(onlyFlagged){
      d = d.filter(r => flagged.has(norm(r.id)));
    }

    deck = shuffle(d);
    idx = 0;
    renderCard();
  }

  // Controls
  $("#btnReveal")?.addEventListener("click", () => {
    if(!current()) return;
    showAnswer = !showAnswer;
    $("#answerBox")?.classList.toggle("hidden", !showAnswer);
  });

  $("#btnNext")?.addEventListener("click", () => {
    if(!current()) return;
    idx = (idx + 1) % deck.length;
    renderCard();
  });

  $("#btnPrev")?.addEventListener("click", () => {
    if(!current()) return;
    idx = (idx - 1 + deck.length) % deck.length;
    renderCard();
  });

  $("#btnFlag")?.addEventListener("click", () => {
    const r = current();
    if(!r) return;
    flagged.add(norm(r.id));
    setLocal(flaggedKey, Array.from(flagged));
    $("#flaggedCount").textContent = `${flagged.size} flagged saved`;
  });

  $("#btnClearFlagged")?.addEventListener("click", () => {
    flagged = new Set();
    setLocal(flaggedKey, []);
    $("#flaggedCount").textContent = `0 flagged saved`;
    applyFilters();
  });

  $("#toggleHidden")?.addEventListener("change", applyFilters);
  $("#toggleFlagged")?.addEventListener("change", applyFilters);

  function setSize(n){
    const includeHidden = $("#toggleHidden")?.checked ?? false;
    const onlyFlagged = $("#toggleFlagged")?.checked ?? false;

    let d = filtered.slice();
    if(!includeHidden) d = d.filter(r => norm(r.visibility).toLowerCase() !== "hidden");
    if(onlyFlagged) d = d.filter(r => flagged.has(norm(r.id)));

    d = shuffle(d).slice(0, n);
    deck = d;
    idx = 0;
    renderCard();
  }

  $("#btn10")?.addEventListener("click", () => setSize(10));
  $("#btn30")?.addEventListener("click", () => setSize(30));

  // Initial
  $("#flaggedCount").textContent = `${flagged.size} flagged saved`;
  applyFilters();
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if(page === "index") initIndex().catch(err => alert(err.message));
  if(page === "topic") initTopic().catch(err => alert(err.message));
});

