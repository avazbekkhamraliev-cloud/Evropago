// functions/api/activate.js
// EuropaGo: token'ni birinchi ochgan qurilmaga "bog'lab" qo'yadi.
// Boshqa qurilmadan xuddi shu token bilan kirishga urinsa - rad etadi.
//
// KV binding: CLICK_KV (verify.js bilan bir xil, tasdiqlangan).

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();
  const device = (url.searchParams.get("device") || "").trim();

  // Token va device format tekshiruvi
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token) || !/^[a-zA-Z0-9_-]{4,80}$/.test(device)) {
    return json({ ok: false, reason: "invalid" }, 400);
  }

  const kv = env.CLICK_KV; // <-- kerak bo'lsa nomini almashtiring
  const key = "activated_" + token;

  try {
    const existing = await kv.get(key);

    if (existing === null) {
      // Birinchi marta ochilyapti - shu qurilmaga bog'laymiz (90 kun saqlanadi)
      await kv.put(key, device, { expirationTtl: 60 * 60 * 24 * 90 });
      return json({ ok: true, first: true });
    }

    if (existing === device) {
      // O'sha qurilma qayta ochyapti (localStorage tozalangan bo'lishi mumkin)
      return json({ ok: true, first: false });
    }

    // Boshqa qurilma - rad etamiz
    return json({ ok: false, reason: "used" }, 403);
  } catch (e) {
    return json({ ok: false, reason: "server_error" }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}
