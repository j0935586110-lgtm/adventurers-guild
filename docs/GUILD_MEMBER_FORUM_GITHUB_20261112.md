# 冒險者公會 × 台灣 AI 論壇 × GitHub：整合範圍與驗收

## 已實作（公會預覽分支）

- /me 私人會員中心：會員 G 幣（原本只讀 RPC，僅本人）、已有信譽值、已驗收任務計數、發布／認領中的任務清單。
- /adventurers/:uuid 公開冒險者展示頁：會員公開暱稱、任務成果、作品與論壇公開資料；不公開錢包。
- guild_quest_bookmarks 及 guild_need_bookmarks：只允許本人寫入／查詢的任務與需求收藏，RLS；不等於正式認領任務。
- guild_member_showcases：RLS 公開的個人簡介、GitHub 與 NodeBB 公開名稱、置頂作品清單。帳號名稱是使用者自行填寫；目前沒有 OAuth 驗證，不能稱為已驗證。
- GitHub 作品：讀取 GitHub 官方公開 REST API，最多 60 筆，自選置頂，不需要額外爬蟲或密鑰。
- api/forum-profile.js：同源 read-only NodeBB API 橋接，輸入只接受安全的公開會員名稱，從 NodeBB 公開個人頁取主題數、發文數及論壇聲望；不轉入公會信譽值，也不回傳論壇個資欄位。
- G 幣：不加入每日登入獎勵，不修改錢包或舊託管 RPC；目前 Supabase 另有一次性新會員註冊獎勵（不等於每日登入）。
- 英文／繁體中文與行動版介面；論壇的顏色、字型可使用 integrations/nodebb/guild-theme.css 無損增補現有 NodeBB Custom CSS。尚未套用論壇正式站。

## 兩套服務的邊界

目前公會使用 Supabase Auth，論壇使用獨立 NodeBB 身分；同為 Google 登入不等於可安全推定是同一人。正式統一登入應導入可驗證的 OAuth/OIDC 授權關係，並透過明確同意的關聯流程建立連動，不能只憑信箱或自行填入的 GitHub／NodeBB 暱稱當作同一帳號。

信譽值的來源目前是既有 users.reputation_points；已驗收數量只讀 quests.status='verified' 且 adventurer_id=member_id。論壇按讚數和 GitHub Stars 不自動轉換信譽或 G 幣。未來真正給獎勵，必須有服務端防重記帳、驗收與反刷證據。

## 驗收證據與尚未完成

1. 本分支 Vite build 通過；tsc --noEmit 原專案舊問題（Firebase 依賴和舊元件 typing），新增 GuildMemberHub 無自身 error。
2. NodeBB API 真實 GET /api/user/jianwei 200，橋接函式 200，輸出只含 username/url/topiccount/postcount/reputation/verified；錯誤名稱 400、POST 405。
3. Supabase 新表 migration 已套用，需驗證 RLS 授權／匿名行為，且需 2 個真實會員各自完成使用者操作測試。
4. GitHub 公共作品 UI 已編譯；尚需真實會員輸入帳號並目視檢查。
5. NodeBB 正式站客製 CSS 與 OAuth/OIDC 共用登入未完成；在管理員備份與確認之前不應強制覆寫。
6. 真正 G 幣可轉移、入金／真實價值及多來源信譽賦分未開發，先等交易驗證和防作弊規則確立。

## 發佈

工作分支 feat/guild-member-hub-20261112，不合併／不覆寫 production main，由 Vercel Preview 測試。資料庫只新增三個新表，無現有資料刪除或欄位變更。
