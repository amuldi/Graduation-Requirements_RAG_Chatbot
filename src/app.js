/* ============================================================
 * app.js — 화면(UI) 로직. 검색은 engine.js, 판정은 checker.js 가 담당
 * ============================================================ */
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STORE_KEY = 'gradbot.v1';
let state = { dept: 'cse', year: 2022, commonDone: {}, courses: '', act: {} };
try { Object.assign(state, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) { /* 저장소를 못 쓰는 환경은 무시 */ }
const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

let chunks = [...KB];
const retriever = new Retriever(chunks);

/* ---------- 프로필(학과/학번) ---------- */
function initProfile() {
  $('#pDept').innerHTML = Object.entries(DEPTS).map(([id, n]) => `<option value="${id}">${n}</option>`).join('');
  const years = []; for (let y = 2026; y >= 2016; y--) years.push(y);
  $('#pYear').innerHTML = years.map(y => `<option value="${y}">${y}학번</option>`).join('');
  $('#pDept').value = state.dept; $('#pYear').value = state.year;
  const onChange = () => {
    state.dept = $('#pDept').value; state.year = +$('#pYear').value; save();
    renderChecker();
  };
  $('#pDept').onchange = onChange; $('#pYear').onchange = onChange;
}

/* ---------- 탭 ---------- */
document.querySelectorAll('.tab').forEach(btn => btn.onclick = () => showTab(btn.dataset.tab));
function showTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
}

