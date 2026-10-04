// Server-only scheduled worker. No API keys or provider tokens belong in Expo.
const url = Deno.env.get('SUPABASE_URL')!;
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const secret = Deno.env.get('TEMPO_PUSH_SECRET');
const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
async function rpc(name: string, body = {}) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Database RPC failed: ${response.status}`);
  const text = await response.text(); return text ? JSON.parse(text) : null;
}
async function expo(path: string, body: unknown) {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Push gateway failed: ${response.status}`);
  const result = await response.json(); if (result.errors?.length) throw new Error('Push gateway rejected the batch'); return result.data;
}
type Job = { id: string; token: string; shiftId: string; kind: string };
type Receipt = { status: string; id?: string; details?: { error?: string } };
Deno.serve(async request => {
  if (request.method !== 'POST' || !secret || request.headers.get('x-tempo-push-secret') !== secret) return new Response('Unauthorized', { status: 401 });
  try {
    const pending: { id: string; ticket: string }[] = await rpc('tempo_push_receipts');
    if (pending.length) {
      const receipts: Record<string, Receipt> = await expo('getReceipts', { ids: pending.map(item => item.ticket) });
      await rpc('tempo_finish_receipts', { p_results: pending.filter(item => receipts[item.ticket]).map(item => ({ id: item.id, error: receipts[item.ticket].status === 'ok' ? null : receipts[item.ticket].details?.error ?? 'DeliveryFailed' })) });
    }
    const jobs: Job[] = await rpc('tempo_claim_push');
    if (!jobs.length) return Response.json({ accepted: 0 });
    // Generic lock-screen copy protects attendance and location details.
    const tickets: Receipt[] = await expo('send', jobs.map(job => ({ to: job.token, title: 'Tempo', body: job.kind === 'task-completed' ? 'A task has been completed. Open Tempo to review it.' : 'Your schedule has an update. Open Tempo to see the details.', data: job.kind === 'task-completed' ? { kind: 'tempo-task-completed', taskId: job.shiftId.replace(/^task:/, '') } : { kind: 'tempo-shift-change' }, channelId: 'shift-reminders', sound: 'default', ttl: 3600 })));
    await rpc('tempo_finish_push', { p_results: jobs.map((job, i) => ({ id: job.id, ...(tickets[i]?.status === 'ok' && tickets[i]?.id ? { ticket: tickets[i].id } : { error: tickets[i]?.details?.error ?? 'SendFailed' }) })) });
    return Response.json({ accepted: tickets.filter(ticket => ticket.status === 'ok').length });
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Push worker failed');
    return new Response('Push worker failed; queued deliveries will retry.', { status: 503 });
  }
});
