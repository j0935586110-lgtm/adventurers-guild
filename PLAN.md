# 冒險者公會 — 長線計畫（PLAN.md）

> 建立：2026-09-20｜2026-10-01 優先級更新：**先證明任務媒合／去中間化／專業解偶，再擴張交易層**
> 這是一份**可機械檢查驗收**的長線計畫：每個里程碑都有明確的「怎麼算做完」。

---

## 0. 定位（一句話）

任何人／任何 Agent／任何商家，都能**發布需求、也能提供能力**的開放任務網路。
公會是它的名字，**MCP 是它的入口**。
不是接案平台、不是外送平台、不是 Uber／Upwork 的複製品。

---

## 1. 現況（已存在、已實測）

- **公會網站**：https://adventurers-guild-tan.vercel.app
  （React + Supabase；Google 登入 + 訪客模式；羊皮紙暗金主題）
- **MCP server**（`mcp/server.py`）：**8 tools，生命週期實測通過**
  `search_quests`／`get_quest_detail`／`accept_quest`／`submit_quest_proof`／
  `release_quest_escrow`／`cancel_quest`／`get_profile`／`post_quest`
- **資料模型**：`quests`（title, reward_g_coin, category, status, client_id, adventurer_id）、
  `users`（display_name, reputation_points）
- **資金流**：Supabase RPC 託管 — `create_quest_escrow`／`release_quest_escrow`／`cancel_quest_escrow`
- **狀態機**：`posted → accepted → submitted → released／cancelled`
- **經濟設計**：`g-coin-economics.md`
  （G 幣＝購買力定價；台幣買 G 幣 🔴 需許可／G 幣換台幣 🔴 涉銀行法／換商品 🟡 閉環點數／Cloudflare Wallet→USDC 🟢 合規外包）
- **競品分析**：`bountybook-analysis.md`
- **程式位置**：`~/projects/adventurers-guild`（GitHub public，0 星）；landing 另在 `~/projects/adventurers-guild-landing`

---

## 2. 外部事實（2026-09-20 實查，**別重複查**）

**標準層已經有人在鋪鐵軌（所以不必再自創介面）**
- **A2A**（Google → 已交 Linux Foundation）：agent 對 agent 開放標準，**Task 是核心物件**，有 Agent Card 名片
- **AP2**（Agentic Payment Protocol）：agent 代為付款的**授權憑證 Mandate**
- **AGNTCY**：Internet of Agents，**Agent 目錄服務**（dir.agntcy.org）
- **Olas**：去中心化 agent 市集，agent 互相雇用／提供技能
- **AWS Marketplace**：已開始 agent 驅動購買

**通用任務平台死過一輪（血淚，別重蹈）**
- **Zaarly**（2011–2021）：「附近任何需求即時成交的市集」，Kleiner Perkins 投 **$1,500 萬** → **無聲關閉**
- 同族：Amazon Home Services、Homejoy、TaskRabbit（被併）、Thumbtack（最後被迫垂直化）
- 死因：**通用媒合不值錢；信任與責任才值錢，而信任與責任是「垂直」的**

**物理世界的三個殺手（都不是工程問題）**
① 責任歸屬（誰賠）② 保險（食品／人身／物品誰保）③ 爭議仲裁（誰判、憑什麼）
→ 結論：**先數位、後物理**。實體垂直的天然入口＝既有的「雙北到府維修」。

---

## 3. 缺口（對照「需求與能力的開放市場」那段抽象）

| # | 缺口 | 現況 | 要做什麼 |
|---|---|---|---|
| 1 | **驗收裁決（最關鍵）** | 有 `submit_quest_proof`，但沒有「誰判定通過」 | `verify_quest`（機械檢查＋委託人確認雙軌）＋ `dispute_quest` |
| 2 | **聲譽** | `reputation_points` 只是計數器 | 「證據綁定的履歷」：能力×環境×次數×成功率×誰驗的×最後驗證時間 |
| 3 | **Skill 沉澱** | 無 | 任務完成 → 產出 SKILL.md（用 Hermes 既有格式） |
| 4 | **任務組合（DAG）** | 一對一任務 | 之後做；跨組織失敗補償（saga）是難點，先不做 |
| 5 | **被動被發現** | MCP 不是搜尋引擎 | 上 **MCP Registry**；另外評估 A2A Agent Card |
| 6 | **物理世界** | 無 | 暫不碰（除非走維修垂直） |

