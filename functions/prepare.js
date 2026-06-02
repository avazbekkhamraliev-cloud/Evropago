// Click PREPARE so'rovi (action=0)
import { md5, parseClickBody, jsonResponse } from './_click.js';

export async function onRequestPost({ request, env }) {
  const p = await parseClickBody(request);

  const SECRET_KEY = env.CLICK_SECRET_KEY;
  const SERVICE_ID = env.CLICK_SERVICE_ID;

  const click_trans_id = p.click_trans_id;
  const service_id = p.service_id;
  const merchant_trans_id = p.merchant_trans_id;
  const amount = p.amount;
  const action = p.action;
  const sign_time = p.sign_time;
  const sign_string = p.sign_string;

  const mySign = md5(
    '' + click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time
  );
  if (mySign !== sign_string) {
    return jsonResponse({ error: -1, error_note: 'SIGN CHECK FAILED!' });
  }

  if (String(action) !== '0') {
    return jsonResponse({ error: -3, error_note: 'Action not found' });
  }

  const EXPECTED_AMOUNT = 14900;
  if (Math.round(parseFloat(amount)) !== EXPECTED_AMOUNT) {
    return jsonResponse({ error: -2, error_note: 'Incorrect parameter amount' });
  }

  if (!merchant_trans_id) {
    return jsonResponse({ error: -5, error_note: 'User does not exist' });
  }

  const prepareId = Date.now();
  const record = {
    status: 'preparing',
    click_trans_id,
    merchant_trans_id,
    amount,
    prepare_id: prepareId,
    created: new Date().toISOString()
  };
  await env.CLICK_KV.put('order:' + merchant_trans_id, JSON.stringify(record), {
    expirationTtl: 86400
  });

  return jsonResponse({
    error: 0,
    error_note: 'Success',
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id: prepareId
  });
}
