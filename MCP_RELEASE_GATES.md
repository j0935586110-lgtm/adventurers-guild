# 冒險者公會 × GPT/Claude MCP｜2026-10-28 上線檢查

## 目前已落地（每項均有實際證據）
- 主 Supabase 專案 wrwsjlydozfzejixofwm: `guild_services`、`guild_inquiries`、`guild_reviews` 已建立，RLS 已啟用。
- 個人新註冊 trigger: `public.handle_new_user()` 改用安全 search_path、暱稱（不預設外洩 Email），並保留原本 G-Coin 初始設定；但真人 Google/Email 註冊仍未測。
- `public.users` 讀取僅允許公開欄位，Email/餘額對 anon 不可讀；一般會員不能改動 G-Coin 餘額。
- 八個原有 SECURITY DEFINER 託管／交易 RPC 已收回 PUBLIC/anon/authenticated EXECUTE，service_role 繼續可用。
- 以上三項主資料庫變更均透過 Supabase apply_migration 執行並立即讀回確認。
- 可匿名存取的公開唯讀 MCP 已部署，HTTPS:
  https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-discovery
  實測 MCP initialize、tools/list、search_services HTTP 200；目前 0 筆刊登。
- 僅供 OAuth 使用者的受保護 MCP 已部署，HTTPS:
  https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-mcp-beta
  實測無 token 的 initialize HTTP 401，返回正確 WWW-Authenticate 與 OAuth 資源 metadata。
- 本地 PostgreSQL docker 測試通過：註冊兩位模擬會員、刊登、詢價、報價、確認完成、單筆評價與負面權限測試。
- Deno 靜態 check 兩個 Edge Functions 都通過。Vite build 通過；Python 合約測試通過。
- 使用者首次連接同意頁 `/oauth/consent` 已寫入 src/components/OAuthConsent.tsx，並建立 vercel.json 路由。尚未以公開網址驗證。

## 真正阻礙（必須分辨）
1. **OAuth 2.1 Server 尚未啟用**：2026-10-28 對
   https://wrwsjlydozfzejixofwm.supabase.co/.well-known/oauth-authorization-server/auth/v1
   GET 回 404 `feature_disabled`。請在 Supabase Dashboard 的 Authentication > OAuth Server 啟用，
   Authorization Path 設 `/oauth/consent`；若要支援 ChatGPT/Claude 自動註冊 client，啟用 Dynamic Client Registration，注意開啟使用者同意。
2. Supabase 目前 ES256 JWKS 已存在，可供 @supabase/server 驗證 access token；但未實際完成 OAuth flow，請勿宣稱可由 GPT 自動登入。
3. **OAuth Consent 頁需要公開且正確的 HTTPS 網站原點**。Vercel 現有 preview 受 Team Authentication 保護，
   新頁程式尚未發布到正式域名。需確認 Vercel 團隊授權、完成前端部署、確認直接進入 /oauth/consent 可載入。
4. Google OAuth Provider 啟用及 redirect URI 未經驗證。正式 Auth 使用者仍為 0 人。
5. 未實測兩個真正的 Supabase Auth 使用者 + ChatGPT 私人插件接入；未提交 Plugin Directory；J1 不在本次範圍。
6. 既有正式站仍是舊版。資料庫已加固，但舊版 Web Profile 的 `select('*')` 可能不再支援，必須先上線新版
   使用 explicit public columns + `guild_my_wallet()` 的 GuildProvider，才建議讓新會員註冊使用。
7. 尚未解決舊 Firebase 未使用 TypeScript 路徑與缺少 React 型別造成的全域 `tsc --noEmit` 基線失敗。
8. Supabase security advisors 還有舊專案 definer search_path 和 PostGIS public schema 等警告，需另案處理，不能宣稱全面完成安全驗收。

## 使用者下一個需要完成的授權
- Supabase Dashboard：https://supabase.com/dashboard/project/wrwsjlydozfzejixofwm
  Authentication > OAuth Server：啟用 OAuth 2.1；授權路徑 `/oauth/consent`；批准 Dynamic Client Registration。
- 讓我們有能力部署可供 OAuth 回呼的公開新站（Vercel team 目前曾回 403）。
- 完成一次真正的 Google/Email 登入、同意與 MCP Inspector/ChatGPT custom MCP 連接後，才能宣稱「GPT 自動註冊/刊登」。

## 安全範圍
- guild-discovery 只讀並受 service_status 和 RLS 雙重限制；不持有 service-role key。
- guild-mcp-beta 全部工具受 @supabase/server OAuth token 驗證與 RLS；不操作 J1、不付款、不授權任意 Shell。
- 交易評價只代表買家手動確認詢價完成，不代表第三方已驗證付款／實際履約。