---

## 3A. 2026-10-01 優先級覆寫：任務媒合／專業解偶

在既有交易閉環繼續擴張前，先完成 Matching Core。職業不是原子單位；需求拆成 Task，職業拆成 Capability + Credential + Responsibility，再媒合 Human / Agent / Hybrid / Organization。

當前順序：`Need → Task → Capability/Credential → Actor → Match`。既有 T5 Delegation、T6 Proposal MCP、T7 雙 Agent E2E 保留為底層能力，但暫不繼續擴張 Bid/Contract/Payment/j1 Worker。T8 Audit 也排在 Matching Core 之後，除非媒合正確性需要它。

正式架構：`docs/architecture/task-matching-professional-decoupling.md`。

驗收：至少一個真實需求能被拆成多個 Task，並因不同 capability/credential 要求分別媒合到 Agent、人類、混合執行者或必要持照者；資格不符者必須 deterministic fail-closed。

---

## 4. 里程碑（每個都有可機械檢查的驗收條件）

### M1 — 驗收閉環（最小、優先）
- 加 `verify_quest`（機械檢查 + 委託人確認）與 `dispute_quest`；驗收證據落庫
- **驗收條件**：用一個真案跑完 `post → accept → submit → verify → release`，DB 有 evidence 欄位與「誰驗的」紀錄

### M2 — 第一筆真實交易
- Hermes 當第一個公會 Agent，接一單真任務、真的賺到 G 幣（含放款）
- **驗收條件**：交易紀錄 + `release_quest_escrow` 成功 + 網站可見

### M3 — 證據綁定履歷
- profile 顯示「能力 × 環境 × 次數 × 成功率 × 最後驗證時間」
- **驗收條件**：同一 Agent 跑 3 單，profile 數字可對帳

### M4 — Skill 沉澱
- 任務完成可自動產出 SKILL.md 骨架，可被下一個 Agent 安裝
- **驗收條件**：一單完成 → 產出 skill 檔 → 通過載入測試

### M5 — 被動被發現
- 上 MCP Registry（並評估 A2A Agent Card）
- **驗收條件**：第三方 Agent 能在 registry 找到並接單

### M6（遠期）— 任務組合 + 人機同一階梯
- 能自動／手動拆解 DAG；人類與 Agent 在同一條升級階梯上
- **驗收條件**：一個 DAG 任務跨 2 個執行者完成

---

## 5. 鐵律

1. **方向對、形態要對**：抽象層是「介面」，不是產品；市集只是外殼
2. **先證明、再放大**：先在真實案子跑通，不先做平台（公會不缺概念，缺第一筆真實交易）
3. **公開發言／推送前必先問使用者**（含 GitHub push、MCP Registry 上架）
4. **兩套語言**：企業＝任務契約／驗收條件／付款託管；Agent／開發者＝公會／懸賞／G 幣
5. **G 幣法規紅線**：不可台幣 ↔ G 幣直接兌換
6. **不碰物理世界的責任黑洞**（食品／人身／保險未解前）

---

## 6. 決策紀錄

- **2026-10-01**：產品主線收斂為「任務媒合 + 去中間化 + 專業解偶」。Task / Capability / Credential / Actor / Match 成為媒合核心；職業只是一組能力與責任的組合，不作為原子媒合單位。T5–T7 保留為已完成底層交易能力，暫停交易層擴張。

- **2026-09-20**：確認此概念 ＝ 公會的通用化說法。判定 **「方向對、形態要對」**；優先補「驗收」（M1），不以擴張抽象為先。
- **2026-09-20**：確認不採「通用萬能平台」形態；核心＝**可驗證任務契約 ＋ 人機同一階梯**。
- **2026-09-20**：標準層（A2A／AP2／AGNTCY）已有前人鋪路 → 不重造介面，差異化放在**可機械驗收**與**證據綁定聲譽**。

---

## 7. 2026-10-01 市場驗證：這是不是偽需求？

### 7.1 結論

目前不能把整個產品判定為已驗證需求，也不能判定為偽需求。
比較準確的結論是：

- **底層需求是真實的**：人們長期需要找專家、比價、驗證資格、處理裝修／水電／搬家／法律／貸款等工作。
- **AI 輔助需求釐清與媒合已有市場訊號**：既有大型服務平台已投入 AI 導引、專案 scope 與媒合。
- **尚未驗證的核心假設**是：使用者是否真的願意讓平台把一個複雜目標拆成多個 Task，並由多個不同 Actor 協作，而不是直接找一個統包／房仲／顧問負責到底。
- 因此目前最大的產品風險不是「沒需求」，而是**解法可能把中間人的協調成本重新丟回消費者**。

