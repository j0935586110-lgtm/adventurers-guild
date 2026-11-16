# 冒險者公會站內論壇與 Google 登入現況（2026-11-12）

## 直接整合論壇已完成
- 社群入口 /community，單篇 /community/topic/:tid，首頁與導覽皆有入口。
- 同源 API /api/community 只讀 NodeBB 公開分類、最新文章與帖子；使用者在公會站內閱讀，沿用現有論壇資料，不另建論壇。
- 貼文 HTML 解析成純文字，不直接注入未經處理的 HTML；共用公會青綠／米白／珊瑚品牌色，手機版及雙語。
- 站內發文、回覆、按讚尚未串接，會清楚導到原論壇登入；不能宣稱完全取代 NodeBB 客戶端。

## 登入與身分安全
- NodeBB 已有 Google 登入選項（/auth/google）。
- 公會 Supabase Auth 的 Google 授權 API 實測 HTTP 400、Unsupported provider: provider is not enabled。React signInWithGoogle 程式已存在，Vercel 尚無 VITE_GUILD_GOOGLE_OAUTH 啟用設定；不能只打開旗標假裝成功。
- Supabase Google OAuth 必須配置 Google Cloud OAuth Client ID、Client Secret、回呼 URI、Supabase Redirect URL allowlist 並實測。
- NodeBB HTTP 標頭包括 CSP frame-ancestors self、X-Frame-Options SAMEORIGIN，禁止其他來源 iframe；此版採用 NodeBB API 在公會站內原生顯示。
- 兩邊各有 Google 登入並不等於同一會員身分。真正 SSO 需要相容的 OIDC/OAuth 2.1、可驗證帳號綁定、既有會員遷移；未經驗證不得按 email 字串自動合併。
- NodeBB 的 nodebb-plugin-sso-oauth2-multiple 已存在，但須先核對 Supabase 必要 PKCE、既有 NodeBB 帳號映射與實際 NodeBB 版本；未驗證不可直接啟用。

## 首頁設計
主標題「想找人？找工作？找機會？」；唯一主要輸入「我想找……」；可試的例句；站內論壇、任務與會員中心三條捷徑；手機版裝飾不阻擋操作。

## 驗收要求
Vite build；新增元件無新增 TypeScript 錯誤；NodeBB API 成功返回 categories、recent、topic；錯誤 id 400、POST 405；Chromium 實際 /、/community、/community/topic/7 渲染，不能拿空頁或 HTML 200 冒充成功。

本次工作不變更 Supabase / NodeBB 既有 Auth 設定與會員、G 幣資料；只更新獨立 Vercel 預覽分支。