## 最新預覽驗證（2026-10-28）
- Vercel 新版隔離預覽已部署：`https://adventurers-guild-7ntphz63e-johnfu.vercel.app/`，部署狀態 READY。
- Vercel 已成功產生暫時分享連結；在同一瀏覽器開啟分享連結後，`/oauth/consent?authorization_id=test` 實際 HTTP 200，HTML 屬於新版冒險者公會。
- 這僅證明 SPA consent route 可載入，**不代表 OAuth Server 已啟用或實際授權完成**。正式網站仍未覆蓋。

## OAuth Server activation from J1 Windows 11 — 2026-10-28

- User explicitly authorized Windows 11 J1 remote GUI administration.
- On agent `desktop-jne4fna-bdb6` Chrome, opened `https://supabase.com/dashboard/project/wrwsjlydozfzejixofwm/auth/oauth-server`.
- Browser initially had no Supabase session. Used existing ChatGPT account through Supabase "Continue with ChatGPT" UI; Supabase project dashboard authentication succeeded.
- Switched `Enable the Supabase OAuth Server` ON and saved. Independently read UIA toggle `On`.
- Authorization Path displays `/oauth/consent` (configured).
- Discovery `https://wrwsjlydozfzejixofwm.supabase.co/.well-known/oauth-authorization-server/auth/v1` returned **HTTP 200**, verified from J1 on Windows, issuer and authorization endpoint correct (previously `404 feature_disabled`).
- `Allow Dynamic OAuth Apps` remains OFF, independently verified. Dashboard warning stated public registration invites phishing/spam; postponed until actual reachable consent UI and permission workflow can be verified.
- **Critical pending**: Supabase `Site URL` currently `http://localhost:3000`. OAuth authorization redirect would therefore not reach an internet-accessible consent UI. The existing production guild website is still the older build; only a Vercel protected preview carries consent UI. Do not change Site URL before deploying consent UI on an authorized accessible origin.
- Next: deploy working consent page to a stable public HTTPS URL, change Supabase `Authentication > URL Configuration > Site URL` to that origin, verify consent route with real `authorization_id`, then evaluate enabling DCR and ChatGPT/Claude end-to-end OAuth.
- **Do not claim** GPT-based automatic signup until a real authorized OAuth flow and two-account publish tests succeed.

## 2026-10-28 Public OAuth v2 website and real authorization preflight

- Created separate **Vercel project** `adventurers-guild-v2` ID `prj_4iEFPpejnYumqIxFuuD9HqqgGPUD` with NO Git connection and NO SSO protection. Published reviewed static Vite build to production alias:
  `https://adventurers-guild-v2.vercel.app/`
  The original `adventurers-guild-tan.vercel.app` remains unchanged (HTTP 200, older title).
- Confirmed from an unauthenticated HTTP client: `/` and `/oauth/consent?authorization_id=preflight` both HTTP 200, public and HTTPS.
- Changed **global Supabase Auth Site URL** from `http://localhost:3000` to `https://adventurers-guild-v2.vercel.app` via authorized J1 GUI; opened URL Config in a NEW Chrome tab and independently re-read persisted value.
- Added and confirmed 3 Supabase Auth redirect URL patterns:
  `https://adventurers-guild-v2.vercel.app/**`,
  `https://adventurers-guild-tan.vercel.app/**`, `http://localhost:3000/**`.
  These preserve existing old-site and local-development return paths; reset-password and default email confirmation links now target v2 (intentional reversible impact).
- Supabase provider settings: `Allow new users to sign up` ON; Email ENABLED; Google DISABLED. Google sign-in requires separate Google Cloud client ID/secret and authorized redirect URI. Do NOT claim one-click Google login is active.
- Created a single manual PUBLIC OAuth development client in Supabase OAuth Apps:
  `Guild OAuth Development Test`; client ID `b1e1367d-26d6-413d-9d56-2e24f4aa3017`; registered callback `https://adventurers-guild-v2.vercel.app/oauth/test-return`; no confidential client secret.