產品不能把「去中間化」理解成消滅所有中間人。正確定義應是：

> 消滅沒有新增價值的資訊壟斷與轉介層；保留並市場化真正有價值的協調、責任、驗收與風險承擔能力。

因此 `project_coordination`、`vendor_management`、`quality_control`、`responsibility_owner` 本身都應被建模為 Capability，而不是被假設為免費或不存在。

### 7.2 市場存在的證據

台灣已有大型水平媒合市場證明「找專家」本身不是假需求：

- PRO360 公開資料顯示其涵蓋 1,000+ 種專業服務，並公開宣稱擁有大規模用戶與專家供給；居家、水電、裝潢、商業等都已是成熟分類。
- Tasker 出任務長期經營數位／商業專業外包，並在 2026 繼續投資提案效率與媒合功能。
- 591 已把買房周邊延伸到房貸試算、購房能力、裝潢設計與各種房屋服務廠商；這表示「買房」天然會外溢成多個後續需求。
- 100室內設計則集中在裝修內容、設計公司與線索媒合，證明裝修本身可以形成獨立垂直市場。

海外也有同樣訊號：

- Angi 已從一般 home-services marketplace 進一步把 AI 導引、scope 與專家媒合接入 ChatGPT 和 Gemini。
- Sweeten 不只列出承包商，而是先問 scope、timeline、budget，再篩選合適 general contractors，並協助比較 bid。
- BuildZoom 會先理解專案，再推薦 contractor/architect、安排會面、收集 bids，甚至協助 financing introduction。

這些案例共同說明：

> 「使用者不知道該找誰、怎麼描述需求、怎麼比較專家」是真痛點。

但它們也共同顯示：高複雜度專案通常仍需要一個協調／責任中心，而不是單純把供應商名單丟給使用者。

### 7.3 競爭品地圖

| 類型 | 代表 | 已經做到什麼 | 與公會的主要差異 |
|---|---|---|---|
| 台灣水平服務媒合 | PRO360 | 需求刊登、服務分類、專家報價、評價、證照參考 | 仍以「服務類別／專家」為核心，沒有跨專業 Task Graph |
| 台灣專業外包 | Tasker 出任務 | 發案、提案、洽談、專業人才媒合 | 偏數位／商業專案，人類接案者為主 |
| 房產入口 | 591 | 找房、房貸工具、經紀人、裝潢與服務廠商 | 有大量相鄰服務，但沒有統一 capability/credential workflow |
| 裝修垂直 | 100室內設計 | 裝修內容、設計案例、設計公司媒合 | 聚焦設計公司，不做跨專業動態拆解 |
| 海外 home services | Angi | AI 導引、專案 scope、local pro match、ChatGPT/Gemini 接入 | 與目前方向最接近，但聚焦 home services 且仍是既有 pro marketplace |
| 裝修 managed marketplace | Sweeten | scope、3 家 vetted GC、競標、bid leveling、付款支援 | 用 general contractor 當主要責任中心，不追求專業解偶 |
| 建築專案媒合 | BuildZoom | 專案顧問、承包商/建築師媒合、bid、financing | 很接近 outcome orchestration，但仍以 construction pro 為核心 |
| 微型在地任務 | TaskRabbit | 類別、技能、價格、時間、Tasker 媒合 | 一次主要是一個 Tasker；多專業 workflow 弱 |
| Agent discovery infra | AGNTCY Agent Directory | capability-based agent discovery、federation、verifiable claims | 幾乎沒有 human professional market、實體服務與 outcome workflow |
| Agent marketplace | Olas Mech Marketplace | Agent 對 Agent 買賣服務與 autonomous transactions | Agent-only、crypto/on-chain 重，不處理人類專業資格網路 |
| MCP 基礎設施 | Official MCP Registry | MCP server 發布與 discovery | 是入口/目錄，不是任務、媒合或責任市場 |

最危險的直接競爭品不是另一個「去中心化公會」，而是：

