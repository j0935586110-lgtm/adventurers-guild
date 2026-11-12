# 冒險者公會｜一句話媒合朋友測試版

## 能做的事
- 首頁用一句話說明要找什麼，分類進入合作、徵才、求職、活動、社團、朋友、登山/健身、資源等公開頁。
- 會員可以登入，建立私人需求草稿，逐欄確認後發布成公開需求。公開文字不得包含私人電話、Email 或住址。
- 任何人可瀏覽真實公開需求，會員可以表達意願，只有回覆者和需求發布者能看見。發布者可接受或拒絕意願。
- 還沒有完整私訊聊天室、真正已驗證的求職履歷/社交名單。不可宣稱已完成聘用或媒合。
- 成人約會尚未開放，需要成年驗證、同意及封鎖和檢舉措施。

## AI 端點（隔離測試）
公會公開唯讀 MCP：
https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-discovery-friend-beta
支援 find_people_and_opportunities、list_public_needs，與既有 search_services/get_service/get_service_reviews。

公會會員授權 MCP：
https://wrwsjlydozfzejixofwm.supabase.co/functions/v1/guild-mcp-friend-beta
支援 create_need_draft、publish_need、my_needs、search_public_needs、reply_to_need、my_need_replies、decide_need_reply、close_need，及原有會員工具。
私人需求必須使用會員本人 OAuth，發布需再次明確確認；不能因為 AI 自動填入確認值便當作已同意。

GPT、Gemini、Claude 各有連線與帳號限制；AI 不會因為 SEO 或 llms.txt 自動安裝插件。這些連線仍需個別測試。

## 2026-11-12 已驗證
- Supabase 遷移版號 20261112063358；三個新增表的 RLS 均已啟用。原任務/錢包/金流未改。
- 公開 MCP 測試端點 initialize、tools/list、tools/call 實際 HTTP 200；找員工、健身、約會三種測試分類正確，零資料不造假、約會 unavailable。
- 會員 MCP 測試端點匿名工具清單回 401，附授權資訊。
- Vite build 成功，Chromium 本機開啟顯示一句話入口、公開需求看板、新手分類。
- 現有正式資料庫：3 個會員、0 筆公開服務、0 筆公開需求；尚不能宣稱已找到真人。
- 未驗收：真實兩帳號發布/回覆/同意閉環、AI 三家 OAuth 完整連線、社交身份安全和成年驗證、全部舊會員頁完整翻譯。

## 注意
任何對外宣傳都要區分已驗證和未驗證；使用者本人同意後才能公開內容。
