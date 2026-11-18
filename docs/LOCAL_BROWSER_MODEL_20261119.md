# 冒險者公會：零 API Key 瀏覽器本機語意媒合 — 2026-11-19

工作範圍：Open Agentic Web Challenge 獨立分支與 Preview，正式站不更新。

## 方案與授權
- Transformers.js 4.3.2（Apache-2.0）：https://github.com/huggingface/transformers.js
- Xenova/multilingual-e5-small（源模型 MIT）：https://huggingface.co/Xenova/multilingual-e5-small
- feature-extraction、q8、CPU WebAssembly、mean pooling、normalize、E5 query / passage prefixes。
- 首次下載的量化 ONNX 約 118 MB，Vite 另外打包約 26.9 MB WASM。依使用者點擊才啟動 Worker；無須 API 金鑰。
- Hugging Face 僅收到模型權重下載請求；任務文字在瀏覽器 Worker 本地處理，不送模型推論 API。
- 模型下載需要網路；不宣稱第一次開啟即完全離線，也不宣稱所有手機都能執行。

## 網站流程
- 既有 Agent 頁增加進入 /local-ai-lab.html 的雙語連結。
- 實驗頁有「公會真實已發布資料」與「合成基準（非真人會員）」兩種來源，來源絕不混用。
- 真實資料僅讀取既有公開 API /api/agentic-directory；服務與委託皆為 0 時，直接顯示無候選，不強迫下載 118 MB 模型。
- 明確點擊後才載入模型，支援繁中／英文需求語意排序；結果標示為文字相似度，不表示身份驗證或成交。
- 下載或推論失敗時顯示錯誤和原本公會規則搜尋的連結；停止功能可以終止 Worker。
- 不新增資料庫，不修改會員資料，不進行交易、刊登、私訊或 J1 遠端控制。

## 實際測試（僅此裝置與此批資料）
設備：Ubuntu 上 Chromium headless，Intel Core i5-9500、6 vCPU，啟動時 --disable-gpu，模型使用 WASM CPU q8。
- 實測首次模型載入：20.44 秒；首次模型推論比對 8 筆候選：0.87 秒。
- 繁中／英文混合 8 題自編合成基準：語意模型 top-1 8/8。
- 相同 8 題，現有規則式關鍵字＋標題包含：5/8 能找到預期候選。
- 另一輪 8 題模型比對時間約每題 0.41–0.50 秒。
- 以上不是生產效能保證，也不表示真實媒合準確率 100%；題目非常少且由我們自己編寫。
- 真實公會公開服務/委託都回傳 0 筆，因此還沒有真實候選人排名與成交資料。
- **尚未**在舊 Win11、M1、Android 驗證效能；請勿把這台 Ubuntu 的速度當作跨裝置測試結果。

## 證據和再現
- 模型 Chrome E2E：tests/e2e_local_model.cjs（需給 URL 與 EVIDENCE_DIR）。模型初次下載需要連網。
- 測試題與候選：src/local-ai-fixtures.js，全部是刻意合成，絕不對外宣稱為真實會員。
- 真實模型結果和合成基準 JSON：docs/evidence/open-agentic-web/20261119/local-browser-model.json
- 畫面截圖：docs/evidence/open-agentic-web/20261119/local-browser-model.png
- 單元測試：node --test tests/test_local_model_fixtures.mjs tests/test_guild_intent.mjs tests/test_open_agentic_web.mjs tests/test_agentic_directory.mjs
- Vite multi-page build，官方 nsDeploy Runtime 保持原樣，本機模型 Worker 是獨立可選功能。

## 尚未通過的關卡
- 官方 nsDeploy 真實生成式 LLM -> website tool -> 回覆收據，仍未驗收。Embedding 模型不等於生成式 Chat LLM。
- 需要經本人同意的真實會員服務、任務、接單、協作及證據驗收；目前公開資料為零，不用假資料模擬成功。
- 外部 Agent peer 呼叫和使用者授權仍需獨立實測。
- 先在真實舊 Win11／Android／M1 做冷／熱載入效能測試，再決定是否廣泛啟用。沒有實證缺口之前，不增加第二套 WebLLM 或自訓模型。

## 公開 Vercel Preview 的實際閉環（同日追加）
- 靜態公開網址：https://adventurers-guild-v2-fz5k6asv7-johnfu.vercel.app/local-ai-lab.html?lang=zh-TW
- 部署程式碼 SHA：f600adf6b73a9d5019e4b58b4a359284b016f498，Vercel 狀態 READY，僅 Preview。
- 確認該網址 HTTP 200，真正 Chromium 在公開網址執行小模型，modelExecuted=true。
- 該次首次載入 **21.02 秒**、8 個合成候選推論 **0.56 秒**、完整點擊至結果 **21.85 秒**。
- 該次 8 題繁體中文／英文合成排名 top-1 **8/8**，沒有 JS exceptions、consoleErrors 或 HTTP errors。
- 1440/390/320px 瀏覽器模擬版面無水平超框按鈕；真實公開候選人為 0 時，畫面說明為 0 且 **不會下載模型**。
- 注意：以上是 **模擬手機視窗大小**，不是 Android 實體手機效能測試。
- 公開網址原始 E2E 回報：docs/evidence/open-agentic-web/20261119/public-browser-model.json
- 公開網址結果截圖：docs/evidence/open-agentic-web/20261119/public-browser-model.png
- 公開網址 RWD 與資料為零的測試：docs/evidence/open-agentic-web/20261119/public-browser-layout.json
- 正式網址 https://adventurers-guild-v2.vercel.app/local-ai-lab.html 仍為 404，未變更正式站。
