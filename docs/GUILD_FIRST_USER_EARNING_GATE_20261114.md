# 冒險者公會第一位使用者：賺錢工作流

狀態：2026-11-14，基於 7da9706 奇幻公會最新版新增 `/earn`，開發分支 `feat/guild-first-user-earn-20261114`。

## 唯一目的
第一個真實使用者輸入「我想賺錢」後，能找到有真實來源的工作；或在本人登入、確認後將既有能力公開上架；其他會員可用既有 MCP 尋找服務。

## 已完成（可重跑）
- 首頁「我想賺錢」「找工作」「接案」等入口 → `/earn`；導覽可直接進入。
- `/api/opportunities?q=ai%20agent`：Himalayas 官方公開 API、`country=TW`、固定白名單、僅 GET、過期過濾、官方 applicationLink 原樣保留、來源標示、有限時快取、無私人鍵。
- `/earn`：可以按不同關鍵字找遠端職缺；初步依標題排序（不是個人化匹配），未收集求職個資；既有 `publishService`、`listMyServices` 和 `GuildAuthDialog` 重用。能力簡介是尚未公開的可編輯預填文案，只有登入與明確確認才會發布。
- `/connect` 提供官方 Himalayas 遠端 MCP URL；Gemini CLI、OpenCode 同時可設公會 MCP 和外部職缺 MCP；ChatGPT、Claude 分別添加兩個遠端 MCP，使用限制依各平台。
- `node tests/test_opportunities.mjs` 合約測試；Vercel Vite build、公開 Chromium 頁面與 HTTP GET E2E。

## 明確尚未實作／不可宣稱
- 沒有使用使用者的真實會員登入進行服務發布，沒有自動應徵、外部接案提案、網路爬蟲、付款或 J1 工作自動執行。
- 公會需求／任務目前均為 0 筆，現有遠端職缺是聘僱機會，不等於短期外包或真實成交。公會原 MCP 僅查公會；外部職缺使用 Himalayas **官方** MCP，不再自建二套。
- Google OAuth 與 NodeBB 公會統一 SSO 尚未驗收；應從 email/魔法連結完成本人的登入。
- 服務公開後不提供網站內履約擔保；尚須客戶雙方驗收與收款證據。

## 後續單一驗收
真實會員自行登入 → 確認服務文案、價格、刊登 → 公開 MCP 查到該服務 → 另一個真人回覆／詢價 → 用 J1 完成一件可交付的真實任務 → 收款證據。所有對外寫入須本人確認。

來源條款：https://himalayas.app/docs/remote-jobs-api 與 https://himalayas.app/mcp。API 資料每日更新；原始應徵連結與來源標示不得移除。僅個人網站展示，不得重新配發給其他求職聚合平台。
