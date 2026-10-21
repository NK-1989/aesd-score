# AESD 早期予測スコア

有熱性けいれん重積のあとに、けいれん重積型（二相性）急性脳症（AESD）を発症するリスクを見積もる予測スコアを、チェック項目式で数えるWebアプリです。

公開URL: https://nk-1989.github.io/aesd-score/

## 画面の構成（v0.2）

- 1画面で4つのスコアをまとめて評価します。入力欄はスコアごとではなく、時期の順（① 患者背景・初回けいれん → ② 初回の血液検査 → ③ 発症6時間の時点 → ④ 覚醒までの時間 → ⑤ けいれん後12〜24時間）に並べ、各項目の右端に、入るスコアと点数を色札で示します。
- Cr と血糖は3つのスコアで閾値が少しずつ違うため、閾値を低い順に横に並べ、当てはまる最も右を押すと左側も該当になるようにしています（例：Cr 0.38 なら「> 0.35」を押すと Yokochi・Ichinose・Tada の3つに入る）。
- 上部に4スコアの点数と判定を常に表示し、下部の「判定の詳細」に加点した項目・判定・原著の定義と注意をまとめます。
- 時点を決めて評価する項目（発症6時間の意識・片麻痺、覚醒までの時間、12〜24時間の意識レベル）が未選択で、その結果しだいで判定が変わるときは「判定保留」と表示します。

## 収録しているスコア

| スコア | 判定の時期 | 項目 | 判定 |
|---|---|---|---|
| Ichinose スコア（2022） | 初回採血 | HCO₃⁻ < 20 mmol/L（1）、Cl < 100 mEq/L（1）、Cr ≥ 0.35 mg/dL（1）、血糖 ≥ 200 mg/dL（1）、PCT ≥ 1.7 ng/mL（2） | 3点以上で AESD を予測（感度 84.2%・特異度 81.0%） |
| Nagase 基準（2013） | 発症6時間以内 | 難治性けいれん重積（60分超・第一選択薬無効）、発症6時間の時点で GCS ≤ 14 または片麻痺、発症6時間以内の AST > 90 IU/L | 1項目以上で神経学的予後不良を予測（感度 94.1%・特異度 69.6%） |
| Yokochi スコア（2016） | 来院時採血＋覚醒までの時間 | pH < 7.014（1）、ALT ≥ 28 IU/L（2）、血糖 ≥ 228 mg/dL（2）、覚醒まで ≥ 11時間（2）、Cr ≥ 0.3 mg/dL（1）、NH₃ ≥ 125 μg/dL（2） | 4点以上で AESD を予測（感度 93%・特異度 91%） |
| Tada スコア（2015） | 初回けいれんの12〜24時間後 | 意識レベル GCS 15＝0／GCS 14〜9＝2／GCS 8以下＝3、1.5歳未満（1）、けいれん > 40分（1）、人工呼吸（1）、AST > 40 IU/L（1）、血糖 > 200 mg/dL（1）、Cr > 0.35 mg/dL（1） | 4点以上で AESD を示唆（感度 88.7%・特異度 90%） |

Nagase 基準は AESD ではなく、退院時の神経学的予後不良（PCPC 2〜6）を予測する基準です。各スコアの対象・定義の細部・原著どうしの表記の食い違い（PCT の単位、Tada スコアの「超／以上」など）は、アプリ内の「原著の定義と注意」に載せています。

## 注意

- AESD の診断基準ではありません。スコアだけで診断や治療を決めないでください。
- 未測定・未評価の項目は0点として数えます。
- 入力した内容は端末の中で計算するだけで、保存も送信もしません。

## 文献

1. Ichinose F, Nakamura T, Kira R, et al. Incidence and risk factors of acute encephalopathy with biphasic seizures in febrile status epilepticus. Brain Dev. 2022;44(1):36-43. PMID: 34362595
2. Nagase H, Nakagawa T, Aoki K, et al. Therapeutic indicators of acute encephalopathy in patients with complex febrile seizures. Pediatr Int. 2013;55(3):310-314. PMID: 23279186
3. Yokochi T, Takeuchi T, Mukai J, et al. Prediction of acute encephalopathy with biphasic seizures and late reduced diffusion in patients with febrile status epilepticus. Brain Dev. 2016;38(2):217-224. PMID: 26242200
4. Tada H, Takanashi J, Okuno H, et al. Predictive score for early diagnosis of acute encephalopathy with biphasic seizures and late reduced diffusion (AESD). J Neurol Sci. 2015;358(1-2):62-65. PMID: 26333951
5. 一ノ瀬文男, 實藤雅文. 熱性けいれんだと思ったらけいれん重積型（二相性）急性脳症（AESD）. 小児内科. 2025;57(4):435-438.

## 開発

ビルド不要の HTML/JS です。スコアの定義と計算は `scores.js`、テストは `node tests/scores.test.js`。
`scores.js` を変えたときは、`index.html` の `scores.js?v=` の番号を上げてください（古いファイルがキャッシュから読まれるのを防ぐため）。
