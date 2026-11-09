/* ============================================================
 * checker.js — 졸업 충족 판정 (컴퓨터소프트웨어공학과 2016~2026학번)
 * 기준: 「2026년도 학과기준 디자인 시안(1차 시안-SW융합대학)」 p.1~2
 * 다른 학과를 추가하려면 CHECKER_GROUPS 에 같은 형식으로 그룹을 추가하면 됩니다.
 * ============================================================ */

const COMMON_TABLE = {
  '2019-2022': [
    ['인간사랑', 5], ['ASP(1,2학기)', 5], ['자기주도상담', 5],
    ['자기개발과 전공탐색', 5], ['졸업필수활동', 15], ['현대기본영어', 5], ['봉사학습', 5],
  ],
  '2023-2023': [
    ['인간사랑', 5], ['ASP(1,2학기)', 5], ['자기주도상담', 5],
    ['자기개발과 전공탐색(M&M)', 5], ['졸업종합지도', 15], ['현대기본영어', 5], ['봉사학습', 5],
  ],
  '2024-2026': [
    ['인간사랑', 5], ['ASP(1,2학기)', 5], ['자기주도상담', 5],
    ['자기개발과 전공탐색(M&M)', 5], ['졸업및취·창업지도', 13],
    ['학습윤리-기본', 1], ['학습윤리-심화', 1], ['현대실용영어', 5], ['봉사학습', 5],
  ],
};

function commonKeyFor(year) {
  if (year >= 2024) return '2024-2026';
  if (year === 2023) return '2023-2023';
  return '2019-2022'; // 2016~2018학번은 PDF에 표가 없어 2019~2022 기준을 준용
}

const _c = (id, label, pts, alias) => ({ id, label, pts, alias: alias || [label] });
const _count = (id, label, per, max, hint) => ({ id, label, type: 'count', per, max, hint });
const _flag = (id, label, pts, hint) => ({ id, label, type: 'flag', pts, hint });

const ENG_MAIN = [
  _c('eng1', '전공영어1', 5), _c('eng2', '전공영어2', 5),
  _c('eng3', '전공영어3', 5), _c('eng4', '전공영어4', 5),
];
const ENG_SUB = [
  _c('engBasic', '전공영어기초', 5), _c('engApply', '전공영어응용', 5), _c('startup', '예비창업설계', 5),
];

// 비교과 미지정 공통 입력(회당 점수는 PDF 각주 기준)
const FREE_COMMON = [
  _count('topcit', 'TOPCIT 응시', 1, 99, '회당 1점'),
  _count('dept', '학과활동', 1, 99, '회당 1점'),
  _flag_free(),
];
function _flag_free() {
  return { id: 'free', label: '기타 비교과자율활동 점수 (맛있는SW시리즈 등)', type: 'number', hint: '직접 입력한 점수' };
}
const MT_FREE = _count('mt', '학과 MT 참여', 2, 99, '회당 2점');

