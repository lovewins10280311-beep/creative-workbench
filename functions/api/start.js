import { apify, authorized, json, readBody, validTikTokUrl } from "../../lib/common.js";

async function resolveShortLink(original) {
  let current = original;
  for (let attempt = 0; attempt < 3; attempt++) {
    const host = new URL(current).hostname;
    if (host !== "vt.tiktok.com" && host !== "vm.tiktok.com") return current;
    try {
      const response = await fetch(current, { method: "GET", redirect: "manual" });
      const location = response.headers.get("location");
      if (!location) return current;
      const next = new URL(location, current).href;
      if (!validTikTokUrl(next)) return current;
      current = next;
    } catch { return current; }
  }
  return current;
}

export async function onRequestPost({ request, env }) {
  const auth = await authorized(request, env);
  if (auth) return json({ error: auth.error }, auth.status);
  if (!env.AI) return json({ error: "尚未配置 Cloudflare Workers AI 绑定 AI；任务未启动，也不会产生视频提取费用。" }, 503);
  try {
    const body = await readBody(request);
    if (!validTikTokUrl(body.url)) return json({ error: "请提供一条 HTTPS TikTok 视频链接。" }, 400);
    const resolvedUrl = await resolveShortLink(body.url);
    const run = await apify(env, "acts/clockworks~tiktok-video-scraper/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postURLs: [resolvedUrl],
        scrapeRelatedVideos: false,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSlideshowImages: false,
        downloadSubtitlesOptions: "DOWNLOAD_AND_TRANSCRIBE_VIDEOS_WITHOUT_SUBTITLES"
      })
    });
    if (!run?.data?.id) throw new Error("视频提取服务没有返回任务编号。");
    return json({ runId: run.data.id, status: "processing" });
  } catch (error) {
    return json({ error: error.message || "启动任务失败。" }, 502);
  }
}
