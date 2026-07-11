export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pw = url.searchParams.get("pw");

  try {
    const list = await env.CLICK_KV.list({ prefix: "rv_" });
    const reviews = [];

    for (const k of list.keys) {
      const raw = await env.CLICK_KV.get(k.name);
      if (!raw) continue;
      let r;
      try { r = JSON.parse(raw); } catch (e) { continue; }
      reviews.push(r);
    }

    reviews.sort((a, b) => (b.ts || 0) - (a.ts || 0));

    if (pw && env.ADMIN_RESET_PW && pw === env.ADMIN_RESET_PW) {
      return json({ ok: true, reviews: reviews.filter(r => r.status === "pending") });
    }

    return json({ ok: true, reviews: reviews.filter(r => r.status === "approved") });
  } catch (e) {
    return json({ ok: false, reason: "server_error" });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