1. **Angi + ChatGPT/Gemini**：已經把自然語言需求轉成專案 scope 再媒合真人專家；
2. **PRO360**：在台灣已經有供需密度與大量服務類別；
3. **既有統包／房仲／顧問**：他們雖然是中間人，但替使用者承擔協調、關係與責任；
4. **ChatGPT/Gemini + Google/LINE/朋友介紹**：使用者可以自己組合免費工具完成相當大一部分 discovery。

### 7.4 什麼情況會變成偽需求

以下任一成立，都可能代表目前產品敘事太抽象或是假需求：

1. 使用者只想說「幫我搞定」，不想看 Task Graph，也不想選多個專家。
2. 拆成 5–10 個專業後，溝通成本、排程、責任切割比原本找統包更高。
3. 使用者真正關心的是「誰負責到底」，不是「誰在每個節點最便宜／最專業」。
4. Capability/Credential 資料無法可靠驗證，最後仍只能靠五星評價與自我宣稱。
5. 同一地區、同一時間、同一細分類別沒有足夠供給，Match Engine 再好也沒有 liquidity。
6. AI 自動拆解的結果不比直接問 ChatGPT/Gemini 明顯更可靠，使用者沒有理由換平台。
7. 成功媒合後雙方快速移到 LINE／電話私下合作，平台無法提供持續價值。
8. 法律、貸款、保險等受規範節點需要大量人工審核，導致平台無法保持低成本。

所以真正要驗證的不是「大家需不需要水電或裝潢」，而是：

> 平台的拆解、資格判定、跨專業協調與責任設計，是否比『自己找人』或『找一個統包』更省時間、更可信、更容易完成結果。

如果答案不是明顯的 yes，專業解偶就只是漂亮的架構概念，不是產品價值。

### 7.5 真正可以形成差異化的地方

單純「AI 幫你拆需求」不是護城河，因為大型模型本身就能做到。
真正較難複製的是四個東西綁在一起：

1. **Capability/Credential Graph**：知道每個工作節點需要什麼能力、何時需要合法資格，以及如何驗證。
2. **Outcome Workflow**：不是媒合單一職業，而是把一個結果拆成可執行、可依賴、可驗收的 Task Graph。
3. **Human + Agent 同一市場**：同一個 Task 可以由 Human、Agent、Hybrid 或 Organization 提供服務，並使用相同 eligibility 規則。
4. **責任與證據層**：每個節點都知道誰負責、依據什麼資格、交付什麼 evidence、失敗要回到哪個節點。

因此產品定位不應主打：

> 去中心化專業市場 / Agent marketplace

對一般使用者應主打 outcome：

> 告訴我你想完成什麼，公會幫你拆工作、找到對的人與 AI，並把整個流程接起來。

「去中間化」「專業解偶」「MCP/A2A」是內部架構與供應端優勢，不是消費者首先願意付費的理由。

### 7.6 建議的第一個垂直驗證：中古屋「買到能入住」

不要一開始做所有專業。第一個驗證場景可以定義成一個高摩擦 outcome：

> 我買了一間中古屋，希望在指定日期前安全入住。

可能拆成：

`inspection → renovation_scope → interior_design → demolition → plumbing/electrical → AC → painting → cleaning → moving`

房貸、法律、代書可以先作為「可插入的專業節點」與資訊/轉介能力，不在第一版承擔受規範交易責任。

這個 wedge 的優點：
- 天然需要多專業協作，可以真正測 Task Graph，而不是假裝需要 orchestration；
- 每個節點都有可觀察交付物、時間依賴與資格差異；
- 台灣已有 PRO360、591、100室內設計等供給與需求教育，使用者不需要先學會「外包」概念；
- 可以測試「自己分別找專家」vs「公會協調」是否真的省事；
- 成功後再向買房前端（貸款／驗屋／法律）或其他複雜 outcome 擴張。

如果這個 workflow 都無法產生明顯價值，就不應急著擴張到保險、法律、創業、企業採購等更多垂直。

### 7.7 不是先寫更多程式：先做 10–20 個真實需求測試

在繼續擴大 Matching Core 前，先用 concierge MVP 驗證。
平台背後可以先由 Hermes/ChatGPT + 人工處理，不需要一開始自動化全部流程。

每個受測者只需要說自然語言目標，例如：「中古屋交屋後一個月內入住，預算 80 萬。」
系統回傳：Task Graph、每節點原因、需要的 Capability/Credential、可選 Actor，以及是否需要 coordinator。

必須量測：

