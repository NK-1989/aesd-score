// AESD 早期予測スコアの定義と計算（ブラウザでも node でも読み込める）
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AESD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 項目の種類
  //   check  : 該当すれば pt 点
  //   choice : 選んだ選択肢の pt 点（未選択なら判定保留になりうる）
  // label は画面表示用、abbr はカルテ用コピーの短い表記
  const SCORES = [
    {
      id: 'ichinose',
      name: 'Ichinose スコア',
      short: 'Ichinose',
      year: 2022,
      when: '初回採血',
      whenLong: '初診時の血液検査の値で判定する',
      scope: '6歳未満・40分以上続いた有熱性けいれん重積',
      predicts: 'AESD',
      unit: '点',
      max: 6,
      cutoff: 3,
      perf: '3点以上で AESD を予測（感度 84.2%・特異度 81.0%）',
      perfShort: '感度 84.2%・特異度 81.0%',
      items: [
        { id: 'hco3', type: 'check', label: 'HCO₃⁻ < 20 mmol/L', abbr: 'HCO3<20', pt: 1 },
        { id: 'cl', type: 'check', label: 'Cl < 100 mEq/L', abbr: 'Cl<100', pt: 1 },
        { id: 'cr', type: 'check', label: 'Cr ≥ 0.35 mg/dL', abbr: 'Cr≥0.35', pt: 1 },
        { id: 'glu', type: 'check', label: '血糖 ≥ 200 mg/dL', abbr: '血糖≥200', pt: 1 },
        { id: 'pct', type: 'check', label: 'プロカルシトニン ≥ 1.7 ng/mL', abbr: 'PCT≥1.7', pt: 2 }
      ],
      notes: [
        '対象は6歳未満で40分以上続いた有熱性けいれん重積。全国アンケートによる後方視研究（AESD 93例・遷延性熱性けいれん 455例）。',
        '検査値はすべて初診時の値。',
        '3点以上で AESD を予測する（感度 84.2%・特異度 81.0%）。',
        'PCT の単位は、抄録と Table 1 では pg/mL、Table 3 と一ノ瀬ら（2025）の解説では ng/mL と書かれている。ここでは ng/mL で表示している。',
        'PCT を測っていたのは AESD 21例・遷延性熱性けいれん 131例だけ。未測定の項目は0点として数えるため、スコアは低めに出る。',
        '初回けいれんが40分未満の AESD は解析に含まれていない。'
      ],
      cite: 'Ichinose F, Nakamura T, Kira R, et al. Incidence and risk factors of acute encephalopathy with biphasic seizures in febrile status epilepticus. Brain Dev. 2022;44(1):36-43.',
      pmid: '34362595'
    },
    {
      id: 'nagase',
      name: 'Nagase 基準',
      short: 'Nagase',
      year: 2013,
      when: '6時間以内',
      whenLong: '発症から6時間以内の所見で判定する',
      scope: '複雑型熱性けいれんで PICU に入院した小児',
      predicts: '神経学的予後不良（退院時 PCPC 2〜6）',
      unit: '項目',
      max: 3,
      cutoff: 1,
      perf: '1項目以上で神経学的予後不良を予測（感度 94.1%・特異度 69.6%）',
      items: [
        { id: 'rse', type: 'check', label: '難治性けいれん重積', note: '60分を超え、ジアゼパムなどの第一選択薬が効かない', abbr: 'RSE', pt: 1 },
        { id: 'loc', type: 'check', label: '発症6時間の時点で 意識障害（GCS ≤ 14）または片麻痺', note: '抗けいれん薬の持続投与中は評価しない', abbr: '6h時点の意識障害/片麻痺', pt: 1 },
        { id: 'ast', type: 'check', label: '発症6時間以内の AST > 90 IU/L', note: '複数回採血したときは最も高い値', abbr: 'AST>90', pt: 1 }
      ],
      notes: [
        '対象は複雑型熱性けいれんで PICU に入院した86例（4〜159か月）。単施設の後方視研究。',
        '予測するのは AESD ではなく、退院時の神経学的予後不良（PCPC 2〜6）。予後不良17例のうち11例は有熱性けいれん重積型の急性脳症（AEFCSE）だった。',
        '発症時刻は、38℃を超える発熱とともに、けいれんまたは意識変容が最初に観察された時刻。',
        '難治性けいれん重積は、60分を超えるけいれん性てんかん重積で、ジアゼパムなどの第一選択薬が効かないもの。',
        '意識障害・片麻痺は、抗けいれん薬の持続投与中は評価しない。片麻痺は、意識障害のない患者で徒手筋力テストの左右差により判定する。',
        '1項目以上で感度 94.1%・特異度 69.6%（Table 4）。抄録では特異度 67% と書かれている。',
        '一ノ瀬ら（2025）は「重症熱性けいれん基準（Nagase 基準）」として紹介し、全身モニタリングや集中治療を選ぶ目安として有用としている。'
      ],
      cite: 'Nagase H, Nakagawa T, Aoki K, et al. Therapeutic indicators of acute encephalopathy in patients with complex febrile seizures. Pediatr Int. 2013;55(3):310-314.',
      pmid: '23279186'
    },
    {
      id: 'yokochi',
      name: 'Yokochi スコア',
      short: 'Yokochi',
      year: 2016,
      when: '採血＋覚醒',
      whenLong: '来院時の血液検査と、覚醒までの時間で判定する',
      scope: '16歳未満・30分を超えた有熱性けいれん重積',
      predicts: 'AESD',
      unit: '点',
      max: 10,
      cutoff: 4,
      perf: '4点以上で AESD を予測（感度 93%・特異度 91%、陽性的中率 47%）',
      perfShort: '感度 93%・特異度 91%・陽性的中率 47%',
      items: [
        { id: 'ph', type: 'check', label: 'pH < 7.014', note: '来院時', abbr: 'pH<7.014', pt: 1 },
        { id: 'alt', type: 'check', label: 'ALT ≥ 28 IU/L', note: '来院時', abbr: 'ALT≥28', pt: 2 },
        { id: 'glu', type: 'check', label: '血糖 ≥ 228 mg/dL', note: '来院時', abbr: '血糖≥228', pt: 2 },
        { id: 'wake', type: 'check', label: '覚醒までの時間 ≥ 11時間', note: '最後の抗けいれん薬投与から GCS > 14 になるまで', abbr: '覚醒≥11h', pt: 2 },
        { id: 'cr', type: 'check', label: 'Cr ≥ 0.3 mg/dL', note: '来院時', abbr: 'Cr≥0.3', pt: 1 },
        { id: 'nh3', type: 'check', label: 'NH₃ ≥ 125 μg/dL', note: '来院時', abbr: 'NH3≥125', pt: 2 }
      ],
      notes: [
        '対象は16歳未満で30分を超えて続いた有熱性けいれん重積。単施設の後方視研究（213例中 AESD 19例）。',
        '検査値は来院時（抗けいれん薬を投与するために静脈路を確保したとき）の値。',
        '覚醒までの時間は、最後の抗けいれん薬投与から GCS > 14 になるまで（30分単位で切り捨て）。原著では短時間作用型の薬（ジアゼパム・ミダゾラム・チアミラール）だけを使っており、長時間作用型の薬を使ったときは解釈に注意するよう述べている。',
        '4点以上で感度 93%（14/15）・特異度 91%（160/176）・陽性的中率 47%（14/30）。いずれも欠測のない191例で算出した値。',
        'AESD 以外の急性脳症・脳炎8例に当てはめたときの感度は 62%（5/8）。'
      ],
      cite: 'Yokochi T, Takeuchi T, Mukai J, et al. Prediction of acute encephalopathy with biphasic seizures and late reduced diffusion in patients with febrile status epilepticus. Brain Dev. 2016;38(2):217-224.',
      pmid: '26242200'
    },
    {
      id: 'tada',
      name: 'Tada スコア',
      short: 'Tada',
      year: 2015,
      when: '12〜24時間',
      whenLong: '初回けいれんの12〜24時間後の意識レベルと、入院時の値で判定する',
      scope: '30分を超える初回けいれんのあった小児',
      predicts: 'AESD',
      unit: '点',
      max: 9,
      cutoff: 4,
      perf: '4点以上で AESD を示唆（感度 88.7%・特異度 90%）',
      perfShort: '感度 88.7%・特異度 90%',
      items: [
        {
          id: 'loc', type: 'choice', label: 'けいれん後 12〜24時間の意識レベル',
          options: [
            { label: 'GCS 15（JCS 0）', abbr: '意識GCS15', pt: 0 },
            { label: 'GCS 14〜9（JCS 1〜30）', abbr: '意識GCS9-14', pt: 2 },
            { label: 'GCS 8以下（JCS 100〜300）', abbr: '意識GCS≤8', pt: 3 }
          ]
        },
        { id: 'age', type: 'check', label: '年齢 1.5歳未満', abbr: '1.5歳未満', pt: 1 },
        { id: 'dur', type: 'check', label: 'けいれん持続 > 40分', abbr: 'けいれん>40分', pt: 1 },
        { id: 'mv', type: 'check', label: '人工呼吸（気管挿管）', abbr: '人工呼吸', pt: 1 },
        { id: 'ast', type: 'check', label: 'AST > 40 IU/L', note: '入院時', abbr: 'AST>40', pt: 1 },
        { id: 'glu', type: 'check', label: '血糖 > 200 mg/dL', note: '入院時', abbr: '血糖>200', pt: 1 },
        { id: 'cr', type: 'check', label: 'Cr > 0.35 mg/dL', note: '入院時', abbr: 'Cr>0.35', pt: 1 }
      ],
      notes: [
        '対象は30分を超える初回けいれんのあった AESD 62例と遷延性熱性けいれん 54例。多施設アンケートによる後方視研究。',
        '意識レベルは初回けいれんの12〜24時間後に評価する。AST・血糖・Cr は入院時の値。',
        '4点以上で AESD を示唆する（感度 88.7%・特異度 90%。全項目のそろった AESD 53例・遷延性熱性けいれん 49例で算出）。',
        '初回けいれんの後に意識清明（GCS 15）だった AESD 9例のうち、4点以上になったのは4例だけ。意識が清明な例では、スコアが低くても AESD を否定できない。',
        '原著の閾値の表記は "above"／"below"（超える／未満）。一ノ瀬ら（2025）の解説では「以上」「以下」と書かれており、境界値ちょうどの扱いは原著からは確定できない。',
        'AST の単位は原著では mEq/l と書かれている。ここでは IU/L で表示している。'
      ],
      cite: 'Tada H, Takanashi J, Okuno H, et al. Predictive score for early diagnosis of acute encephalopathy with biphasic seizures and late reduced diffusion (AESD). J Neurol Sci. 2015;358(1-2):62-65.',
      pmid: '26333951'
    }
  ];

  function byId(id) {
    return SCORES.find(d => d.id === id);
  }

  function itemMax(it) {
    return it.type === 'choice' ? Math.max.apply(null, it.options.map(o => o.pt)) : it.pt;
  }

  // state: { 項目id: true/false（check） または 選択肢の番号（choice） }
  // status: pos（カットオフ以上）／neg（未満）／pending（未選択の choice 次第で判定が変わる）
  function compute(def, state) {
    state = state || {};
    let total = 0, open = 0;
    const hits = [], unanswered = [];
    for (const it of def.items) {
      const v = state[it.id];
      if (it.type === 'choice') {
        const o = (v === null || v === undefined) ? null : it.options[v];
        if (!o) { open += itemMax(it); unanswered.push(it.id); continue; }
        total += o.pt;
        hits.push({ id: it.id, abbr: o.abbr, pt: o.pt });
      } else if (v === true) {
        total += it.pt;
        hits.push({ id: it.id, abbr: it.abbr, pt: it.pt });
      }
    }
    let status;
    if (total >= def.cutoff) status = 'pos';
    else if (total + open >= def.cutoff) status = 'pending';
    else status = 'neg';
    return { total: total, max: def.max, status: status, hits: hits, unanswered: unanswered };
  }

  // 判定の文言（画面用）
  function judge(def, r) {
    const c = def.cutoff + def.unit;
    if (def.id === 'nagase') {
      if (r.status === 'pos') return { cls: 'pos', main: '1項目以上：重症熱性けいれん（SFS）', sub: '神経学的予後不良のハイリスク（AESD の予測ではない）' };
      return { cls: 'neg', main: '該当なし', sub: '予後良好を保証するものではない' };
    }
    if (r.status === 'pos') return { cls: 'pos', main: c + '以上：AESD のハイリスク', sub: def.perfShort };
    if (r.status === 'pending') return { cls: 'pending', main: '意識レベルを選ぶと判定できます', sub: '現在 ' + r.total + def.unit + '（意識レベル未入力）' };
    const sub = r.unanswered.length ? '意識レベル未入力。低スコアでも AESD は否定できない' : '低スコアでも AESD は否定できない';
    return { cls: 'neg', main: 'カットオフ（' + c + '）未満', sub: sub };
  }

  // カルテ用コピーの1スコア分（例：「Ichinose 3/6点：3点以上［Cr≥0.35、PCT≥1.7］」）
  function summaryLine(def, r) {
    let j;
    if (r.status === 'pos') j = def.cutoff + def.unit + '以上' + (def.id === 'nagase' ? '（SFS該当）' : '');
    else if (r.status === 'pending') j = '判定保留（意識レベル未入力）';
    else j = def.id === 'nagase' ? '該当なし' : def.cutoff + def.unit + '未満';
    const hit = r.hits.length ? '［' + r.hits.map(h => h.abbr).join('、') + '］' : '';
    return def.short + ' ' + r.total + '/' + def.max + def.unit + '：' + j + hit;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // states: { スコアid: state }, touched: { スコアid: true }
  function summaryText(states, touched, now) {
    const lines = [];
    for (const def of SCORES) {
      if (!touched[def.id]) continue;
      lines.push('・' + summaryLine(def, compute(def, states[def.id])));
    }
    if (!lines.length) return '';
    const d = now || new Date();
    const stamp = d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    return ['AESD予測スコア（' + stamp + '）'].concat(lines).join('\n');
  }

  return { SCORES: SCORES, byId: byId, itemMax: itemMax, compute: compute, judge: judge, summaryLine: summaryLine, summaryText: summaryText };
});
