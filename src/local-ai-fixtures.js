// Deliberately synthetic, self-contained benchmark entries.
// These are NOT Guild members, offers, jobs or authenticated agents.
export const SYNTHETIC_CANDIDATES=Object.freeze([
 {id:"fixture-spreadsheet",title:"試算表資料整合與每週報告產生",category:"automation",text:"可規劃 Excel 與 Google Sheets 報表流程，整理公司每週營運數字並建立自動生成的統計摘要。 Spreadsheet workflow reporting automation."},
 {id:"fixture-website",title:"前端網站介面與響應式版型",category:"web",text:"建立網頁與購物網站，改善手機 RWD 介面、React 表單和網站效能。 Responsive web design and frontend development."},
 {id:"fixture-campaign",title:"社群貼文與品牌行銷",category:"marketing",text:"規劃社群媒體行銷活動、貼文排程、SEO 內容策略與廣告成效分析。 Social media marketing campaign."},
 {id:"fixture-translation",title:"中文與英文雙向翻譯",category:"translation",text:"翻譯商務郵件與網站內容，提供繁體中文與英文的語言在地化。 Traditional Chinese and English translation."},
 {id:"fixture-repair",title:"電腦故障檢查與維修",category:"repair",text:"檢修 Windows 電腦與 Linux 裝置，排查網路連線和硬體問題。 Laptop repair and IT support."},
 {id:"fixture-art",title:"活動海報及品牌視覺",category:"design",text:"設計品牌 logo、平面視覺和活動海報，適用實體聚會宣傳。 Graphic design and posters."},
 {id:"fixture-accounting",title:"記帳與稅務表單整理",category:"accounting",text:"處理公司發票、日常記帳、申報稅金與會計帳目。 Accounting, bookkeeping, tax filing."},
 {id:"fixture-video",title:"影片字幕與剪輯服務",category:"video",text:"剪輯產品介紹短片，製作字幕和影音輸出。 Video editing, subtitles and production."}
]);
export const BENCHMARK_QUERIES=Object.freeze([
 {query:"我想請人整理公司的試算表，每週自動產生營運報告",expected:"fixture-spreadsheet",locale:"zh-TW"},
 {query:"Please turn our weekly spreadsheet exports into automated reports",expected:"fixture-spreadsheet",locale:"en"},
 {query:"需要製作手機版也好操作的公司網頁",expected:"fixture-website",locale:"zh-TW"},
 {query:"We need help with social media advertising and a marketing campaign",expected:"fixture-campaign",locale:"en"},
 {query:"Translate our English business material into Traditional Chinese",expected:"fixture-translation",locale:"en"},
 {query:"請協助修理會一直當機的 Windows 筆電",expected:"fixture-repair",locale:"zh-TW"},
 {query:"公司需要會計協助整理發票與報稅",expected:"fixture-accounting",locale:"zh-TW"},
 {query:"We need subtitles and editing for a short promotional video",expected:"fixture-video",locale:"en"}
]);
