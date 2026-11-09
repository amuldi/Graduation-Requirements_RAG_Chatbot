// 사용법: node tests/run_tests.js   (먼저 python3 build.py 로 index.html 을 만들어 둘 것)
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..') + '/';
const kb = JSON.parse(fs.readFileSync(R + 'index.html', 'utf8').match(/const KB = (.*);<\/script>/)[1].replace(/<\\\//g, '</'));
const { Retriever } = require(R + 'src/engine.js');
const ck = require(R + 'src/checker.js');
const r = new Retriever(kb);
let pass = 0, total = 0;
const check = (name, ok, detail = '') => { total++; pass += ok; console.log((ok ? 'OK   ' : 'FAIL ') + name + (ok ? '' : '  → ' + detail)); };

// [질문, 프로필(학과+학번), 기대 chunk 제목에 포함될 문구 | null(=답 없음이 정답)]
const QA = [
  ['2022학번 컴퓨터소프트웨어공학과 졸업 총점은?', 'cse2022', '컴퓨터소프트웨어공학과 2022~2024'],
  ['컴소공 25학번 학과 MT 몇 점?', 'cse2022', '2025~2026'],
  ['정보보호학과 2023학번 필요 점수', 'cse2022', '정보보호학과 2023~2026'],
  ['정보보호학과 2022학번 졸업 총점', 'cse2022', '정보보호학과 2022학번'],
  ['의료IT공학과 졸업요건 알려줘 2022', 'cse2022', '의료IT공학과 2022~2023'],
  ['AI·빅데이터학과 2024학번 졸업요건', 'cse2022', 'AI·빅데이터학과 2023~2026'],
  ['AI빅데이터학과 자격증 뭐 인정돼?', 'cse2022', 'AI·빅데이터학과'],
  ['사물인터넷 25학번 TOPCIT 몇 점', 'cse2022', '사물인터넷학과 2025'],
  ['IoT학과 2024 정보처리기사', 'cse2022', '사물인터넷학과 2024'],
  ['메타버스 TOPCIT 수준별 점수', 'cse2022', 'TOPCIT 수준별'],
  ['메타버스게임학과 2026학번 비교과 미지정', 'cse2022', '메타버스&게임학과 2026'],
  ['대학공통 24학번 학습윤리', 'cse2022', '2024~2026'],
  ['대학공통 필수 2023학번', 'cse2022', '(2023학번)'],
  ['비교과 신청 어디서', 'cse2022', '비교과 신청'],
  ['이수내역 확인 방법', 'cse2022', '비교과 신청'],
  ['상담 어디로 가요', 'cse2022', '문의처'],
  ['비교과센터 위치', 'cse2022', '문의처'],
  ['22학번 코딩역량인증제 점수', 'cse2022', '컴퓨터소프트웨어공학과 2022~2024'],
  ['전공영어 대체과목', 'cse2016', '컴퓨터소프트웨어공학과 2016~2020'],
  ['학식 메뉴 뭐야', 'cse2022', null],
  ['장학금 신청 기간', 'cse2022', null],
  ['기숙사 입사 신청', 'cse2022', null],
  ['수강신청 언제야', 'cse2022', null],
];
for (const [q, p, exp] of QA) {
  const prof = { dept: p.slice(0, -4), year: +p.slice(-4) };
  const x = r.search(q, prof);
  const t = x.confident && x.results[0] ? x.results[0].chunk.title : null;
  check(`질문: ${q}`, exp === null ? t === null : !!(t && t.includes(exp)), `got=${t} cov=${x.coverage?.toFixed(2)} (기대:${exp})`);
}
// 학번 없이 다른 학과를 물으면 학번 안내(needYear)가 켜져야 함
check('학번 없는 질문 → needYear', r.search('AI빅데이터학과 자격증 뭐 인정돼?', { dept: 'cse', year: 2022 }).needYear === true);

// ---- 판정 로직 ----
const all = y => Object.fromEntries(ck.COMMON_TABLE[y].map(a => [a[0], true]));
let e = ck.evaluate('cse', 2025, { commonDone: all('2024-2026'), courses: ['캡스톤디자인', '산학캡스톤디자인', '전공영어기초', '전공영어응용', '예비창업설계'], act: { adv: 9, mtDesig: 2, fest: true, coding: true, aisw: true, topcit: 10, free: 5 } });
check('2025 만점 시나리오 104/104 충족', e.total === 104 && e.ok, `total=${e.total}`);
e = ck.evaluate('cse', 2022, { commonDone: all('2019-2022'), courses: ['캡스톤디자인', '산학캡스톤디자인', '전공영어기초', '전공영어응용'], act: { adv: 4, fest: true, coding: true, topcit: 2 } });
check('2022 부분 이수 86/104, 미충족', e.total === 86 && !e.ok && e.remaining === 18, `total=${e.total}`);
check('캡스톤 vs 산학캡스톤 구분', ck.evaluate('cse', 2022, { courses: ['산학캡스톤디자인'], act: {} }).cats[1].lines.filter(l => l.ok).map(l => l.label).join() === '산학캡스톤디자인');
e = ck.evaluate('cse', 2020, { commonDone: {}, courses: ['캡스톤디자인 1', '캡스톤디자인Ⅱ', '전공영어3', '전공영어4'], act: {} });
check('2020 로마숫자(Ⅱ)·띄어쓰기 인식', e.unmatched.length === 0 && e.cats[1].earned === 20, `earned=${e.cats[1].earned} unmatched=${e.unmatched}`);
e = ck.evaluate('cse', 2019, { commonDone: {}, courses: ['전공영어1', '전공영어기초', '예비창업설계'], act: {} });
check('전공영어 택3 + 대체과목 인정', e.cats[1].lines.at(-1).earned === 15);
e = ck.evaluate('cse', 2019, { commonDone: {}, courses: ['전공영어1', '전공영어2', '전공영어3', '전공영어4', '전공영어기초'], act: {} });
check('전공영어 상한 15점(택3)', e.cats[1].lines.at(-1).earned === 15);
check('기준표 없는 학번 → 오류 반환', !!ck.evaluate('iot', 2016, {}).error && !!ck.evaluate('cse', 2027, {}).error);
// 모든 학과·그룹: 전부 이수 시 목표 점수 달성, 아무것도 안 하면 대학공통 외 0점
for (const g of ck.CHECKER_GROUPS) {
  const label = `${g.dept} ${g.years.join('~')}`;
  const y = g.years[0];
  const key = y >= 2024 ? '2024-2026' : y === 2023 ? '2023-2023' : '2019-2022';
  const courses = [], act = {};
  for (const it of g.course.items) courses.push(it.alias[0]);
  if (g.course.special) for (const it of [...g.course.special.main]) courses.push(it.alias[0]);
  for (const it of [...g.designated.items, ...g.free.items]) act[it.id] = it.type === 'flag' ? true : 99;
  const full = ck.evaluate(g.dept, y, { commonDone: all(key), courses, act });
  check(`[${label}] 만점 = ${g.total}점`, full.total === g.total && full.ok, `total=${full.total}/${g.total} ${full.cats.map(c => c.name + c.earned + '/' + c.required)}`);
  const sumReq = 45 + g.course.req + g.designated.req + g.free.req;
  check(`[${label}] 구간합 = 총점(${g.total})`, sumReq === g.total, `구간합=${sumReq}`);
  const none = ck.evaluate(g.dept, y, { commonDone: {}, courses: [], act: {} });
  check(`[${label}] 미입력 = 0점`, none.total === 0 && !none.ok);
}
check('비교과 상한 적용(전공상담 9회 → 4점)', ck.evaluate('cse', 2022, { courses: [], act: { adv: 9 } }).cats[2].lines[0].earned === 4);
console.log(`\n${pass}/${total} 통과`);
process.exit(pass === total ? 0 : 1);
