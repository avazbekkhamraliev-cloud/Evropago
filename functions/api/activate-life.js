export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const device = url.searchParams.get("device");

  if (!token || !device || token.length < 8) {
    return json({ ok: false, reason: "invalid_params" });
  }

  const key = "life_device_" + token;

  try {
    const existing = await env.CLICK_KV.get(key);

    if (!existing) {
      await env.CLICK_KV.put(key, device);
      return json({ ok: true });
    }

    if (existing === device) {
      return json({ ok: true });
    }

    return json({ ok: false, reason: "device_mismatch" });
  } catch (e) {
    return json({ ok: false, reason: "server_error" });
  }
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
