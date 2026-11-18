# Open Agentic Web Challenge — 修復驗收報告

日期：2026-11-19（Asia/Taipei）
目標：獨立 Vercel Preview，未變更正式網站
測試網址：https://adventurers-guild-v2-amiddze2n-johnfu.vercel.app/agentic.html?lang=zh-TW
測試程式碼：55fa87f65ffc596d4530a0d05578c1ad4e4b9818
追蹤議題：https://github.com/j0935586110-lgtm/adventurers-guild/issues/3

## 5 項重現缺陷修復

| 編號 | 原問題 | 最新實測 |
|---|---|---|
| E2E-01 P1 | 自然語言沒有用於搜尋 | 修復。Excel 需求未填獨立搜尋詞，實際送出 GET /api/agentic-directory?mode=all&keyword=Excel；未知需求不再默默搜尋全部 |
| E2E-02 P2 | Runtime 繁中頁面設定仍全英文 | 主要操作已翻譯：AI 模型設定、金鑰說明、開發工具、供應商提示；保留上游原始 Runtime。技術事件追蹤與商標仍可能顯示英文 |
| E2E-03 P2 | 切換英文後重新整理退回中文 | 修復。按鈕同步網址 lang=en 與 browser storage；英文在重新整理後保留 |
| E2E-04 P2 | 手機 Developer 按鈕在畫面外 | 修復。390px 按鈕右緣 x=347，小於畫面寬 390；320px 無超框按鈕 |
| E2E-05 P3 | favicon.ico 404 | 修復。沿用現有 guild-mark.svg 產生 favicon.ico；實際 HTTP 200，瀏覽器無相關 404 |

## 證據與回歸測試

- Node 自動測試：22/22 PASS（含 9 項自然語言關鍵字測試）。
- 真正 Chromium CDP 操作：通過，1440／390／320px。
- 繁中 ↔ 英文設定文案來回切換：通過。
- 自然語言 Excel 需求：驗證請求參數確實包含 keyword=Excel。
- 草稿只在使用者點擊確認連結後才接力到原本公會；匿名會遇到登入邊界，沒有直接刊登。
- 官方 nsDeploy validate_network：errors = []。
- 公開網頁、Manifest、Network、favicon、公開資料 API：HTTP 200。
- 私有模式參數：HTTP 400；POST 公開資料：HTTP 405。
- Chromium JS exception = 0；HTTP errors = 0。
- 全站 TypeScript 型別檢查仍有既有錯誤，與修復前基準完全一致；Vite build PASS。

測試腳本：tests/e2e_agentic_fixed.cjs
測試 JSON：docs/evidence/open-agentic-web/20261119/fixed-browser-e2e.json
實際截圖：docs/evidence/open-agentic-web/20261119/fixed-mobile-zh.png 以及 fixed-mobile320-zh.png
前次缺陷實測：docs/E2E_ISSUES_20261119.md

## 尚未通過的獨立驗收閘門（不可冒稱已修復）

1. GATE-01 真實 LLM → website_search_guild_public_matches → tool receipt：匿名測試瀏覽器未連接經授權的模型供應商。Runtime ready 不代表 LLM 呼叫成功，使用者需在預覽頁直接授權模型，不能把金鑰放在聊天或 GitHub。
2. GATE-02 真人／AI 真實候選人 → 雙方確認 → 交付證據：匿名公開資料仍回傳 services 0、needs 0、verified agents 0。需要真正自願刊登的會員，不能造假交易。
3. 登入後完整發布、雙方私訊、驗收：尚未以授權測試帳號執行；原有登入與同意確認保留。
4. 外部網站 Agent peer calling：保持 closed 政策，尚未驗收跨站權限與呼叫。
5. 自然語言擷取是明示且可測試的規則式搜尋詞建議，不是完整語意搜尋或 LLM 自主推薦。

本輪只修五個重現的產品問題、增加測試與證據，不公開私密資料，不改正式站，也不創造虛構候選人。
