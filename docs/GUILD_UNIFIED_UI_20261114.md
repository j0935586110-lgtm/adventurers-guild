# 公會統一入口 UI 改版 2026-11-14

基於 `feat/guild-first-user-earn-20261114` commit `5d21442`，新增獨立 UI 分支；只調整 React 介面與現有函式接線，不變更 Supabase Schema、RLS、會員資料、金流或正式站。

## UI 合約
- 一個自然語言輸入框：找人、找事、找機會，可查公會真實公開資料；不宣稱已接入 LLM 自主媒合，也不會依使用者輸入自動發布。
- 兩個行動：探索機會（捲到布告欄）；發布需求／服務（使用者自行選擇），需求使用原 createNeedDraft → 會員確認 publishNeed，服務跳到原 `/earn#publish-service`，原 publishService 自需登入、勾選同意。
- 首頁 `GuildBulletin` 只用 `listPublishedNeeds()` 和 `searchServices({})` 查真實公開需求／服務；零筆就顯示零，失敗顯示失敗；工作機會明確導向原先已驗收的台灣就業通和 Himalayas 查詢，不混為公會會員刊登資料。需求可按原 `replyToNeed`；服務可使用原 `sendInquiry`（需登入與確認），不預填假成交。
- 統一手機版底部 4 入口：探索、發布、訊息、我的。訊息入口到 `/me?tab=desk`，目前是合作回覆／詢價工作台，尚非完整即時聊天介面。
- 會員工作台新增等待處理／進行中／已完成(關閉)三種真實狀態，來源為既有 quests、guild_needs、guild_inquiries、guild_need_replies、guild_services。資料無法讀取時要警告不完整，不能拿空白當零筆。已有的明確授權報價 `quoteInquiry` 和接受／婉拒合作回覆 `decideReply` 需要本人點擊並再次確認；不自動發送。
- 作品集、論壇、探索任務、收藏、原任務頁保持現有路由，不做新帳號分級，不要求用戶選「個人／企業」。
- 「已完成」僅對應資料庫狀態；不可聲稱已收款、已有交付證據或已完成真人 E2E。

## 驗收
- `node tests/test_guild_ui_contract.mjs`（UI 接線 11 項）、`node tests/test_taiwan_opportunities.mjs`（台灣職缺 12 項）、`node tests/test_opportunities.mjs`（海外 9 項）。
- Vercel Vite build；J1 Chromium HTTP+DOM 360/390/1280；確認缺少真實公會資料時沒有假的卡片；`/me?tab=desk` 未登入應正確要求登入；`/earn#publish-service` 有發布表單。
- 未進行本人登入後的完整真人報價／刊登測試。不得聲稱這些已經完成。