const CHECKER_GROUPS = [
  {
    dept: 'cse', years: [2016, 2020], total: 90,
    course: {
      req: 25,
      items: [_c('cap1', '캡스톤디자인1', 5, ['캡스톤디자인1', '캡스톤1']), _c('cap2', '캡스톤디자인2', 5, ['캡스톤디자인2', '캡스톤2'])],
      special: { label: '전공영어 (1~4 중 택3, 15점)', main: ENG_MAIN, subs: ENG_SUB, slots: 3, per: 5 },
    },
    designated: { req: 14, items: [_count('adv', '전공상담', 1, 4, '회당 1점, 최대 4점'), _flag('fest', '학술제 발표', 10)] },
    free: { req: 6, items: [FREE_COMMON[0], FREE_COMMON[1], MT_FREE, FREE_COMMON[2]] },
    note: '전공영어1~4 중 택3을 수강하지 못했다면 전공영어기초·전공영어응용·예비창업설계로 대체 인정됩니다.',
  },
  {
    dept: 'cse', years: [2021, 2021], total: 90,
    course: {
      req: 25,
      items: [_c('cap1', '캡스톤디자인1', 5, ['캡스톤디자인1', '캡스톤1']), _c('cap2', '캡스톤디자인2', 5, ['캡스톤디자인2', '캡스톤2'])],
      special: { label: '전공영어 (1~4 중 택3, 15점)', main: ENG_MAIN, subs: ENG_SUB, slots: 3, per: 5 },
    },
    designated: {
      req: 15,
      items: [_count('adv', '전공상담', 1, 4, '회당 1점, 최대 4점'), _count('deptDesig', '학과활동 (4학년 간담회 참석)', 1, 1, '1점'), _flag('fest', '학술제 발표', 10)],
    },
    free: { req: 5, items: [FREE_COMMON[0], MT_FREE, FREE_COMMON[2]] },
    note: '전공영어1~4 중 택3을 수강하지 못했다면 전공영어기초·전공영어응용·예비창업설계로 대체 인정됩니다.',
  },
  {
    dept: 'cse', years: [2022, 2024], total: 104,
    course: {
      req: 25,
      items: [
        _c('cap', '캡스톤디자인', 5), _c('indcap', '산학캡스톤디자인', 5),
        _c('engBasic', '전공영어기초', 5), _c('engApply', '전공영어응용', 5), _c('startup', '예비창업설계', 5),
      ],
    },
    designated: {
      req: 24,
      items: [
        _count('adv', '전공상담', 1, 4, '회당 1점, 최대 4점'), _flag('fest', '학술제 발표', 10),
        _flag('coding', '코딩역량인증제 Level2 이상', 5), _flag('aisw', 'AI·SW전공역량졸업인증제', 5),
      ],
    },
    free: { req: 10, items: [FREE_COMMON[0], FREE_COMMON[1], MT_FREE, FREE_COMMON[2]] },
  },
  {
    dept: 'cse', years: [2025, 2026], total: 104,
    course: {
      req: 25,
      items: [
        _c('cap', '캡스톤디자인', 5), _c('indcap', '산학캡스톤디자인', 5),
        _c('engBasic', '전공영어기초', 5), _c('engApply', '전공영어응용', 5), _c('startup', '예비창업설계', 5),
      ],
    },
    designated: {
      req: 24,
      items: [
        _count('adv', '전공상담', 1, 4, '회당 1점, 최대 4점'), _count('mtDesig', '학과 MT 참여', 2, 4, '회당 2점, 최대 4점'),
        _flag('fest', '학술제 발표', 6), _flag('coding', '코딩역량인증제 Level2 이상', 5), _flag('aisw', 'AI·SW전공역량졸업인증제', 5),
      ],
    },
    free: { req: 10, items: [FREE_COMMON[0], FREE_COMMON[1], FREE_COMMON[2]] },
  },
];


/* ------------------------------------------------------------
 * 다른 학과 (PDF p.3~8). 항목 구성은 knowledge/ 문서와 동일합니다.
 * ------------------------------------------------------------ */
const _num = (id, label, max, hint) => ({ id, label, type: 'number', max, hint });
function _freeNum() { return { id: 'free', label: '비교과자율활동 점수 (맛있는SW·어학·자격증 등)', type: 'number', hint: '직접 입력한 점수' }; }
const TOPCIT_FREE = _count('topcit', 'TOPCIT 응시', 1, 99, '회당 1점');
const DEPT_ACT = _count('dept', '학과활동', 1, 99, '회당 1점');
const CODING = _flag('coding', '코딩역량인증제 Level2 이상', 5);
const AISW = _flag('aisw', 'AI·SW전공역량졸업인증제', 5);
const EN_BASIC = _c('engBasic', '전공영어기초', 5), EN_APPLY = _c('engApply', '전공영어응용', 5), STARTUP = _c('startup', '예비창업설계', 5);
const CAP_ANY = _c('capSel', '산학캡스톤디자인 또는 졸업논문프로젝트 (택1)', 5, ['산학캡스톤디자인2', '졸업논문프로젝트2', '산학캡스톤디자인', '졸업논문프로젝트', '산학캡스톤', '졸업논문']);
const CLUB = _count('club', '학과학술동아리 (학기당 3점)', 3, 99, '학기당 3점');
const CAP_A = _c('capA', '캡스톤디자인 (1과목째)', 5, ['캡스톤디자인', '캡스톤']);
const CAP_B = _c('capB', '캡스톤디자인 (2과목째)', 5, ['캡스톤디자인', '캡스톤']);
const LANG_CORE = _c('langCore', '중핵교양-국제사회언어영역 과목', 5, ['국제사회언어', '중핵교양']);

