// スコア定義と計算のテスト（node tests/scores.test.js）
'use strict';
const assert = require('assert');
const A = require('../scores.js');

let n = 0;
function t(name, fn) { fn(); n++; console.log('ok  ' + name); }
const S = id => A.byId(id);
const run = (id, state) => A.compute(S(id), state);

// 原著の配点表をそのまま書き写したもの（定義の転記ミスを見つけるため）
// キーは原著の項目、値は [入力欄id, 点数（choice は選択肢ごとの配列）]
const PAPER = {
  ichinose: { max: 6, cutoff: 3, items: { // Ichinose 2022 抄録・Fig 3
    'HCO3<20': ['hco3', 1], 'Cl<100': ['cl', 1], 'Cr≥0.35': ['cr', 1], '血糖≥200': ['glu', 1], 'PCT≥1.7': ['pct', 2] } },
  nagase: { max: 3, cutoff: 1, items: { // Nagase 2013 Table 4
    'RSE': ['rse', 1], '6h意識障害/片麻痺': ['loc6', [0, 1]], 'AST>90': ['ast90', 1] } },
  yokochi: { max: 10, cutoff: 4, items: { // Yokochi 2016 Table 4
    'pH<7.014': ['ph', 1], 'ALT≥28': ['alt', 2], '血糖≥228': ['glu', 2], '覚醒≥11h': ['wake', [0, 2]], 'Cr≥0.3': ['cr', 1], 'NH3≥125': ['nh3', 2] } },
  tada: { max: 9, cutoff: 4, items: { // Tada 2015 Table 4
    '意識': ['loc12', [0, 2, 3]], '1.5歳未満': ['age', 1], 'けいれん>40分': ['dur', 1], '人工呼吸': ['mv', 1],
    'AST>40': ['ast40', 1], '血糖>200': ['glu', 1], 'Cr>0.35': ['cr', 1] } }
};

t('4つのスコアがそろっている（判定に使える時期の早い順）', () => {
  assert.deepStrictEqual(A.SCORES.map(d => d.id), ['ichinose', 'nagase', 'yokochi', 'tada']);
});

t('配点・満点・カットオフが原著と一致', () => {
  for (const d of A.SCORES) {
    const p = PAPER[d.id];
    assert.strictEqual(d.max, p.max, d.id + ' max');
    assert.strictEqual(d.cutoff, p.cutoff, d.id + ' cutoff');
    const items = A.itemsOf(d.id);
    const got = items.map(it => [it.field, it.choice ? it.pts : it.pt]).sort();
    const want = Object.values(p.items).sort();
    assert.deepStrictEqual(got, want, d.id);
    assert.strictEqual(items.reduce((s, it) => s + it.pt, 0), d.max, d.id + ' 満点＝各項目の最大点の合計');
  }
});

