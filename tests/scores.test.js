// スコア定義と計算のテスト（node tests/scores.test.js）
'use strict';
const assert = require('assert');
const A = require('../scores.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }

// 原著の配点表をそのまま書き写したもの（定義の転記ミスを見つけるため）
const PAPER = {
  ichinose: { max: 6, cutoff: 3, pts: { hco3: 1, cl: 1, cr: 1, glu: 1, pct: 2 } },             // Ichinose 2022 抄録・Fig 3
  nagase: { max: 3, cutoff: 1, pts: { rse: 1, loc: 1, ast: 1 } },                              // Nagase 2013 Table 4
  yokochi: { max: 10, cutoff: 4, pts: { ph: 1, alt: 2, glu: 2, wake: 2, cr: 1, nh3: 2 } },      // Yokochi 2016 Table 4
  tada: { max: 9, cutoff: 4, pts: { loc: [0, 2, 3], age: 1, dur: 1, mv: 1, ast: 1, glu: 1, cr: 1 } } // Tada 2015 Table 4
};

t('4つのスコアがそろっている（タブは判定できる時期の早い順）', () => {
  assert.deepStrictEqual(A.SCORES.map(d => d.id), ['ichinose', 'nagase', 'yokochi', 'tada']);
});

t('配点・満点・カットオフが原著と一致', () => {
  for (const d of A.SCORES) {
    const p = PAPER[d.id];
    assert.strictEqual(d.max, p.max, d.id + ' max');
    assert.strictEqual(d.cutoff, p.cutoff, d.id + ' cutoff');
    assert.deepStrictEqual(d.items.map(it => it.id).sort(), Object.keys(p.pts).sort(), d.id + ' items');
    for (const it of d.items) {
      const got = it.type === 'choice' ? it.options.map(o => o.pt) : it.pt;
      assert.deepStrictEqual(got, p.pts[it.id], d.id + '.' + it.id);
    }
    const sum = d.items.reduce((s, it) => s + A.itemMax(it), 0);
    assert.strictEqual(sum, d.max, d.id + ' 満点＝各項目の最大点の合計');
  }
});

t('閾値の表記が原著と一致（不等号の向きを含む）', () => {
  const lab = id => Object.fromEntries(A.byId(id).items.filter(it => it.type === 'check').map(it => [it.id, it.label]));
  assert.deepStrictEqual(lab('ichinose'), {
    hco3: 'HCO₃⁻ < 20 mmol/L', cl: 'Cl < 100 mEq/L', cr: 'Cr ≥ 0.35 mg/dL', glu: '血糖 ≥ 200 mg/dL', pct: 'プロカルシトニン ≥ 1.7 ng/mL'
  });
  assert.deepStrictEqual(lab('yokochi'), {
    ph: 'pH < 7.014', alt: 'ALT ≥ 28 IU/L', glu: '血糖 ≥ 228 mg/dL', wake: '覚醒までの時間 ≥ 11時間', cr: 'Cr ≥ 0.3 mg/dL', nh3: 'NH₃ ≥ 125 μg/dL'
  });
  assert.deepStrictEqual(lab('tada'), {
    age: '年齢 1.5歳未満', dur: 'けいれん持続 > 40分', mv: '人工呼吸（気管挿管）', ast: 'AST > 40 IU/L', glu: '血糖 > 200 mg/dL', cr: 'Cr > 0.35 mg/dL'
  });
  assert.ok(/AST > 90 IU\/L/.test(A.byId('nagase').items.find(it => it.id === 'ast').label));
  assert.ok(/GCS ≤ 14/.test(A.byId('nagase').items.find(it => it.id === 'loc').label));
});

t('何もチェックしなければ0点・カットオフ未満', () => {
  for (const d of A.SCORES) {
    const r = A.compute(d, {});
    assert.strictEqual(r.total, 0);
    assert.strictEqual(r.status, 'neg', d.id);
  }
});

t('全項目チェックで満点・カットオフ以上', () => {
  for (const d of A.SCORES) {
    const s = {};
    for (const it of d.items) s[it.id] = it.type === 'choice' ? it.options.length - 1 : true;
    const r = A.compute(d, s);
    assert.strictEqual(r.total, d.max, d.id);
    assert.strictEqual(r.status, 'pos', d.id);
  }
});

t('Ichinose：PCT（2点）＋Cr（1点）＝3点でちょうどカットオフ', () => {
  const d = A.byId('ichinose');
  assert.strictEqual(A.compute(d, { pct: true }).status, 'neg');
  const r = A.compute(d, { pct: true, cr: true });
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.status, 'pos');
});

