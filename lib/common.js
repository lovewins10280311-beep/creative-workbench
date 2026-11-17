export function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function readBody(request) {
  const raw = await request.text();
  if (raw.length > 30000) throw new Error("请求内容过大");
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error("请求格式错误"); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("请求格式错误");
  return body;
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function authorized(request, env) {
  if (!env.WORKBENCH_KEY || !env.APIFY_TOKEN) return { error: "服务尚未配置：请在 Cloudflare 设置 WORKBENCH_KEY 与 APIFY_TOKEN。", status: 503 };
  const supplied = request.headers.get("x-workbench-key") || "";
  if (!supplied || supplied.length > 256) return { error: "请输入正确的访问口令。", status: 401 };
  const a = await digest(supplied), b = await digest(env.WORKBENCH_KEY);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? null : { error: "访问口令不正确。", status: 401 };
}

export function validTikTokUrl(input) {
  if (typeof input !== "string" || input.length > 500) return false;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password &&
      (url.hostname === "tiktok.com" || url.hostname.endsWith(".tiktok.com")) &&
      url.pathname.length > 1;
  } catch { return false; }
}

export async function apify(env, path, options = {}) {
  const response = await fetch("https://api.apify.com/v2/" + path, {
    ...options,
    headers: { "Authorization": "Bearer " + env.APIFY_TOKEN, ...(options.headers || {}) }
  });
  if (!response.ok) throw new Error("视频提取服务请求失败（HTTP " + response.status + "）。请检查 Apify 配置及额度。");
  return response.json();
}