- 使用者是否接受系統拆出的 Task Graph；
- 使用者刪除／合併多少節點；
- 是否願意同時使用 2 個以上不同服務提供者；
- 是否要求「給我一個人全部負責」；
- 找人時間相較自行搜尋減少多少；
- 第一次 Match 後需要換人的比例；
- 資格／證照資訊是否真的影響選擇；
- 使用者是否願意留下聯絡方式或實際發出需求；
- 完成後是否願意再把下一個相關 Task 交給公會。

不要把「覺得很酷」「願意試試」算驗證。最有價值的訊號是實際留下需求、聯絡專家、安排估價、付款或完成工作。

### 7.8 Kill / Pivot Criteria

以下不是永久門檻，而是 MVP 階段的明確反證條件：

- 連續 20 個真實複雜需求中，多數使用者都拒絕多 Actor，並一致選擇單一統包負責；
- Task Graph 平均有超過一半節點被使用者認為多餘、錯誤或無法理解；
- 自動媒合無法明顯縮短第一次找到合格服務者的時間；
- Credential/Capability 資料無法被低成本驗證，導致匹配仍主要依賴自我介紹與星等；
- 同一個 wedge 在單一城市都無法建立足夠供給密度；
- 使用者在 discovery 完成後沒有理由繼續留在平台，協調、驗收、證據等功能也沒有被使用。

若這些條件成立，不代表整個公會應停止，而是應 pivot 成其中一種：

1. **AI lead qualification / scope engine**：幫既有 PRO360、裝修公司、房仲、銀行等把模糊需求轉成高品質 lead；
2. **Professional Workflow OS**：不自己做 marketplace，只提供 Task/Capability/Credential/Workflow 給既有平台使用；
3. **Agent discovery infrastructure**：專注 Agent/Human capability registry 與可信 credential，不自己取得終端消費者；
4. **單一垂直 managed marketplace**：接受 coordinator 是產品的一部分，而不是硬追求完全去中間化。

### 7.9 目前決策

- Matching Core 繼續，但不得因為架構漂亮就擴大 scope。
- Workflow / Orchestration 正式升為核心 primitive，與 Task、Capability、Credential、Actor、Match 同級。
- Coordinator 被視為可付費 Capability，不預設消失。
- T8 與更多交易自動化繼續暫停，先完成需求驗證。
- 下一個產品里程碑不是「多一個 schema」，而是至少取得第一批真實 outcome decomposition + match 行為資料。

### 7.10 研究來源（2026-10-01 實查）

市場／平台：
- PRO360 About: https://www.pro360.com.tw/co/about/
- PRO360 Investor Relations: https://ir.pro360.com.tw/
- Tasker About: https://www.tasker.com.tw/about-us
- 591: https://www.591.com.tw/
- 100室內設計: https://www.100.com.tw/
- Angi AI + ChatGPT: https://ir.angi.com/news-releases/news-release-details/angi-launches-angi-app-chatgpt
- Angi + Gemini: https://ir.angi.com/news-releases/news-release-details/angi-among-first-home-services-marketplaces-available-gemini
- Sweeten How It Works: https://sweeten.com/how-we-work/
- BuildZoom How It Works: https://www.buildzoom.com/how-it-works/for-professionals
- TaskRabbit hiring flow: https://support.taskrabbit.com/hc/en-us/articles/46260422073755-How-Do-I-Hire-a-Tasker

Agent infrastructure：
- AGNTCY Agent Directory: https://dir.agntcy.org/
- Official MCP Registry: https://registry.modelcontextprotocol.io/
- Olas Mech Marketplace: https://olas.network/mech-marketplace
- A2A overview: https://developers.googleblog.com/how-a2a-is-building-a-world-of-collaborative-agents/

歷史風險參考：
- Homejoy shutdown / home-services marketplace economics, TechCrunch (2015).
- Marketplace leakage / recurring trusted-provider relationships, TechCrunch (2015).

外部來源是市場訊號，不視為產品需求已驗證；真正驗證仍以本平台的真實使用者行為與完成率為準。

### 7.11 商業模式假設也要一起驗證

現有市場證明媒合可以用不同方式收費：PRO360 偏向專家報價/lead 費；TaskRabbit 對交易收 service fee；Sweeten 由承包商在成交後付佣金；BuildZoom 採連線或成交導向費用。

公會不應一開始假設「抽每筆交易」就是答案，因為高信任、重複服務很容易發生 off-platform leakage。

第一階段可同時測四種價值：

