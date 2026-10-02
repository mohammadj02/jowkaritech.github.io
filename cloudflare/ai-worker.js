const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const ALLOWED_ORIGINS = new Set([
  "https://jowkaritech.com",
  "https://www.jowkaritech.com"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return json({ error: "origin_not_allowed" }, 403, origin);
      }
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json({
        ok: true,
        service: "jowkari-ai",
        model: MODEL,
        ai_binding: Boolean(env.AI)
      }, 200, origin);
    }

    if (url.pathname !== "/chat" || request.method !== "POST") {
      return json({ error: "not_found" }, 404, origin);
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, origin);
    }

    if (!env.AI) {
      return json({ error: "ai_binding_missing" }, 503, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid_json" }, 400, origin);
    }

    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "message_required" }, 400, origin);
    if (message.length > 1500) return json({ error: "message_too_long" }, 413, origin);

    const history = Array.isArray(body?.history)
      ? body.history
          .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-8)
          .map(m => ({ role: m.role, content: m.content.slice(0, 1500) }))
      : [];

    const system = [
      "You are the JowkariTech website assistant.",
      "Be concise, friendly, and practical.",
      "Explain JowkariTech website design and optional AI chatbot services.",
      "Current launch pricing shown on the website: Starter C$99, Business C$179, Pro + AI C$299.",
      "Visitors can design a website preview for free before deciding whether to buy.",
      "Do not invent guarantees, customer counts, testimonials, availability, or business facts that are not provided.",
      "For a quote or exact business-specific requirement, direct the visitor to JowkariTech."
    ].join(" ");

    const messages = [
      { role: "system", content: system },
      ...history,
      { role: "user", content: message }
    ];

    try {
      const result = await env.AI.run(MODEL, {
        messages,
        max_tokens: 350,
        temperature: 0.4
      });

      const reply = typeof result?.response === "string" ? result.response.trim() : "";
      if (!reply) return json({ error: "empty_model_response" }, 502, origin);

      return json({ ok: true, reply }, 200, origin);
    } catch (error) {
      console.error("Workers AI error", error);
      return json({ error: "ai_request_failed" }, 502, origin);
    }
  }
};

function cors(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://jowkaritech.com";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Vary": "Origin",
    "Cache-Control": "no-store"
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...cors(origin),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
