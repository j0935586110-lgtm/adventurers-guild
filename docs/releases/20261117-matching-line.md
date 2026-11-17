# 2026-11-17 — 雙向媒合與 LINE 自願交換（Beta）

目標：保留現有公會網站、Supabase、已驗證的需求/服務/回覆資料模型；同一會員可發布委託、回應其他會員需求。

## 範圍
- 新增 /matching 作為網站上的可見入口（委託／接任務／我的合作）
- 直接重用 guild_needs、guild_need_replies、guild_need_messages 的既有流程
- 自願填寫 LINE ID：預設不分享。僅已接受的需求媒合成員，且本人勾選「分享」後，可在私人對話中看到對方的 LINE ID
- LINE ID 不放在公開會員資料、公開需求或服務資料中
- 修復聊天訊息 insert policy 原先 b.reply_id=b.reply_id 導致任何封鎖污染其他對話的問題
- 此批不做 Discord、金流、信譽分數算法、新好友資料表、組隊引擎或 AI 任務執行

## 安全控制
- public.guild_line_contacts 啟用 RLS；只有 owner_id=auth.uid() 的會員可以直接讀/寫自己的資料
- public.guild_match_line(uuid) 為受限 SECURITY DEFINER 入口：明確驗證 auth.uid、accepted、媒合雙方、LINE 分享開關，以及未封鎖
- 無權限的匿名訪客不能讀取 LINE 表格或執行 LINE RPC；不建立「所有會員可讀」聯絡表
- 邀請/合作意願與公開刊登維持使用者明確操作

## 驗收紀錄
- Vite production build: 1777 modules transformed, passed
- git diff --check: passed
- TypeScript: 既有未使用的 LegacyGuild / Firebase 等路徑有歷史型別錯誤；本批改動檔案的篩選輸出為零
- Supabase SQL: ephemeral rollback test passed — owner-only RLS、accepted+opt-in 返回 LINE、本人不能看未開啟的對方 LINE、封鎖後拒絕 LINE、不同會話仍可傳訊
- 資料庫測試使用事務 rollback，沒有建立假會員或假任務
- Headless Chromium /matching 與首頁 DOM 測試：均顯示正確委託與接任務入口，390px 寬有渲染
- 真人註冊/兩個獨立真實帳號 E2E：尚未驗收，不得標記已完成

## 回滾
- 先用 Vercel rollback/promotion 還原上一個正式版 d31389cc113a718fb4076583ee839686f4f5e598；功能入口會消失
- 不立即 DROP guild_line_contacts（避免刪除真實會員輸入的聯絡資訊）
- 修補的聊天封鎖 RLS 規則應保留，不需要隨前端回滾
- 後續若要清理 schema，需先核實是否有真實 LINE 記錄、備份及明確授權
