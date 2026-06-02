// Sayt to'lovni tekshiradi: GET /api/verify?order=<orderId>
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order');

  const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (!orderId) {
    return new Response(JSON.stringify({ paid: false, error: 'no order' }), { headers: cors });
  }

  const raw = await env.CLICK_KV.get('order:' + orderId);
  if (!raw) {
    return new Response(JSON.stringify({ paid: false }), { headers: cors });
  }

  const record = JSON.parse(raw);
  const paid = record.status === 'paid';

  return new Response(JSON.stringify({ paid: paid, status: record.status }), { headers: cors });
}
