export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");
  const pw = url.searchParams.get("pw");

  if (!pw || !env.ADMIN_RESET_PW || pw !== env.ADMIN_RESET_PW) {
    return json({ ok: false, reason: "wrong_password" });
  }
  if (!id || (action !== "approve" && action !== "reject")) {
    return json({ ok: false, reason: "invalid_params" });
  }

  try {
    if (action === "reject") {
      await env.CLICK_KV.delete(id);
      return json({ ok: true });
    }

    const raw = await env.CLICK_KV.get(id);
    if (!raw) return json({ ok: false, reason: "not_found" });
    const r = JSON.parse(raw);
    r.status = "approved";
    await env.CLICK_KV.put(id, JSON.stringify(r));
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
