# 冒險者公會 Chat-first 統一首頁（2026-11-12）

## 使用者回饋
截圖顯示白綠新版網站入口下竟能進入黑金色 LegacyGuildMain 任務看板與舊登入頁，整站體驗不一致；原首頁分類卡片與宣傳內容偏多，尚無真實公開刊登時像是空樣板。使用者要求更簡約，甚至首頁只留 Chat。

## 本次實作
- App 首頁不再載入舊 GuildHome/LegacyGuildMain，改用 GuildChatHome；沿用原本 Supabase 會員、NodeBB 站內論壇、MCP、既有任務表。
- 首屏只留公會品牌、小型導覽、登入/註冊、一個可送出的對話輸入框與三個示例；移除首頁下方所有假空欄位、行銷介紹與分類網格。
- 公會聊天是**確定性分類與真實公開資料查詢，不是已接上大語言模型**。工作/活動/合作從 guild_needs published 查，任務從 quests posted 查，論壇從公會 /api/community 真實 NodeBB 公開 API 查；空結果不造假，也不表示全網沒有。
- 已驗證的公會綠色 AuthDialog 從 GuildHome 抽成共用 GuildAuthDialog；已有 Email magic link 和 password，Google 僅在 Supabase provider 啟用後出現；不再顯示黑金 LegacyGuild 登入畫面。
- 沒有真實匹配時，在聊天結果中可產生**私人**需求草稿，使用者須自己確認儲存，再勾選同意才可發布；沿用資料庫 RLS 和 createNeedDraft / publishNeed。
- 找到真實公開需求時可透過既有 replyToNeed 發送會員合作意願；需登入且輸入訊息才發送。
- 任務檢視連到 /me?tab=explore，由 GuildMemberHub 讀取並打開現有 Explore tab；不導向黑金舊版。
- /community 與 /ai 原有網址及 MCP 服務保留，不修改身份或 G 幣資料。

## 界線
- 這是公會內公開資料搜尋與互動版，不是假裝的全網 AI 聊天，也不聲稱有 LLM 模型或全站 Agent 自治。
- 目前不支援成人約會配對。
- 沒有經許可不對外自動刊登內容；不提供未經授權的 NodeBB 論壇代理發文。
- Google Provider 的真正配置與公會／論壇單一登入仍未完成。
- 正式 main 暫不覆蓋；先獨立 GitHub Branch + Vercel preview 驗收。
