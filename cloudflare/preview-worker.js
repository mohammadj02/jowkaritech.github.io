export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = new Set(["https://jowkaritech.com", "https://www.jowkaritech.com"]);
    const cors = {
      "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "https://jowkaritech.com",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store"
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (url.pathname === "/preview/start" && request.method === "POST") {
      if (!allowed.has(origin)) return json({ error: "origin_not_allowed" }, 403, cors);

      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const ipKey = "limit:" + await hmacHex(env.PREVIEW_SIGNING_SECRET, ip);
      const now = Date.now();
      const cooldownRaw = await env.PREVIEW_KV.get(ipKey);
      const nextAllowed = cooldownRaw ? Number(cooldownRaw) : 0;

      if (nextAllowed > now) {
        return json({
          error: "cooldown",
          retry_after_ms: nextAllowed - now,
          next_allowed_at: nextAllowed
        }, 429, cors);
      }

      let body;
      try { body = await request.json(); } catch { return json({ error: "invalid_json" }, 400, cors); }
      if (!body || typeof body.design !== "object") return json({ error: "missing_design" }, 400, cors);

      const raw = JSON.stringify(body.design);
      if (raw.length > 70000) return json({ error: "design_too_large" }, 413, cors);

      const id = crypto.randomUUID().replace(/-/g, "");
      const expiresAt = now + 30 * 60 * 1000;
      const nextAt = now + 3 * 60 * 60 * 1000;

      await Promise.all([
        env.PREVIEW_KV.put("preview:" + id, JSON.stringify({ design: body.design, expiresAt }), { expirationTtl: 1800 }),
        env.PREVIEW_KV.put(ipKey, String(nextAt), { expirationTtl: 10800 })
      ]);

      return json({
        ok: true,
        id,
        expires_at: expiresAt,
        next_allowed_at: nextAt,
        preview_url: "https://jowkaritech.com/jowkari-sites/?preview_id=" + id
      }, 200, cors);
    }

    if (url.pathname.startsWith("/preview/") && request.method === "GET") {
      const id = url.pathname.split("/").pop();
      if (!/^[a-f0-9]{32}$/i.test(id || "")) return json({ error: "invalid_id" }, 400, cors);

      const raw = await env.PREVIEW_KV.get("preview:" + id);
      if (!raw) return json({ error: "expired_or_missing" }, 410, cors);

      let record;
      try { record = JSON.parse(raw); } catch { return json({ error: "invalid_record" }, 500, cors); }
      if (!record.expiresAt || Date.now() >= record.expiresAt) {
        await env.PREVIEW_KV.delete("preview:" + id);
        return json({ error: "expired" }, 410, cors);
      }

      return json({ ok: true, design: record.design, expires_at: record.expiresAt }, 200, cors);
    }

    return json({ ok: true, service: "jowkari-preview" }, 200, cors);
  }
};

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" }
  });
}

async function hmacHex(secret, value) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
