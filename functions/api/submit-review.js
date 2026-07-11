export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const name = (body.name || "").toString().slice(0, 200);
    const country = (body.country || "").toString().slice(0, 100);
    const stars = Math.max(1, Math.min(5, parseInt(body.stars) || 0));
    const text = (body.text || "").toString().slice(0, 2000);

    if (!name || !text || !stars) {
      return json({ ok: false, reason: "invalid_params" });
    }

    const id = "rv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const review = { id, name, country, stars, text, ts: Date.now(), status: "pending" };

    await env.CLICK_KV.put(id, JSON.stringify(review));

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, reason: "server_error" });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