const MORE_GROUPS = [
  /* ---- 정보보호학과 ---- */
  { dept: 'infosec', years: [2016, 2021], total: 85,
    course: { req: 15, items: [_c('capSel', '캡스톤디자인3~4 택1', 5, ['캡스톤디자인3', '캡스톤디자인4', '캡스톤3', '캡스톤4']), EN_BASIC, EN_APPLY] },
    designated: { req: 20, items: [_count('dept', '학과활동', 1, 10, '회당 1점, 최대 10점'), _flag('fest', '(단과대)학술제발표', 10)] },
    free: { req: 5, items: [CLUB, TOPCIT_FREE, _freeNum()] },
    note: '2016~2021학번 중 전공영어1·2를 수강하지 못했다면 대체과목 규정이 있습니다(PDF p.3). 대체 인정은 학과에 확인하세요.' },
  { dept: 'infosec', years: [2022, 2022], total: 110,
    course: { req: 25, items: [CAP_ANY, _c('cpro', 'C프로그래밍', 5, ['C프로그래밍', '씨프로그래밍']), EN_BASIC, EN_APPLY, STARTUP] },
    designated: { req: 30, items: [_count('dept', '학과활동', 1, 10, '회당 1점, 최대 10점'), _flag('fest', '(단과대)학술제발표', 10), CODING, AISW] },
    free: { req: 10, items: [CLUB, TOPCIT_FREE, _freeNum()] } },
  { dept: 'infosec', years: [2023, 2026], total: 110,
    course: { req: 25, items: [CAP_ANY, _c('cpro', 'C프로그래밍', 5, ['C프로그래밍', '씨프로그래밍']), EN_BASIC, EN_APPLY, STARTUP] },
    designated: { req: 30, items: [_count('dept', '학과활동', 1, 10, '회당 1점, 최대 10점'), _flag('fest', '(단과대)학술제발표', 5), CODING, AISW, _count('topcitD', 'TOPCIT 응시', 1, 5, '회당 1점, 최대 5점')] },
    free: { req: 10, items: [CLUB, _freeNum()] } },

  /* ---- 의료IT공학과 ---- */
  { dept: 'medit', years: [2021, 2021], total: 80,
    course: { req: 15, items: [_c('med', '의학용어', 5), _c('pres', '프레젠테이션테크닉', 5), _c('eng', '현대응용영어', 5)] },
    designated: { req: 6, items: [_flag('mt', '학과 MT', 1), _flag('fest', '학술제 참여', 1), _flag('expo', '전공관련 국제박람회', 2), _flag('career', '진로(취업)지도관련 학내 프로그램 참여', 2)] },
    free: { req: 14, items: [_freeNum()] } },
  { dept: 'medit', years: [2022, 2023], total: 88,
    course: { req: 15, items: [_c('med', '의학용어', 5), _c('comp', '컴퓨팅적사고와문제해결', 5), _c('eng', '현대응용영어', 5)] },
    designated: { req: 13, items: [_count('mt', 'MT 참여', 1, 2, '2회까지 인정(회당 1점)'), _flag('fest', '학술제 참여', 1), CODING, _flag('aisw', 'AI·SW전공역량졸업인증제 (200점 이상)', 5)] },
    free: { req: 15, items: [_freeNum()] } },
  { dept: 'medit', years: [2024, 2026], total: 89,
    course: { req: 15, items: [_c('med', '의학용어', 5), _c('coding2', '컴퓨터코딩과문제해결', 5), _c('eng', '현대응용영어', 5)] },
    designated: { req: 14, items: [_count('mt', 'MT 참여', 1, 2, '2회까지 인정(회당 1점)'), _flag('fest', '학술제 참여', 1), CODING, _flag('aisw', 'AI·SW전공역량졸업인증제 (200점 이상)', 5), _flag('topcitLv1', 'TOPCIT 수준1 달성', 1)] },
    free: { req: 15, items: [_freeNum()] } },

  /* ---- AI·빅데이터학과 ---- */
  { dept: 'aibd', years: [2019, 2021], total: 80,
    course: { req: 5, items: [LANG_CORE] },
    designated: { req: 11, items: [_count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점'), _num('cert', '자격증/경진대회 참가·수상 점수', 6, '최대 6점')] },
    free: { req: 19, items: [_freeNum()] } },
  { dept: 'aibd', years: [2022, 2022], total: 95,
    course: { req: 10, items: [STARTUP, LANG_CORE] },
    designated: { req: 21, items: [_count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점'), _num('cert', '자격증/경진대회 참가·수상 점수', 6, '최대 6점'), CODING, AISW] },
    free: { req: 19, items: [_freeNum()] } },
  { dept: 'aibd', years: [2023, 2026], total: 95,
    course: { req: 5, items: [STARTUP] },
    designated: { req: 26, items: [_count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점'), _num('cert', '자격증/경진대회 참가·수상 점수', 6, '최대 6점'), CODING, AISW, _count('topcitD', 'TOPCIT 응시', 1, 5, '회당 1점, 최대 5점')] },
    free: { req: 19, items: [_freeNum()] } },

  /* ---- 사물인터넷학과 ---- */
  { dept: 'iot', years: [2017, 2018], total: 80,
    course: { req: 10, items: [CAP_A, CAP_B] },
    designated: { req: 10, items: [_count('prof', '지도교수상담', 1, 3, '회당 1점, 최대 3점'), _count('grad', '졸업상담', 1, 2, '회당 1점, 최대 2점'), _count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점')] },
    free: { req: 15, items: [TOPCIT_FREE, _freeNum()] },
    note: '비교과 미지정에는 토익 500↑/OPIC M1↑/토익스피킹 100↑(각 5점) 등을 점수로 직접 입력하세요.' },
  { dept: 'iot', years: [2019, 2021], total: 80,
    course: { req: 15, items: [CAP_A, CAP_B, _c('langCore', '중핵교양 국제사회언어영역 "영어" 교과목', 5, ['국제사회언어', '중핵교양'])] },
    designated: { req: 10, items: [_count('prof', '지도교수상담', 1, 3, '회당 1점, 최대 3점'), _count('grad', '졸업상담', 1, 2, '회당 1점, 최대 2점'), _count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점')] },
    free: { req: 10, items: [TOPCIT_FREE, _freeNum()] },
    note: '비교과 미지정에는 토익 500↑/OPIC M1↑/토익스피킹 100↑(각 5점) 등을 점수로 직접 입력하세요.' },
  { dept: 'iot', years: [2022, 2022], total: 80,
    course: { req: 5, items: [STARTUP] },
    designated: { req: 20, items: [_count('prof', '지도교수상담', 1, 3, '회당 1점, 최대 3점'), _count('grad', '졸업상담', 1, 2, '회당 1점, 최대 2점'), _count('dept', '학과활동', 1, 5, '회당 1점, 최대 5점'), CODING, AISW] },
    free: { req: 10, items: [TOPCIT_FREE, _freeNum()] } },
  { dept: 'iot', years: [2023, 2023], total: 81,
    course: { req: 5, items: [STARTUP] },
    designated: { req: 21, items: [_count('prof', '지도교수상담', 1, 3, '3회까지(회당 1점)'), _count('grad', '졸업상담', 1, 2, '2회까지(회당 1점)'), _count('dept', '학과활동', 1, 5, '5회까지(회당 1점)'), _count('topcitD', 'TOPCIT 응시', 1, 1, '1점'), CODING, AISW] },
    free: { req: 10, items: [_freeNum()] } },
  { dept: 'iot', years: [2024, 2024], total: 81,
    course: { req: 5, items: [STARTUP] },
    designated: { req: 18, items: [_count('prof', '지도교수상담', 1, 2, '2회까지(회당 1점)'), _count('dept', '학과활동', 1, 5, '5회까지(회당 1점)'), _count('topcitD', 'TOPCIT 응시', 1, 1, '1점'), CODING, AISW] },
    free: { req: 13, items: [_freeNum()] } },
  { dept: 'iot', years: [2025, 2026], total: 84,
    course: { req: 5, items: [STARTUP] },
    designated: { req: 21, items: [_count('career', '진로 및 취업상담', 1, 2, '2회까지(회당 1점)'), _count('dept', '학과활동', 1, 5, '5회까지(회당 1점)'), _count('topcitD', 'TOPCIT 응시', 1, 4, '회당 1점, 최대 4점'), CODING, AISW] },
    free: { req: 13, items: [_freeNum()] } },

  /* ---- 메타버스&게임학과 ---- */
  { dept: 'meta', years: [2023, 2025], total: 110,
    course: { req: 25, items: [_c('indcap', '산학캡스톤디자인', 5), _c('thesis', '졸업논문프로젝트', 5), EN_BASIC, EN_APPLY, STARTUP] },
    designated: { req: 30, items: [_count('adv', '전공상담', 1, 5, '회당 1점, 최대 5점'), _flag('fest', '(단과대)학술제발표', 10), CODING, AISW, _num('topcitScore', 'TOPCIT 인정 점수 (수준별/세부 배점 환산)', 5, '최대 5점')] },
    free: { req: 10, items: [DEPT_ACT, _freeNum()] } },
  { dept: 'meta', years: [2026, 2026], total: 110,
    course: { req: 25, items: [_c('indcap', '산학캡스톤디자인', 5), _c('thesis', '졸업논문프로젝트', 5), EN_BASIC, EN_APPLY, STARTUP] },
    designated: { req: 25, items: [_count('adv', '전공상담', 1, 5, '회당 1점, 최대 5점'), _flag('fest', '(단과대)학술제발표', 10), CODING, AISW] },
    free: { req: 15, items: [DEPT_ACT, TOPCIT_FREE, _freeNum()] } },
];
CHECKER_GROUPS.push(...MORE_GROUPS);

function findGroup(dept, year) {
  return CHECKER_GROUPS.find(g => g.dept === dept && year >= g.years[0] && year <= g.years[1]) || null;
}

const ROMAN = { 'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'ⅰ': '1', 'ⅱ': '2', 'ⅲ': '3', 'ⅳ': '4' };
function normText(s) {
  return String(s).replace(/[ⅠⅡⅢⅣⅰⅱⅲⅳ]/g, c => ROMAN[c]).toLowerCase().replace(/[^가-힣a-z0-9]/g, '');
}

/** 사용자 과목 목록을 기준표 과목에 중복 없이 매칭 (가장 긴 별칭이 우선) */
function matchCourses(userCourses, pool) {
  const matched = {}; // itemId -> 사용자가 입력한 과목명
  const unmatched = [];
  for (const raw of userCourses) {
    const n = normText(raw);
    if (!n) continue;
    let best = null, bestLen = 0;
    for (const it of pool) {
      if (matched[it.id]) continue;
      for (const a of it.alias) {
        const an = normText(a);
        if (an && n.includes(an) && an.length > bestLen) { best = it; bestLen = an.length; }
      }
    }
    if (best) matched[best.id] = raw; else unmatched.push(raw);
  }
  return { matched, unmatched };
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

/**
 * state: { commonDone: {라벨: true}, courses: string[], act: {id: number|boolean} }
 */
function evaluate(dept, year, state) {
  const g = findGroup(dept, year);
  if (!g) return { error: '이 학과·학번은 자동 판정을 지원하지 않습니다. 챗봇에서 기준을 확인해 주세요.' };

  const cats = [];
  const warnings = [];
  if (year < 2019) warnings.push('2016~2018학번의 대학공통 표가 PDF에 없어 2019~2022학번 기준(45점)을 적용했습니다.');
  if (g.note) warnings.push(g.note);

  // 1) 대학공통
  const commonItems = COMMON_TABLE[commonKeyFor(year)];
  const cLines = commonItems.map(([label, pts]) => {
    const ok = !!(state.commonDone && state.commonDone[label]);
    return { label, earned: ok ? pts : 0, max: pts, ok, hint: ok ? '' : '미이수' };
  });
  cats.push({ name: '대학공통 필수', required: 45, lines: cLines });

  // 2) 교과
  const pool = [...g.course.items];
  if (g.course.special) pool.push(...g.course.special.main, ...g.course.special.subs);
  const { matched, unmatched } = matchCourses(state.courses || [], pool);
  const courseLines = g.course.items.map(it => {
    const ok = !!matched[it.id];
    return { label: it.label, earned: ok ? it.pts : 0, max: it.pts, ok, hint: ok ? `← ${matched[it.id]}` : '미이수' };
  });
  if (g.course.special) {
    const sp = g.course.special;
    const mainHit = sp.main.filter(i => matched[i.id]);
    const subHit = sp.subs.filter(i => matched[i.id]);
    const slots = Math.min(sp.slots, mainHit.length + subHit.length);
    const earned = slots * sp.per;
    const parts = [...mainHit, ...subHit].slice(0, slots).map(i => i.label);
    courseLines.push({
      label: sp.label, earned, max: sp.slots * sp.per, ok: slots === sp.slots,
      hint: parts.length ? `인정: ${parts.join(', ')}` : '미이수 (대체: 전공영어기초·응용·예비창업설계)',
    });
  }
  cats.push({ name: '교과', required: g.course.req, lines: courseLines });

  // 3) 비교과 지정 / 4) 비교과 미지정
  const act = state.act || {};
  const actLine = (it) => {
    if (it.type === 'flag') {
      const ok = !!act[it.id];
      return { label: it.label, earned: ok ? it.pts : 0, max: it.pts, ok, hint: ok ? '' : '미참여' };
    }
    if (it.type === 'number') {
      const raw = Math.max(0, Number(act[it.id]) || 0);
      const v = it.max != null ? Math.min(raw, it.max) : raw;
      return { label: it.label, earned: v, max: it.max != null ? it.max : null, ok: it.max != null ? v >= it.max : v > 0, hint: it.hint };
    }
    const cnt = Math.max(0, Math.floor(Number(act[it.id]) || 0));
    const cap = it.max >= 99 ? null : it.max;
    const val = cap === null ? cnt * it.per : Math.min(cnt * it.per, cap);
    return { label: `${it.label} (${cnt}회)`, earned: val, max: cap, ok: cap !== null ? val >= cap : val > 0, hint: it.hint };
  };
  cats.push({ name: '비교과 지정', required: g.designated.req, lines: g.designated.items.map(actLine) });
  cats.push({ name: '비교과 미지정', required: g.free.req, lines: g.free.items.map(actLine) });

  let total = 0, allOk = true;
  for (const c of cats) {
    const sum = c.lines.reduce((a, l) => a + l.earned, 0);
    c.earned = Math.min(sum, c.required); // 구간별 반영 상한 = 해당 구간 요구 점수
    c.raw = sum;
    c.ok = c.earned >= c.required;
    total += c.earned;
    allOk = allOk && c.ok;
  }
  return {
    group: g, cats, total, target: g.total, ok: total >= g.total && allOk,
    remaining: Math.max(0, g.total - total), unmatched, warnings,
  };
}

if (typeof module !== 'undefined') module.exports = { normText, evaluate, findGroup, CHECKER_GROUPS, COMMON_TABLE, matchCourses };
