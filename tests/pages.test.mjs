import test from "node:test";
import assert from "node:assert/strict";
import { validTikTokUrl, authorized } from "../lib/common.js";
import { onRequestPost as start } from "../functions/api/start.js";
import { onRequestPost as result } from "../functions/api/result.js";
import { onRequestPost as importBrief } from "../functions/api/brief-import.js";

const env = { WORKBENCH_KEY: "test-password", APIFY_TOKEN: "test-token", AI: { run: async () => ({ response: JSON.stringify({ breakdown: { hook: "场景开头", problem: "具体问题", mechanism: "问题到产品", proof: "待核对", cta: "商品卡", nontransfer: "原句" }, script: "待验证脚本：0-3 秒展示场景。" }) }) } };
const req = (path, body, key = "test-password") => new Request("https://example.pages.dev" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Workbench-Key": key }, body: JSON.stringify(body) });

test("only user-supplied HTTPS TikTok URLs are accepted", () => {
  assert.equal(validTikTokUrl("https://vt.tiktok.com/abc/"), true);
  assert.equal(validTikTokUrl("https://www.tiktok.com/@a/video/123"), true);
  assert.equal(validTikTokUrl("http://tiktok.com/@a/video/123"), false);
  assert.equal(validTikTokUrl("https://tiktok.com.evil.test/video/123"), false);
  assert.equal(validTikTokUrl("https://example.com/watch"), false);
});

test("missing or wrong access key blocks paid operations", async () => {
  assert.equal((await authorized(req("/api/start", {}, "wrong"), env)).status, 401);
  assert.equal((await authorized(req("/api/start", {}), { ...env, APIFY_TOKEN: "" })).status, 503);
});

test("start creates one Apify run with no related-video search", async () => {
  const original = globalThis.fetch;
  let submitted;
  globalThis.fetch = async (url, options) => {
    if (String(url).startsWith("https://vt.tiktok.com/")) return new Response(null, { status: 302, headers: { Location: "https://www.tiktok.com/@test/video/123" } });
    assert.equal(url, "https://api.apify.com/v2/acts/clockworks~tiktok-video-scraper/runs");
    submitted = JSON.parse(options.body);
    return Response.json({ data: { id: "run12345678" } });
  };
  try {
    const response = await start({ request: req("/api/start", { url: "https://vt.tiktok.com/abc/" }), env });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).runId, "run12345678");
    assert.deepEqual(submitted.postURLs, ["https://www.tiktok.com/@test/video/123"]);
    assert.equal(submitted.scrapeRelatedVideos, false);
  } finally { globalThis.fetch = original; }
});

test("result analyzes transcript, never caption as transcript", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes("/actor-runs/")) return Response.json({ data: { status: "SUCCEEDED", defaultDatasetId: "dataset123456" } });
    if (String(url).includes("/datasets/")) return Response.json([{ text: "Video caption", transcriptText: "Original spoken line", videoMeta: { duration: 20 } }]);
    throw Error("Unexpected fetch");
  };
  try {
    const response = await result({ request: req("/api/result", { runId: "run12345678", brief: { product: "Test product", facts: "Public label fact", language: "EN" } }), env });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.transcript, "Original spoken line");
    assert.equal(body.status, "done");
    assert.match(body.script, /待验证/);
  } finally { globalThis.fetch = original; }
});

test("no transcript fails clearly instead of fabricating", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes("/actor-runs/")) return Response.json({ data: { status: "SUCCEEDED", defaultDatasetId: "dataset123456" } });
    if (String(url).includes("/datasets/")) return Response.json([{ text: "Caption only", videoMeta: {} }]);
    throw Error("Unexpected fetch");
  };
  try {
    const response = await result({ request: req("/api/result", { runId: "run12345678", brief: { product: "Test product", facts: "Public label fact" } }), env });
    assert.equal(response.status, 422);
    assert.match((await response.json()).error, /没有可用口播/);
  } finally { globalThis.fetch = original; }
});

test("brief import extracts quoted candidates from a selected local text file", async () => {
  const form = new FormData();
  form.append("files", new File(["包装标示：每瓶 60 粒。"], "product.txt", { type: "text/plain" }));
  const request = new Request("https://example.pages.dev/api/brief-import", { method: "POST", headers: { "X-Workbench-Key": "test-password" }, body: form });
  const importEnv = { WORKBENCH_KEY: "test-password", AI: {
    toMarkdown: async () => { throw Error("Text files should be read directly"); },
    run: async () => ({ response: JSON.stringify({ candidates: [{ type: "fact", statement: "每瓶 60 粒", source_index: 0, quote: "每瓶 60 粒" }] }) })
  } };
  const response = await importBrief({ request, env: importEnv });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.candidates.length, 1);
  assert.equal(data.candidates[0].status, "待人工核对");
  assert.equal(data.candidates[0].source, "product.txt");
});

test("brief import converts images but discards unsupported quotes", async () => {
  const form = new FormData();
  form.append("files", new File([new Uint8Array([137, 80, 78, 71])], "package.png", { type: "image/png" }));
  const request = new Request("https://example.pages.dev/api/brief-import", { method: "POST", headers: { "X-Workbench-Key": "test-password" }, body: form });
  const importEnv = { WORKBENCH_KEY: "test-password", AI: {
    toMarkdown: async files => {
      assert.equal(files[0].name, "package.png");
      return [{ name: "package.png", format: "markdown", data: "包装上可见：60 粒。" }];
    },
    run: async () => ({ response: JSON.stringify({ candidates: [
      { type: "fact", statement: "60 粒", source_index: 0, quote: "包装上可见：60 粒。" },
      { type: "fact", statement: "治疗近视", source_index: 0, quote: "治疗近视" }
    ] }) })
  } };
  const response = await importBrief({ request, env: importEnv });
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data.candidates.map(x => x.statement), ["60 粒"]);
  assert.equal(data.candidates[0].sourceKind, "image");
  assert.equal(data.candidates[0].status, "图片识别·待核对原图");
});
