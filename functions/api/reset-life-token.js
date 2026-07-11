export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const pw = url.searchParams.get("pw");

  if (!pw || !env.ADMIN_RESET_PW || pw !== env.ADMIN_RESET_PW) {
    return json({ ok: false, reason: "wrong_password" });
  }
  if (!token) {
    return json({ ok: false, reason: "no_token" });
  }

  try {
    await env.CLICK_KV.delete("life_device_" + token);
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