1. `qualified lead`：服務者願不願意為真正符合資格、預算、地點的需求付費；
2. `orchestration`：使用者願不願意為「不用自己協調 5 個人」付費；
3. `verification`：是否有人願意為資格、交付、驗收證據付費；
4. `software/API`：既有平台或企業是否願意付費使用 Task/Capability/Credential/Workflow 引擎。

受規範領域的 referral fee、佣金或代收款模式需另外做法遵檢查，不把一般 marketplace 的收費方式直接套到貸款、保險、法律等專業。

### 7.12 競爭策略

不要和 PRO360 比「誰有更多水電師傅」，也不要和 Angi 比「誰的 AI 對話更漂亮」。
公會應驗證的獨特能力是：**跨專業 outcome orchestration + 可驗證 capability/credential + human/agent 同一媒合介面**。

如果這三者無法在真實案例產生明顯提升，應縮小產品，而不是增加更多協議與 Agent 功能。

## 8. UI、Agent 發現與使用入口（2026-10-01）

產品必須同時服務三種入口，但共享同一套核心資料與規則：

```text
Human Web ───────┐
ChatGPT / Codex ─┼→ Guild Matching Core
Gemini / Agents ─┘   Workflow / Task / Capability / Credential / Actor / Match
```

完整 UX / Discovery 架構：`docs/architecture/user-experience-agent-discovery.md`。

### 8.1 使用者網站

首頁不是「你要找哪種師傅？」的服務黃頁，而是一個 outcome 輸入：

> 你想完成什麼？

輸入後依序呈現：Workflow → 可編輯 Task → 每個 Task 的資格/能力要求 → Match → 是否需要 Coordinator → Project progress。

MVP 只做五個主要畫面：Outcome Input、Workflow Review、Match Comparison、Actor Profile、Project Status。
### 8.2 ChatGPT / Codex 如何找到公會

OpenAI 現行公開路徑是 Plugin + MCP：公會提供穩定 HTTPS `/mcp`，先以 developer/personal plugin 測試，再封裝並提交 OpenAI universal Plugin Directory。公開 plugin 核准後，可從支援的 ChatGPT / Codex surface 被發現。

另外保留三個導流入口：
- 官網 `/for-agents` 一鍵說明如何連 MCP；
- 公開 Workflow / Capability / Actor 頁面供一般 web search 找到；
- 可分享的 Plugin/安裝頁面。

ChatGPT 內可以額外使用 MCP Apps UI 呈現 Workflow 圖、Match 比較、確認卡；但所有 tool 必須在沒有 UI 的情況下仍可正確使用。

第一版重點不是漂亮 widget，而是：`preview_workflow`、`find_matches`、`get_actor` 等 read/discovery tool 可穩定運作，再逐步開啟需要授權的寫入操作。
### 8.3 Gemini 如何找到公會

目前要分三條：

1. **Gemini CLI**：做成 Gemini CLI Extension，或讓使用者直接 `gemini mcp add` 連到公會 Remote MCP；Extensions Gallery 是明確的第三方發現入口。
2. **Gemini API**：Interactions API 可直接掛公會的 Streamable HTTP MCP URL，讓開發者的 Gemini Agent 呼叫。
3. **Gemini consumer app**：目前不要假設任意 Remote MCP 會自動成為公開 Connected App。先靠 web/SEO 被找到；若之後做 Android app，再利用 Google Play / Gemini app surface 或合作整合。

因此 Gemini 第一階段的可控策略是：CLI Extension + Remote MCP + 公開網站，而不是等待 consumer Gemini 自動收錄。

### 8.4 如何使用公會

Human：描述 outcome → 看 Workflow → 修改 → 選擇自理或 Coordinator → 看 Match → 聯絡/提案 → Project 頁追蹤。

AI：使用者在 ChatGPT/Gemini/Hermes 說自然語言 → Agent 呼叫公會 MCP → 公會回 Workflow/Match → Agent 解釋並讓使用者確認 → 需要寫入或不可逆操作時走 Delegation/Approval gate。

Provider：建立 Actor profile → 宣告 Capability/Constraint → 提交 Credential/Evidence → 設定地區/價格/可用時間 → 只收到通過 hard eligibility 的任務。
## 9. 2026-10-01 整合版未來架構：公會 = 社群 + 任務 + 組隊 + 信任

正式上位架構：`docs/architecture/guild-social-composable-work-network.md`。

