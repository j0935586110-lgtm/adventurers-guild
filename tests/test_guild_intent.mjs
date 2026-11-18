import assert from "node:assert/strict";
import {test} from "node:test";
import {suggestGuildKeyword,resolveGuildKeyword} from "../public/guild-intent.js";

test("Chinese natural task selects genuine Excel keyword",()=>{
  assert.deepEqual(resolveGuildKeyword("幫我把公司的 Excel 報表自動化，預算 NT$3000",""),{keyword:"Excel",reason:"recognized_domain"});
});
test("English natural task selects Excel keyword",()=>{
  assert.equal(resolveGuildKeyword("Automate my Excel spreadsheet reports for NT$3000","").keyword,"Excel");
});
test("Chinese office report without English Excel also recognized",()=>{
  assert.equal(resolveGuildKeyword("要做報表自動化，求協助","").keyword,"Excel");
});
test("Japanese/Chinese text normalization does not become arbitrary SQL",()=>{
  assert.equal(resolveGuildKeyword("要做一個網站","").keyword,"網站");
});
test("user-supplied search wins over suggested keyword",()=>{
  assert.deepEqual(resolveGuildKeyword("幫我做 Excel","design"),{keyword:"design",reason:"user_supplied"});
});
test("unrecognized task explicitly blocks broad search",()=>{
  assert.deepEqual(suggestGuildKeyword("想找人協助一件事情"),{keyword:"",reason:"unrecognized_task"});
});
test("vague request stays empty instead of false positive",()=>{
  assert.deepEqual(suggestGuildKeyword(""),{keyword:"",reason:"empty_task"});
});
test("short English content using marketing domain recognized",()=>{
  assert.equal(resolveGuildKeyword("Please help with SEO marketing").keyword,"行銷");
});
test("text input is bounded",()=>{
  const r=resolveGuildKeyword("any","Z".repeat(200));
  assert.equal(r.keyword.length,80);
});
