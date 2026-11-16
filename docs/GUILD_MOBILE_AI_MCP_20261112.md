# 冒險者公會手機介面、Google 登入與 MCP 整合（2026-11-12）

## 已完成

- 公會首頁原 CSS 在 720px 以下隱藏 .gh-nav-actions，導致登入/註冊按鈕消失：現改為手機 header 可見的緊湊登入按鈕，另在首屏加入免費加入 CTA。
- NodeBB 站內 /community 原 gc-intro::after 圓環是前景 pseudo element、遮住英文字。手機版移除裝飾，桌面版降低透明度並置於文案後方。
- 社群上方英文導覽改為手機漢堡選單，保留語言切換及登入；不再長條文字擠壓。
- Email 免密碼 Magic Link 透過現有 Supabase signInWithOtp API 發送；首頁登入與 AI 授權頁皆有入口；未登入時仍保留原 email 密碼與註冊。
- Google 按鈕改由 Supabase 公開 Auth 設定 endpoint 的 external.google 布林值動態決定；Google Provider 未啟用時不顯示假的一鍵登入按鈕。2026-11-12 實測 external.google=false。
- 已存在的 MCP 工具組：
  - 公會公開 MCP 從官方 Supabase Edge MCP SDK 複製並加 3 個唯讀論壇工具，總共 8 個，部署 guild-community-mcp-v1；initialize/tools/list/forum_recent_topics/forum_read_topic 實測 200。
  - 公會 OAuth 會員 MCP guild-mcp-friend-beta；按會員 Supabase OAuth 授權，可管理私人草稿、明確核准後發布需求及其他會員合作操作。
  - 台灣 AI 論壇 NodeBB MCP forum-mcp.928174.xyz/mcp；tools/list 已證實 forum_create_topic 和 forum_reply，寫入需要獨立持有人授權碼。絕不能把論壇管理員Token以網站訪客身份分享。
- Vercel /mcp 同站網址反向重寫到 guild-community-mcp-v1，/ai 為 MCP 控制中心，/ .well-known/mcp.json 為自訂服務列表，非正式 OAuth discovery 規範。

## 尚未完成

- Google 一鍵登入真正啟用：Supabase Auth Google Provider 尚未設定 OAuth Client ID/Secret/Redirect URI。既有 NodeBB Google OAuth 客戶端不等於可在 Supabase 沿用同 callback；需 Google Console 將 Supabase callback 加入 allowlist、Auth Config 啟用後以兩帳號 E2E 測試。
- NodeBB 與 Supabase 身分統一 SSO 尚未完成；即便兩站用 Google 登入，不能靠相同信箱或暱稱直接合併會員。
- 普通會員在公會站內以自己的 NodeBB 身分寫文章尚未完成；目前可讀公會內討論，論壇發文工具是給已持有各自專用 NodeBB Token 的 AI 客戶端或管理者使用。
- Email Magic Link 的郵件寄送與回呼需要真實會員親測；沒有向任何會員寄送測試信，也沒有宣稱 E2E 已通過。
- 新公會正式 production main 未改；所有 UI 調整先在獨立 Vercel preview。

## QA

- Vite production build。
- Supabase provider setting HTTP 200 external.google=false。
- NodeBB MCP healthz HTTP200 tools=9，tools/list 包含 create_topic/reply。
- 新公開公會論壇 MCP initialize、tools/list、tools/call 真實 NodeBB 文章成功。
- 手機 CSS 視窗寬 360~393 實機 Chromium 渲染待最後部署後驗收。