t('入力欄の id が重複していない', () => {
  const ids = A.FIELDS.map(f => f.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

t('閾値の表記が原著と一致（不等号の向きを含む）', () => {
  const lab = Object.fromEntries(A.FIELDS.filter(f => f.type === 'check').map(f => [f.id, f.label]));
  assert.deepStrictEqual(lab, {
    age: '年齢 1.5歳未満', dur: 'けいれん持続 > 40分', rse: '難治性けいれん重積', mv: '人工呼吸（気管挿管）',
    ph: 'pH < 7.014', hco3: 'HCO₃⁻ < 20 mmol/L', cl: 'Cl < 100 mEq/L',
    ast40: 'AST > 40 IU/L', alt: 'ALT ≥ 28 IU/L', nh3: 'NH₃ ≥ 125 μg/dL', pct: 'プロカルシトニン ≥ 1.7 ng/mL',
    ast90: '発症6時間以内の AST > 90 IU/L'
  });
  const lv = id => A.FIELDS.find(f => f.id === id).levels.map(l => l.th + ' ' + l.score);
  assert.deepStrictEqual(lv('cr'), ['≥ 0.30 yokochi', '≥ 0.35 ichinose', '> 0.35 tada']);
  assert.deepStrictEqual(lv('glu'), ['≥ 200 ichinose', '> 200 tada', '≥ 228 yokochi']);
  assert.ok(/GCS ≤ 14/.test(A.FIELDS.find(f => f.id === 'loc6').label));
});

t('Cr の段：選んだ段とそれより低い段がすべて該当', () => {
  const pts = lv => ['yokochi', 'ichinose', 'tada'].map(id => run(id, { cr: lv }).total);
  assert.deepStrictEqual(pts(0), [0, 0, 0]);
  assert.deepStrictEqual(pts(1), [1, 0, 0]);   // 0.30〜0.34
  assert.deepStrictEqual(pts(2), [1, 1, 0]);   // 0.35 ちょうど
  assert.deepStrictEqual(pts(3), [1, 1, 1]);   // 0.35 超
});

t('血糖の段：200ちょうど／200超〜227／228以上', () => {
  const pts = lv => ['ichinose', 'tada', 'yokochi'].map(id => run(id, { glu: lv }).total);
  assert.deepStrictEqual(pts(1), [1, 0, 0]);
  assert.deepStrictEqual(pts(2), [1, 1, 0]);
  assert.deepStrictEqual(pts(3), [1, 1, 2]);
});

t('ほかのスコアの項目は数えない', () => {
  const st = { age: true, dur: true, mv: true, ast40: true, pct: true, ph: true, rse: true };
  assert.strictEqual(run('ichinose', st).total, 2);  // PCT のみ
  assert.strictEqual(run('yokochi', st).total, 1);   // pH のみ
  assert.strictEqual(run('nagase', st).total, 1);    // RSE のみ
  assert.strictEqual(run('tada', st).total, 4);
});

t('何も入力しなければ未入力扱い・コピーは空', () => {
  assert.strictEqual(A.started({}), false);
  assert.strictEqual(A.summaryText({}), '');
  assert.strictEqual(A.started({ age: false, cr: 0 }), false);
  assert.strictEqual(A.started({ loc6: 0 }), true);  // 「なし」を選んだのは入力あり
});

t('全項目を最大にすると満点・カットオフ以上', () => {
  const st = {};
  for (const f of A.FIELDS) st[f.id] = f.type === 'check' ? true : f.type === 'level' ? f.levels.length : f.options.length - 1;
  for (const d of A.SCORES) {
    const r = A.compute(d, st);
    assert.strictEqual(r.total, d.max, d.id);
    assert.strictEqual(r.status, 'pos', d.id);
  }
});

t('Ichinose：PCT（2点）＋Cr 0.35（1点）＝3点でちょうどカットオフ', () => {
  assert.strictEqual(run('ichinose', { pct: true }).status, 'neg');
  const r = run('ichinose', { pct: true, cr: 2 });
  assert.strictEqual(r.total, 3);
  assert.strictEqual(r.status, 'pos');
});

t('Nagase：時点の評価がなければ保留、1項目でも該当すれば SFS', () => {
  assert.strictEqual(run('nagase', {}).status, 'pending');
  assert.deepStrictEqual(run('nagase', {}).pending, ['6時間時点の意識・片麻痺']);
  assert.strictEqual(run('nagase', { loc6: 0 }).status, 'neg');
  assert.strictEqual(run('nagase', { rse: true }).status, 'pos');
  assert.strictEqual(run('nagase', { loc6: 1 }).status, 'pos');
  assert.strictEqual(run('nagase', { loc6: 0, ast90: true }).status, 'pos');
  assert.ok(/SFS/.test(A.judge(S('nagase'), run('nagase', { rse: true })).main));
});

t('Yokochi：覚醒時間しだいで4点に届くときだけ保留', () => {
  assert.strictEqual(run('yokochi', { ph: true }).status, 'neg');                 // 1＋最大2＝3
  assert.strictEqual(run('yokochi', { alt: true }).status, 'pending');            // 2＋最大2＝4
  assert.strictEqual(run('yokochi', { alt: true, wake: 0 }).status, 'neg');
  assert.strictEqual(run('yokochi', { alt: true, wake: 1 }).status, 'pos');
  assert.strictEqual(run('yokochi', { alt: true, cr: 1, ph: true }).status, 'pos'); // 覚醒なしで4点
});

t('Tada：意識レベルしだいで4点に届くときだけ保留', () => {
  assert.strictEqual(run('tada', {}).status, 'neg');                             // 0＋最大3＝3
  const r = run('tada', { age: true });
  assert.strictEqual(r.status, 'pending');
  assert.deepStrictEqual(r.pending, ['12〜24時間の意識レベル']);
  assert.strictEqual(A.judge(S('tada'), r).cls, 'pending');
  assert.strictEqual(run('tada', { age: true, loc12: 0 }).status, 'neg');
  assert.strictEqual(run('tada', { age: true, loc12: 2 }).total, 4);
  assert.strictEqual(run('tada', { age: true, dur: true, mv: true, ast40: true }).status, 'pos');
});

t('0点の選択肢を選んだときも記録に残る', () => {
  const r = run('tada', { loc12: 0 });
  assert.deepStrictEqual(r.hits.map(h => h.abbr), ['意識GCS15']);
  assert.strictEqual(r.pending.length, 0);
});

t('判定の短い表記', () => {
  assert.strictEqual(A.judge(S('ichinose'), run('ichinose', { pct: true, cr: 3 })).chip, '高リスク');
  assert.strictEqual(A.judge(S('ichinose'), run('ichinose', {})).chip, '3点未満');
  assert.strictEqual(A.judge(S('nagase'), run('nagase', { loc6: 0 })).chip, '該当なし');
  assert.strictEqual(A.judge(S('tada'), run('tada', { age: true })).chip, '判定保留');
});

t('カルテ用コピー：4スコアを1行ずつ', () => {
  const st = { cr: 3, pct: true, alt: true, age: true, loc6: 0 };
  assert.strictEqual(A.summaryText(st, new Date(2026, 9, 21, 9, 5)), [
    'AESD予測スコア（2026/10/21 09:05）',
    '・Ichinose 3/6点：3点以上［Cr≥0.35、PCT≥1.7］',
    '・Nagase 0/3項目：該当なし［6h意識障害/片麻痺なし］',
    '・Yokochi 3/10点：判定保留（覚醒までの時間 未評価）［Cr≥0.3、ALT≥28］',
    '・Tada 2/9点：判定保留（12〜24時間の意識レベル 未評価）［1.5歳未満、Cr>0.35］'
  ].join('\n'));
});

console.log('\n' + n + ' tests passed');