- Real, server-validated authorization request (code PKCE S256, client_id, redirect_uri, response_type=code, openid/email/profile) returned **302** to `https://adventurers-guild-v2.vercel.app/oauth/consent` with a true `authorization_id`. Response contained NO OAuth error. Authorization identifier and code verifier were not exposed in logs.
- UI bug fix: `GuildProvider.signUp` now sets `emailRedirectTo: window.location.href` so email verification links can return to the original consent URL with its authorization_id; Google button hidden on both homepage and consent unless `VITE_GUILD_GOOGLE_OAUTH=true`.
- Rebuilt and deployed v2; latest production deployment `dpl_HuDBcxskBkZbDgiARRmyBepd4Ry6` READY; Vite build and 56 Python contract tests passed before final new regression.
- Real browser smoke test from external machine: root and consent HTTP 200 at 390px; consent displays Email login form and NO Google button, neither page has JS exceptions/horizontal overflow.
- Attempted to set up an independently verifiable test inbox and synthetic QA Auth account, but outbound automated signup script invocation was BLOCKED by platform security controls; did not circumvent. Test mailbox was empty and deleted. Live `auth.users` count remains **0**; therefore approval, token exchange, and GPT publish cannot be declared passed.
- DCR still OFF. Official Supabase security warning: enabling it lets anyone register OAuth clients and can lead to phishing/spam. Keep OFF until the real consent/login+token workflow and client-specific authorization are tested; decide with user whether DCR risks are acceptable.
- Rollback for global Site URL: Supabase Dashboard > Authentication > URL Configuration, prior value `http://localhost:3000`. To preserve functioning production identity flows, prefer deliberate v2 choice rather than blindly reverting.
- No changes to the old production Vercel project, original GitHub main branch, J1 privileges, or G-Coin. Frontend code source remains in isolated local checkout.

### Browser E2E of genuine authorization request (unauthenticated stage)
With a manual Public OAuth client, a PKCE S256 code challenge and a registered exact redirect URI, `/auth/v1/oauth/authorize` returned HTTP 302 to the public v2 consent URL with a valid `authorization_id`. Puppeteer then opened that **actual Location** (without logging the identifier or code verifier): consent returned HTTP 200, login form present, Google button hidden, no browser JS errors, no horizontal overflow at 390px. This validates the browser-facing unauthenticated half of the flow. No credentials, grant approval, or token exchange occurred.

## 2026-11-08 OpenCode 會員 MCP 驗收更新（取代前述舊狀態）

- 正式公會已上線：https://adventurers-guild-v2.vercel.app/ 。公開 OAuth 同意頁及作品頁都能 HTTP 200 存取。
- OAuth Server 已啟用：well-known metadata HTTP 200；既有公開測試客戶端的 PKCE S256 授權請求成功 HTTP 302 導向正式 /oauth/consent。
- 實際資料庫：auth.users 0 位、公開 guild_services 0 筆、guild_inquiries 0 筆、guild_reviews 0 筆；尚無真實會員可供登入驗收。
- OpenCode 1.18.22 在 Hermes j-baa0 用隔離設定已成功連上公開 guild-discovery。免費模型真實呼叫搜尋：台北市網站開發回 0；自然語言搜尋高雄市 AI 課程，模型自動改查四次後正確回報 0。
- 受保護 guild-mcp-beta 在 OpenCode 收到正確 401、WWW-Authenticate、OAuth resource metadata；OpenCode Debug 隨後確認阻礙為：Incompatible auth server: does not support dynamic client registration。
- 現有 OAuth client 僅 1 個手動 Guild OAuth Development Test，回呼網址為 /oauth/test-return，不能當作 OpenCode 本機 OAuth 回呼。
- Supabase 管理者登入仍待完成：本次 Win11 Chrome 和 Hermes Chrome 都導向 Supabase Dashboard 登入頁；沒有繞過或使用管理員憑證修改 Auth 系統表。
- OpenCode 的私人會員操作及真實發布皆尚未驗證，不能宣稱 OpenCode 已能代表會員發文。
- 會員 MCP 現有 publish_service 是提供服務的刊登，不等同 post_quest 徵求任務；舊版 Quest privileged RPC 已撤回一般角色權限，不應為了驗收放寬。

### 下次實作的最短路徑

1. Supabase 管理者登入 Authentication > OAuth Server，經風險確認後啟用 Allow Dynamic OAuth Apps；保留正式 Site URL、授權路徑 /oauth/consent、同意及撤銷流程。官方提醒公開動態註冊會允許任意 MCP client 註冊，需要防釣魚及安全審查；不採用動態註冊時，可單獨註冊 OpenCode 並登記精確回呼 URL。
2. 本人完成一個真實公會會員的合法註冊、Email 確認及登入，不能用 service_role 冒充會員。
3. 在隔離 OpenCode 測試設定執行 opencode mcp auth guild_member、完成會員同意及確認 connected。
4. 在確認可撤回測試資料後，執行一筆明確標記的臨時 publish_service，依 ID 從公開搜尋讀回並清理；另行設計合法的 post_quest 路徑，再驗收徵求任務。
5. 最後以同一會員權限測試 OpenCode 搜尋、授權、發布、讀回、撤權，才標記完整 E2E 通過。

參考官方：
- https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication
- https://supabase.com/docs/guides/ai-tools/byo-mcp
- https://opencode.ai/docs/mcp-servers

本次未建立帳號、未刊登測試服務、未發送公開訊息、未擴權或改動正式 OAuth 設定。
