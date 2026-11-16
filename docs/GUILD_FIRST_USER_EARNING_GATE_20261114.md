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

## 台灣本地工作來源增量（2026-11-14）
- 政府資料開放平臺 `https://data.gov.tw/dataset/44062`，授權「政府資料開放授權條款-第1版」，官方 API `https://free.taiwanjobs.gov.tw/webservice_taipei/Webservice.ashx` 實測可用，`zipno` 三碼郵遞區號、`count=200`，回傳 CDATA；官方回傳的元素名稱帶全形括號，不是標準 XML tag，因此僅識別政府文件列出的固定欄位 CDATA，不以 HTML parser 爬取其他站。/api/taiwan-opportunities 支援 title/domain/expired 受限驗證與來源標示。提供常見郵區 104台北中山、220新北板橋、407台中西屯、807高雄三民，亦可輸入任意合法三碼郵遞區號。查詢僅返回該郵區前 200 筆中的符合結果，不得聲稱全市、全台完整涵蓋，結果可能為零；有效期限仍須至職缺原站核對。
- 小雞上工 `https://www.chickpt.com.tw/`、接案任務 `/cases`、出任務 `https://www.tasker.com.tw/cases`、PRO360、104、1111、518熊班：只提供官方入口，不抓取、不複製職缺、不自動登入／投遞。小雞上工官方服務條款第 21 條明確限制未授權自動搜尋／擷取；104 的 Job API 公開資訊為企業刊登資料寫入，不是我們可讀取所有職缺的公開資料 API。日後要整批資料須先取得合作／API 授權。
- 後續驗收：固定 4 郵區至少各一筆真實官方職缺，台灣 API 異常時不假造數據；新頁面 390px 無橫向溢出；原 `/earn`、`/connect`、Himalayas 可用；原正式 main 不動。
