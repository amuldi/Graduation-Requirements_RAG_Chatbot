/* ============================================================
 * engine.js — 브라우저 안에서 도는 RAG 검색기 (BM25, 외부 API 없음)
 *   1) 문서를 chunk 로 나눠 색인
 *   2) 질문에서 학과·학번을 읽어 후보를 거른다(metadata filtering)
 *   3) 한글 2글자 조각 + 단어 BM25 로 순위를 매긴다
 *   4) 근거 chunk 를 그대로 보여준다 (생성형 환각 없음)
 * ============================================================ */

const DEPTS = {
  cse: '컴퓨터소프트웨어공학과',
  infosec: '정보보호학과',
  medit: '의료IT공학과',
  aibd: 'AI·빅데이터학과',
  iot: '사물인터넷학과',
  meta: '메타버스&게임학과',
};

const DEPT_PATTERNS = {
  cse: /컴퓨터\s*소프트웨어(공학)?|컴소공|컴소|소프트웨어공학/,
  infosec: /정보\s*보호|정보보안/,
  medit: /의료\s*it|의료\s*아이티|의료it공학/i,
  aibd: /ai\s*[·.\-ㆍ]?\s*빅\s*데이터|빅데이터\s*학과|에이아이/i,
  iot: /사물\s*인터넷|iot/i,
  meta: /메타\s*버스|게임\s*학과|메타버스\s*&\s*게임/,
};

function detectDept(q) {
  for (const [id, re] of Object.entries(DEPT_PATTERNS)) if (re.test(q)) return id;
  return null;
}

function detectYear(q) {
  let m = q.match(/(20\d{2})\s*(학번|년\s*입학|입학)/);
  if (m) return +m[1];
  m = q.match(/(?<!\d)(\d{2})\s*학번/);
  if (m) return 2000 + +m[1];
  m = q.match(/(20\d{2})/);
  return m ? +m[1] : null;
}

// 질문에 흔히 붙는 군더더기 (검색 신호가 아님)
const FILLER = new Set(['가요','돼요','되나','되나요','있나','있나요','알려','려줘','줘요','주세','세요','뭐','뭔가','어떻','어떻게','하나','하나요','할까','얼마','필요','요건','해야','야해','게해','뭐야']);

const KO_SUFFIX = /(이란|이야|인가요|인가|나요|가요|어요|해요|해줘|알려줘|알려주세요|뭐야|뭐예요|입니까|이에요|예요|에서|으로|까지|부터|이|가|은|는|을|를|의|에|로|와|과|도|만)$/;

function tokenize(text) {
  const words = String(text).toLowerCase().match(/[가-힣]+|[a-z0-9]+/g) || [];
  const out = [];
  for (let w of words) {
    if (/^[가-힣]+$/.test(w)) {
      if (w.length >= 3) w = w.replace(KO_SUFFIX, '') || w;
      if (w.length === 1) { out.push(w); continue; }
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
      if (w.length >= 3) out.push(w);
    } else out.push(w);
  }
  return out;
}

class Retriever {
  constructor(chunks) { this.setChunks(chunks); }

  setChunks(chunks) {
    this.chunks = chunks;
    this.docs = chunks.map(c => tokenize(`${c.title} ${c.title} ${c.text}`));
    this.avgLen = this.docs.reduce((a, d) => a + d.length, 0) / Math.max(1, this.docs.length);
    this.df = new Map();
    this.tf = this.docs.map(d => {
      const m = new Map();
      for (const t of d) m.set(t, (m.get(t) || 0) + 1);
      for (const t of m.keys()) this.df.set(t, (this.df.get(t) || 0) + 1);
      return m;
    });
  }

