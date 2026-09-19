# 冒險者公會 — 長線計畫（PLAN.md）

> 建立：2026-09-20｜狀態：概念收斂完成，**等第一筆真實交易**
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

- **2026-09-20**：確認此概念 ＝ 公會的通用化說法。判定 **「方向對、形態要對」**；優先補「驗收」（M1），不以擴張抽象為先。
- **2026-09-20**：確認不採「通用萬能平台」形態；核心＝**可驗證任務契約 ＋ 人機同一階梯**。
- **2026-09-20**：標準層（A2A／AP2／AGNTCY）已有前人鋪路 → 不重造介面，差異化放在**可機械驗收**與**證據綁定聲譽**。
