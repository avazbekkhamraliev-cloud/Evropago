// functions/api/activate.js
// EuropaGo: token'ni qurilma(lar)ga "bog'lab" qo'yadi.
//
// MUAMMO TARIXI:
// v1 (eng birinchi): faqat 1 ta qurilma ID saqlar edi + 90 kunlik TTL.
//   -> Xotira (localStorage/cookie) Safari yoki Telegram/Instagram ichki
//      brauzeri tomonidan tozalanib ketsa (bu "ITP" degan brauzer siyosati
//      tufayli tez-tez sodir bo'ladi), yangi tasodifiy qurilma ID yaratiladi,
//      va halol mijoz "boshqa qurilma" deb noto'g'ri bloklanardi.
// v2: 3 tagacha qurilma ID ro'yxatini saqlashga o'tkazildi + TTL olib tashlandi.
//   -> Bu ko'p holatlarni tuzatdi, lekin "necha marta ruxsat berish" bilan
//      "ulashishni qanday aniqlash" savoli hali ham aniq yechilmagan edi.
// v3 (SHU FAYL): vaqt NAQSHIGA qarab ajratadi.
//   Asosiy fikr: haqiqiy YAKKA mijozning qurilma ID'si OYLAR davomida,
//   KAMDAN-KAM (xotira tozalanganda) o'zgaradi. Token boshqalarga ulashilsa
//   esa, ko'p kishi QISQA VAQT ICHIDA (soatlar/kunlar ichida) birinchi marta
//   faollashtira boshlaydi. Shu farqdan foydalanamiz:
//     - Yangi qurilma SEKIN-ASTA (oxirgi yangi qurilmadan RECENT_WINDOW dan
//       KO'P vaqt o'tib) paydo bo'lsa -> ruxsat (haqiqiy mijoz ehtimoli yuqori)
//     - Yangi qurilmalar QISQA VAQT ICHIDA ketma-ket kelsa -> rad etiladi
//       (bir nechta odam bir vaqtning atrofida ishlatayotganini bildiradi)
//     - Umuman qanday bo'lmasin, HARD_CAP dan oshib ketilsa -> baribir rad etiladi
//
// KV binding: CLICK_KV (verify.js bilan bir xil, tasdiqlangan).

const RECENT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 soat — "shubhali tezlik" oynasi
const MAX_NEW_IN_WINDOW = 1; // shu oyna ichida FAQAT 1 ta yangi qurilmaga ruxsat
const HARD_CAP = 8; // umuman, tokenning butun umri davomida qat'iy yuqori chegara

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = (url.searchParams.get("token") || "").trim();
  const device = (url.searchParams.get("device") || "").trim();

  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token) || !/^[a-zA-Z0-9_-]{4,80}$/.test(device)) {
    return json({ ok: false, reason: "invalid" }, 400);
  }

  const kv = env.CLICK_KV; // <-- kerak bo'lsa nomini almashtiring
  const key = "activated_" + token;
  const now = Date.now();

  try {
    const existingRaw = await kv.get(key);
    let devices = []; // [{id, ts}, ...]

    if (existingRaw) {
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) {
          devices = parsed.map(function (d) {
            return typeof d === "string" ? { id: d, ts: 0 } : d;
          });
        } else {
          devices = [{ id: String(existingRaw), ts: 0 }];
        }
      } catch (e) {
        devices = [{ id: existingRaw, ts: 0 }];
      }
    }

    var found = devices.find(function (d) { return d.id === device; });
    if (found) {
      found.ts = now;
      await kv.put(key, JSON.stringify(devices));
      return json({ ok: true, first: devices.length === 1 });
    }

    if (devices.length === 0) {
      devices.push({ id: device, ts: now });
      await kv.put(key, JSON.stringify(devices));
      return json({ ok: true, first: true });
    }

    if (devices.length >= HARD_CAP) {
      return json({ ok: false, reason: "used" }, 403);
    }

    var recentNewCount = devices.filter(function (d) {
      return (now - d.ts) < RECENT_WINDOW_MS;
    }).length;

    if (recentNewCount >= MAX_NEW_IN_WINDOW) {
      return json({ ok: false, reason: "used" }, 403);
    }

    devices.push({ id: device, ts: now });
    await kv.put(key, JSON.stringify(devices));
    return json({ ok: true, first: false });
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