t('Yokochi：ALT（2点）＋Cr（1点）＝3点は未満、pH を足して4点で以上', () => {
  const d = A.byId('yokochi');
  assert.strictEqual(A.compute(d, { alt: true, cr: true }).status, 'neg');
  assert.strictEqual(A.compute(d, { alt: true, cr: true, ph: true }).status, 'pos');
});

t('Nagase：1項目でも該当すれば SFS', () => {
  const d = A.byId('nagase');
  for (const id of ['rse', 'loc', 'ast']) {
    const r = A.compute(d, { [id]: true });
    assert.strictEqual(r.total, 1);
    assert.strictEqual(r.status, 'pos');
    assert.ok(/SFS/.test(A.judge(d, r).main));
  }
});

t('Tada：意識レベル未入力でも、ほかの項目で4点以上なら判定できる', () => {
  const d = A.byId('tada');
  const r = A.compute(d, { age: true, dur: true, mv: true, ast: true });
  assert.strictEqual(r.total, 4);
  assert.strictEqual(r.status, 'pos');
});

t('Tada：意識レベル次第で4点に届くときは判定保留', () => {
  const d = A.byId('tada');
  const r = A.compute(d, { age: true });                 // 1点＋意識（最大3点）＝最大4点
  assert.strictEqual(r.status, 'pending');
  assert.deepStrictEqual(r.unanswered, ['loc']);
  assert.strictEqual(A.judge(d, r).cls, 'pending');
});

t('Tada：意識レベルを選んでも届かなければ未満（意識未入力でも最大3点なら未満）', () => {
  const d = A.byId('tada');
  assert.strictEqual(A.compute(d, {}).status, 'neg');    // 0点＋最大3点＝3点
  assert.strictEqual(A.compute(d, { loc: 0, age: true, cr: true }).status, 'neg');
  const r = A.compute(d, { loc: 1, age: true, cr: true }); // 2＋1＋1
  assert.strictEqual(r.total, 4);
  assert.strictEqual(r.status, 'pos');
});

t('Tada：GCS 15（0点）を選んだときも記録に残る', () => {
  const r = A.compute(A.byId('tada'), { loc: 0 });
  assert.deepStrictEqual(r.hits.map(h => h.abbr), ['意識GCS15']);
  assert.strictEqual(r.unanswered.length, 0);
});

t('false や未定義の項目は数えない', () => {
  const r = A.compute(A.byId('ichinose'), { hco3: false, cl: undefined, cr: true });
  assert.strictEqual(r.total, 1);
});

t('カルテ用コピー：入力したスコアだけを書き出す', () => {
  const states = { ichinose: { cr: true, pct: true }, nagase: {}, yokochi: { alt: true }, tada: { age: true } };
  const touched = { ichinose: true, yokochi: true, tada: true };
  const text = A.summaryText(states, touched, new Date(2026, 9, 21, 9, 5));
  assert.strictEqual(text, [
    'AESD予測スコア（2026/10/21 09:05）',
    '・Ichinose 3/6点：3点以上［Cr≥0.35、PCT≥1.7］',
    '・Yokochi 2/10点：4点未満［ALT≥28］',
    '・Tada 1/9点：判定保留（意識レベル未入力）［1.5歳未満］'
  ].join('\n'));
});

t('カルテ用コピー：Nagase の表記と、入力なしなら空文字', () => {
  const states = { nagase: { ast: true } };
  assert.strictEqual(A.summaryText(states, { nagase: true }, new Date(2026, 0, 2, 13, 0)),
    'AESD予測スコア（2026/01/02 13:00）\n・Nagase 1/3項目：1項目以上（SFS該当）［AST>90］');
  assert.strictEqual(A.summaryText({}, {}), '');
});

console.log('\n' + n + ' tests passed');
