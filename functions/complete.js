// Click COMPLETE so'rovi (action=1)
import { md5, parseClickBody, jsonResponse } from './_click.js';

export async function onRequestPost({ request, env }) {
  const p = await parseClickBody(request);

  const SECRET_KEY = env.CLICK_SECRET_KEY;

  const click_trans_id = p.click_trans_id;
  const service_id = p.service_id;
  const merchant_trans_id = p.merchant_trans_id;
  const merchant_prepare_id = p.merchant_prepare_id;
  const amount = p.amount;
  const action = p.action;
  const error = p.error;
  const sign_time = p.sign_time;
  const sign_string = p.sign_string;

  const mySign = md5(
    '' + click_trans_id + service_id + SECRET_KEY + merchant_trans_id +
    merchant_prepare_id + amount + action + sign_time
  );
  if (mySign !== sign_string) {
    return jsonResponse({ error: -1, error_note: 'SIGN CHECK FAILED!' });
  }

  if (String(action) !== '1') {
    return jsonResponse({ error: -3, error_note: 'Action not found' });
  }

  const raw = await env.CLICK_KV.get('order:' + merchant_trans_id);
  if (!raw) {
    return jsonResponse({ error: -6, error_note: 'Transaction does not exist' });
  }
  const record = JSON.parse(raw);

  if (String(record.prepare_id) !== String(merchant_prepare_id)) {
    return jsonResponse({ error: -6, error_note: 'Transaction does not exist' });
  }

  if (record.status === 'paid') {
    return jsonResponse({ error: -4, error_note: 'Already paid' });
  }
  if (record.status === 'cancelled') {
    return jsonResponse({ error: -9, error_note: 'Transaction cancelled' });
  }

  if (String(error) !== '0' && parseInt(error) < 0) {
    record.status = 'cancelled';
    await env.CLICK_KV.put('order:' + merchant_trans_id, JSON.stringify(record), { expirationTtl: 86400 });
    return jsonResponse({ error: -9, error_note: 'Transaction cancelled' });
  }

  record.status = 'paid';
  record.paid_at = new Date().toISOString();
  record.click_trans_id = click_trans_id;
  await env.CLICK_KV.put('order:' + merchant_trans_id, JSON.stringify(record), {
    expirationTtl: 31536000
  });

  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      chat_id: "7180211852",
      text: "✅ Yangi to'lov!\nSumma: " + amount + " so'm\nOrder: " + merchant_trans_id
    })
  });

  return jsonResponse({
    error: 0,
    error_note: 'Success',
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id: record.prepare_id
  });
    }