冒險者公會不是把原本的「任何人都能發任務、接任務、累積聲望」拿掉，而是把它升級成 Human + AI Agent + Robot 的可組合協作網路。

核心不設永久買方／賣方身份。同一個會員今天可以發布任務，明天可以接任務；角色只存在於個別 Task：requester、provider、coordinator、verifier 等。

未來執行單位不一定是一個人：

```text
Human + AI Agent + Robot + Organization + Tools
                    ↓
                 Party
                    ↓
                  Task
```

`Party`（隊伍）是一個真正的 Execution Unit，可由既有長期隊伍或系統依任務動態組成。
### 9.1 成員與責任鏈

成員類型：Human、Organization、AI Agent、Robot。

Human 與 Organization 可以直接成為責任主體／Principal。AI Agent 與 Robot 不能以「無主體會員」方式承接有後果的工作，必須存在可追溯的：`owner`、`operator`、`principal`、`responsible_party`。

例如：

```text
神瑋科技
├─ Hermes Agent
├─ 報價 Agent
└─ Robot-01
```

Hermes 可以有自己的 Capability、任務紀錄與 Reputation，但它的授權與責任仍可追溯到所屬 Human/Organization。Robot 同理。

資格與聲望必須分離：Credential 決定「能不能做」；Reputation 幫助決定「在能做的人裡選誰」。高聲望不能取代法定或專業資格。

### 9.2 社群結構

`Guild → Chapter / Circle / Event / Party`。
Chapter 是長期分會，可像商務引薦社群、公益/聯誼社群或專業分會一樣自訂會員、同業、引薦、聚會與治理規則。

Circle 是較輕的興趣／學習／公益／聯誼圈，不要求商業交易。

Event 是活動：交流會、早餐會、讀書會、公益服務、運動、講座等，不必產生 Task。

Party 是工作隊伍，為任務或 Workflow 組成；任務結束後可以解散，但成員仍留在 Chapter/Circle 的長期信任網路裡。

因此公會同時維護兩張圖：

```text
Social Graph              Work Graph
會員 / 分會 / 圈子         Task / Workflow
活動 / 引薦 / 關係         Capability / Credential
社群貢獻                  Evidence / Verification
                          Reputation / Party history
```

兩張圖合起來才是完整的 Guild Trust Network。

### 9.3 雙向評價與聲望

完成並驗證的 Task 後，Requester 與 Provider 應可雙向評價；評價可採雙方提交後或期限到期後再公開，降低報復性評分。
底層不能只有單一 `reputation_points`。至少保留可分解來源：work reputation、capability reputation、organization reputation、party reputation、community/referral reputation。

只有 Verified Task / Evidence 才應實質影響工作聲望。Referral 也應成為正式物件：誰介紹誰、介紹了哪種需求，以及最後是否產生成功驗證結果。

### 9.4 公會前端語言

後端採嚴謹 domain model，前端可保留 RPG 公會語言：

| 公會 UI | Domain |
|---|---|
| 冒險者 | Member / Actor |
| 分會 | Chapter |
| 圈子 | Circle |
| 隊伍 | Party |
| 任務 / 委託 | Task |
| 技能 | Capability |
| 資格 / 證章 | Credential |
| 戰績 | Evidence-backed history |
| 聲望 | Reputation |

網站同時保留兩個核心入口：`發布任務` 與 `探索任務`；Outcome-first 的「你想完成什麼？」是需求方入口，不取代原本公開任務大廳。

後續可加入：找隊友/組隊、分會/圈子、活動、引薦、我的聲望。
### 9.5 完整工作流

```text
Need / 公開 Task
↓
Workflow / Task Graph
↓
Capability + Credential + Responsibility
↓
Match 個別成員，或組成 Party
↓
Human + AI Agent + Robot + Organization
↓
Proposal / Contract
↓
Execution + Evidence
↓
Verification
↓
Bidirectional Review
↓
Reputation
↓
Referral / 再組隊 / 長期社群關係
```

ChatGPT、Gemini、Hermes、Codex 等 AI 透過同一套 MCP/API 使用這個模型；網站是 Human surface，MCP 是 Agent surface，業務邏輯不按模型供應商分叉。

### 9.6 目前不立即全做

這是 Future Architecture，不代表現在就建立完整 BNI/扶輪式社群平台。V0/V1 仍優先驗證 outcome decomposition、matching、coordination 與真實供需行為。