/* ---------- 챗봇 ---------- */
function mdLite(text) {
  const lines = esc(text).split('\n');
  let html = '', inList = false;
  for (const l of lines) {
    const m = l.match(/^\s*[-·]\s+(.*)$/);
    if (m) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${m[1]}</li>`; }
    else { if (inList) { html += '</ul>'; inList = false; } if (l.trim()) html += `<p>${l}</p>`; }
  }
  return html + (inList ? '</ul>' : '');
}
const addMsg = (who, html) => {
  const d = document.createElement('div'); d.className = 'msg ' + who; d.innerHTML = html;
  $('#log').appendChild(d); $('#log').scrollTop = $('#log').scrollHeight; return d;
};

function answer(question) {
  const r = retriever.search(question, { dept: state.dept, year: state.year });
  if (!r.results.length || !r.confident) {
    return `<p>문서에서 관련 내용을 찾지 못했어요. 😢</p>
      <p>학과와 학번을 함께 적어 보세요. 예) <b>“2024학번 사물인터넷학과 졸업요건”</b>, <b>“TOPCIT 점수 기준”</b>, <b>“비교과 신청 방법”</b></p>`;
  }
  const top = r.results[0].chunk;
  let lead = '';
  const total = top.text.match(/합계\s*(\d+)\s*점/);
  if (/총\s*점|합계|몇\s*점|졸업\s*점수|(필요|기준)(한|하)?\s*점수/.test(question) && total && top.dept && top.dept !== 'common') {
    lead = `<p class="lead">${esc(DEPTS[top.dept])} ${esc(yearLabel(top.years))} 졸업 기준은 합계 ${total[1]}점입니다.</p>`;
  } else if (r.dept && top.dept === r.dept) {
    lead = `<p class="lead">${esc(DEPTS[r.dept])}${r.year ? ' ' + r.year + '학번' : ''} 기준으로 찾았어요.</p>`;
  }
  const cards = r.results.map(({ chunk: c }) => `
    <div class="src">
      <div class="src-title">${esc(c.title)}</div>
      <div class="src-meta">📎 ${esc(c.source)}${c.page ? ' · p.' + c.page : ''}${c.extra ? ' · 추가 문서' : ''}</div>
      <div class="src-body">${mdLite(c.text)}</div>
    </div>`).join('');
  const cta = /내\s|제가|나의|저는|충족|가능할|졸업\s*할\s*수/.test(question)
    ? `<div class="cta"><button type="button" class="chip" data-go="check">✅ 내 활동·수강 과목으로 졸업 판정하기</button></div>` : '';
  const yearTip = r.needYear
    ? `<p class="hint">💡 학번을 함께 적으면 그 학번 기준만 보여드려요. (예: “${esc(DEPTS[r.dept] || '학과')} 2024학번 …”)</p>` : '';
  return lead + yearTip + cards + cta;
}

function ask(q) {
  q = q.trim(); if (!q) return;
  addMsg('user', esc(q));
  addMsg('bot', answer(q));
}
$('#chatForm').onsubmit = (e) => { e.preventDefault(); ask($('#q').value); $('#q').value = ''; };
$('#log').onclick = (e) => { const g = e.target.closest('[data-go]'); if (g) showTab(g.dataset.go); };

const EXAMPLES = [
  '2022학번 컴퓨터소프트웨어공학과 졸업 총점은?',
  '2025학번 학술제발표는 몇 점이에요?',
  '컴퓨터소프트웨어공학과 2025학번 비교과 지정 항목은?',
  '2024학번 사물인터넷학과 졸업요건',
  '메타버스&게임학과 TOPCIT 점수 기준',
  '비교과 신청은 어디서 해요?',
];
$('#chips').innerHTML = EXAMPLES.map(t => `<button type="button" class="chip">${esc(t)}</button>`).join('');
$('#chips').onclick = (e) => { const b = e.target.closest('.chip'); if (b) ask(b.textContent); };

/* ---------- 졸업 판정 ---------- */
const FORM_ID = (id) => 'act-' + id;

function parseCourses(text) { return text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean); }

function renderChecker() {
  const g = findGroup(state.dept, state.year);
  $('#checkUnsupported').hidden = !!g;
  $('#checkBody').hidden = !g;
  if (!g) {
    $('#checkUnsupported').innerHTML = `<b>${esc(DEPTS[state.dept])} ${state.year}학번</b>은 자동 판정을 아직 지원하지 않아요.<br>
      이 학과·학번은 PDF에 졸업 기준표가 없어 판정할 수 없어요. 기준 문서가 있는 학번인지 <b>💬 질문하기</b>에서 확인해 보세요.`;
    return;
  }
  // 대학공통
  const common = COMMON_TABLE[commonKeyFor(state.year)];
  $('#commonBox').innerHTML = common.map(([label, pts], i) => `
    <div class="row"><input type="checkbox" id="cm${i}" data-label="${esc(label)}" ${state.commonDone[label] ? 'checked' : ''}>
    <label for="cm${i}">${esc(label)} <small>(${pts}점)</small></label></div>`).join('');
  // 과목 칩
  const pool = [...g.course.items, ...(g.course.special ? [...g.course.special.main, ...g.course.special.subs] : [])];
  $('#courseChips').innerHTML = pool.map(it => `<button type="button" class="chip" data-course="${esc(it.label)}">${esc(it.label)}</button>`).join('');
  $('#courses').value = state.courses;
  // 활동
  const input = (it) => {
    const id = FORM_ID(it.id), v = state.act[it.id];
    if (it.type === 'flag') return `<div class="row"><input type="checkbox" id="${id}" data-act="${it.id}" data-type="flag" ${v ? 'checked' : ''}><label for="${id}">${esc(it.label)} <small>(${it.pts}점)</small></label></div>`;
    const small = it.type === 'number' ? it.hint : (it.hint || '');
    return `<div class="row"><label for="${id}">${esc(it.label)} <small>${esc(small)}</small></label><input type="number" min="0" id="${id}" data-act="${it.id}" data-type="num" value="${v ?? 0}"></div>`;
  };
  $('#desigBox').innerHTML = g.designated.items.map(input).join('');
  $('#freeBox').innerHTML = g.free.items.map(input).join('');
  renderResult();
}

function collect() {
  const courses = parseCourses($('#courses').value);
  state.courses = $('#courses').value;
  document.querySelectorAll('[data-act]').forEach(el => {
    state.act[el.dataset.act] = el.dataset.type === 'flag' ? el.checked : (Number(el.value) || 0);
  });
  document.querySelectorAll('#commonBox input').forEach(el => { state.commonDone[el.dataset.label] = el.checked; });
  save();
  return { commonDone: state.commonDone, courses, act: state.act };
}

function renderResult() {
  const res = evaluate(state.dept, state.year, collect());
  if (res.error) { $('#result').innerHTML = esc(res.error); return; }
  const pct = (a, b) => Math.round(Math.min(100, (a / b) * 100));
  const cats = res.cats.map(c => `
    <div class="cat">
      <div class="cat-head"><span>${esc(c.name)}</span><span>${c.earned} / ${c.required}점</span></div>
      <div class="bar ${c.ok ? 'done' : ''}"><i style="width:${pct(c.earned, c.required)}%"></i></div>
      <ul class="lines">${c.lines.map(l => `
        <li class="${l.ok ? '' : 'miss'}">${l.ok ? '✔' : '✘'} ${esc(l.label)} — ${l.earned}${l.max != null ? '/' + l.max : ''}점 ${l.hint ? '<small>' + esc(l.hint) + '</small>' : ''}</li>`).join('')}
      </ul>
    </div>`).join('');
  const lacking = res.cats.filter(c => !c.ok).map(c => `${c.name} ${c.required - c.earned}점`).join(', ');
  $('#result').innerHTML = `
    <h2>④ 판정 결과 — ${esc(DEPTS[state.dept])} ${state.year}학번 (기준 ${res.target}점)</h2>
    <div class="verdict ${res.ok ? 'ok' : 'no'}">${res.ok
      ? `🎉 졸업인증 기준을 충족했습니다 (${res.total} / ${res.target}점)`
      : `아직 부족해요: ${res.total} / ${res.target}점 · 남은 ${res.remaining}점${lacking ? ` (${esc(lacking)})` : ''}`}</div>
    ${res.warnings.map(w => `<div class="warn">ℹ️ ${esc(w)}</div>`).join('')}
    ${res.unmatched.length ? `<div class="warn">기준표에서 찾지 못한 과목: ${res.unmatched.map(esc).join(', ')} — 과목명을 기준표 이름과 맞춰 보세요.</div>` : ''}
    ${cats}
    <p class="hint">구간별 점수는 해당 구간 요구 점수까지만 반영됩니다. 실제 인정 여부는 종합정보시스템의 개인별졸업진도관리에서 확인하세요.</p>`;
}

$('#checkBody').addEventListener('input', renderResult);
$('#checkBody').addEventListener('change', renderResult);
$('#allCommon').onclick = () => { document.querySelectorAll('#commonBox input').forEach(e => e.checked = true); renderResult(); };
$('#noCommon').onclick = () => { document.querySelectorAll('#commonBox input').forEach(e => e.checked = false); renderResult(); };
$('#courseChips').onclick = (e) => {
  const b = e.target.closest('[data-course]'); if (!b) return;
  const list = parseCourses($('#courses').value), name = b.dataset.course;
  const i = list.findIndex(x => normText(x) === normText(name));
  if (i >= 0) list.splice(i, 1); else list.push(name);
  $('#courses').value = list.join('\n'); renderResult();
};

/* ---------- 문서 탭 ---------- */
function renderDocs() {
  const by = {};
  chunks.forEach(c => { (by[c.source] ||= { n: 0, extra: !!c.extra }).n++; });
  $('#docList').innerHTML = Object.entries(by).map(([s, v]) => `<li>${esc(s)} — chunk ${v.n}개${v.extra ? ' <span class="badge">추가</span>' : ''}</li>`).join('');
}
function addChunks(newChunks, label) {
  chunks = chunks.concat(newChunks); retriever.setChunks(chunks); renderDocs();
  $('#addedMsg').textContent = `✅ ${label}: ${newChunks.length}개 조각이 추가되었습니다. 💬 질문하기에서 물어보세요.`;
}
async function loadPdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;
  await new Promise((ok, no) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = ok; s.onerror = () => no(new Error('pdf.js 로드 실패(인터넷 연결 확인)'));
    document.head.appendChild(s);
  });
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  return pdfjsLib;
}
$('#file').onchange = async (e) => {
  for (const f of e.target.files) {
    try {
      const name = f.name.replace(/\.[^.]+$/, '');
      if (/\.pdf$/i.test(f.name)) {
        const lib = await loadPdfJs();
        const pdf = await lib.getDocument({ data: await f.arrayBuffer() }).promise;
        let out = [];
        for (let p = 1; p <= pdf.numPages; p++) {
          const tc = await (await pdf.getPage(p)).getTextContent();
          out = out.concat(chunkPlainText(tc.items.map(i => i.str).join(' '), name, p));
        }
        addChunks(out, f.name);
      } else addChunks(chunkPlainText(await f.text(), name), f.name);
    } catch (err) { $('#addedMsg').textContent = '❌ ' + f.name + ': ' + err.message; }
  }
  e.target.value = '';
};
$('#pasteAdd').onclick = () => {
  const t = $('#pasteText').value.trim(); if (!t) return;
  addChunks(chunkPlainText(t, $('#pasteName').value.trim() || '붙여넣은 문서'), '붙여넣기');
  $('#pasteText').value = '';
};

/* ---------- 시작 ---------- */
initProfile(); renderDocs(); renderChecker();
addMsg('bot', `<p>안녕하세요! 다면적졸업인증제 기준 문서를 바탕으로 답해 드려요. 📚</p>
  <ul><li>학과·학번을 함께 물어보면 정확해요. (상단에서 기본값 선택 가능)</li>
  <li>내 활동·수강 과목으로 졸업 충족 여부를 보려면 <b>✅ 졸업 판정</b> 탭을 이용하세요.</li></ul>`);