  bm25(qTokens, i) {
    const N = this.chunks.length, k1 = 1.4, b = 0.75;
    const len = this.docs[i].length;
    let s = 0;
    for (const t of new Set(qTokens)) {
      const f = this.tf[i].get(t);
      if (!f) continue;
      const n = this.df.get(t);
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * len / this.avgLen));
    }
    return s;
  }

  /**
   * @param {string} question
   * @param {{dept?:string, year?:number}} profile 화면 상단에서 고른 기본 학과/학번
   */
  search(question, profile = {}, topK = 3) {
    const askedDept = detectDept(question);
    const askedYear = detectYear(question);
    const dept = askedDept || profile.dept || null;
    // 다른 학과를 물었는데 학번은 안 적었다면, 내 학번(프로필)을 그 학과에 억지로 적용하지 않는다
    const otherDept = askedDept && profile.dept && askedDept !== profile.dept;
    const year = askedYear || (otherDept ? null : profile.year) || null;

    // 학과·학번 표현은 필터로 쓰고, 단어 매칭에서는 뺀다
    const cleaned = question
      .replace(/(20\d{2}|\d{2})\s*(학번|년\s*입학)/g, ' ')
      .replace(new RegExp(Object.values(DEPT_PATTERNS).map(r => r.source).join('|'), 'gi'), ' ')
      .replace(/학과/g, ' ')
      .replace(/총\s*점수?|졸업\s*점수|필요(한|하)?\s*점수|기준\s*점수|몇\s*점|몇점/g, ' 합계 ');
    const qTokens = tokenize(cleaned).filter(t => !FILLER.has(t));
    const wantsGuide = /어디|문의|연락|위치|방문|센터|신청|확인\s*(방법|하는)/.test(question);

    const scored = this.chunks.map((c, i) => {
      const raw = this.bm25(qTokens, i);
      let mult = 1;
      if (wantsGuide && c.dept === 'common' && !c.years) mult *= 2; // 신청·문의 류 질문은 공통 안내 문서 우선
      if (c.dept && c.dept !== 'common' && dept) mult *= c.dept === dept ? 1.5 : (askedDept ? 0.05 : 0.4);
      if (c.years && year) {
        const [a, b] = c.years;
        mult *= year >= a && year <= b ? 1.6 : (askedYear ? 0.1 : 0.35);
      }
      return { chunk: c, raw, score: raw * mult };
    }).filter(r => r.raw > 0).sort((a, b) => b.score - a.score);

    const top = scored[0];
    const results = top ? scored.filter(r => r.score >= top.score * 0.5).slice(0, topK) : [];
    // 질문의 핵심 단어 중 1/3 이상이 근거 문서에 있어야 "찾았다"고 본다 (흔한 단어 하나만 겹친 경우 거절)
    let coverage = 0;
    if (top) {
      const uniq = [...new Set(qTokens)];
      const hit = uniq.filter(t => this.tf[this.chunks.indexOf(top.chunk)].has(t)).length;
      coverage = uniq.length ? hit / uniq.length : 0;
    }
    const deptHit = !!askedDept && !!top && top.chunk.dept === askedDept; // 학과를 직접 지목하고 그 학과 문서가 나온 경우
    const confident = !!top && coverage >= 0.34 && (top.raw >= 0.3 || deptHit);
    const needYear = confident && !year && results.some(r => r.chunk.years);
    return { results, dept, year, askedDept, askedYear, confident, coverage, needYear };
  }
}

/** 청크를 "N~M학번" 같은 라벨로 */
function yearLabel(years) {
  if (!years) return '';
  return years[0] === years[1] ? `${years[0]}학번` : `${years[0]}~${years[1]}학번`;
}

/** 업로드/붙여넣기 텍스트를 검색용 chunk 로 자른다 */
function chunkPlainText(text, sourceName, page) {
  const paras = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  let buf = '';
  const flush = () => {
    if (buf.trim()) chunks.push({
      title: `${sourceName}${page ? ` p.${page}` : ''} (${chunks.length + 1})`,
      text: buf.trim(), dept: null, years: null, page: page || null, source: sourceName, extra: true,
    });
    buf = '';
  };
  for (const p of paras) {
    if ((buf + '\n' + p).length > 700) flush();
    buf += (buf ? '\n' : '') + p;
    while (buf.length > 1100) { chunks.push({ title: `${sourceName}${page ? ` p.${page}` : ''} (${chunks.length + 1})`, text: buf.slice(0, 900), dept: null, years: null, page: page || null, source: sourceName, extra: true }); buf = buf.slice(800); }
  }
  flush();
  return chunks;
}

if (typeof module !== 'undefined') module.exports = { Retriever, tokenize, detectDept, detectYear, DEPTS, yearLabel, chunkPlainText };
