// functions/api/reset-token.js
// Admin panel'dagi "Token tozalash" tugmasi shu yerga murojaat qiladi.
// Bir token boshqa qurilmaga noto'g'ri bog'lanib qolsa (masalan eski
// mijoz forward qilgan link bo'yicha), shu endpoint orqali bog'lanish
// o'chiriladi va token qayta "bo'sh" holatga qaytadi.
//
// MUHIM (xavfsizlik):
// 1) KV binding: CLICK_KV (verify.js va activate.js bilan bir xil).
// 2) Cloudflare Pages > Settings > Environment variables bo'limida
//    ADMIN_RESET_KEY nomli maxfiy o'zgaruvchi qo'shing (uzun, tasodifiy parol).
//    Bu parol saytning HTML/JS kodida HECH QAYERDA ko'rinmaydi — faqat siz
//    admin panelda "Token tozalash" bosganda qo'lda kiritasiz.
//    AP_HASH (saytdagi admin paroli) buning uchun ishlatilmaydi, chunki u
//    client kodida ko'rinadi va real himoya emas.

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();
  const pw = url.searchParams.get("pw") || "";

  if (!env.ADMIN_RESET_KEY || pw !== env.ADMIN_RESET_KEY) {
    return json({ ok: false, reason: "unauthorized" }, 401);
  }

  if (!/^[a-zA-Z0-9_-]{5,64}$/.test(token)) {
    return json({ ok: false, reason: "invalid_token" }, 400);
  }

  const kv = env.CLICK_KV; // <-- activate.js bilan bir xil binding nomi
  const key = "activated_" + token;

  try {
    await kv.delete(key);
    return json({ ok: true });
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
