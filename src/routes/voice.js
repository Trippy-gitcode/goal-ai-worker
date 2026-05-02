import { authenticateRequest } from '../middleware/auth.js';
import { jsonRes, generateId } from '../utils/helpers.js';
import { checkRateLimit } from '../utils/rate-limit.js';
// SUBAGENT-LAIS-INPUTGUARD-9ROUTES-V1 (2026-05-02、 Round 31 P4 #39 fix):
//   voice transcribe は base64-encoded audio を JSON body で受領、 audio binary 自体は別 endpoint。
//   base64 エンコード済 audio 想定で 256 KB cap (raw audio ≒ 192 KB、 短い音声 transcription 用途)。
import { parseBodyGuarded } from '../middleware/input-guard.js';

export async function handleVoiceTranscribe(request, env) {
  const auth = await authenticateRequest(request, env);
  if (!auth.ok) return jsonRes({ error: auth.error }, auth.status);
  const rl = await checkRateLimit(env, auth.userId);
  if (!rl.ok) return jsonRes({ error: 'Rate limit exceeded' }, 429);
  const _g = await parseBodyGuarded(request, { maxBytes: 256 * 1024 });
  if (!_g.ok) return jsonRes({ error: _g.error }, _g.status);
  const body = _g.body;
  const { audio, mimeType } = body;
  if (!audio) return jsonRes({ error: 'audio (base64) is required' }, 400);
  const binaryStr = atob(audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const ext = (mimeType || 'audio/webm').includes('mp4') ? 'mp4' : (mimeType || 'audio/webm').includes('ogg') ? 'ogg' : 'webm';
  const boundary = '----FormBoundary' + generateId(16);
  const formParts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${ext}"\r\nContent-Type: ${mimeType || 'audio/webm'}\r\n\r\n`,
    bytes,
    `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1`,
    `\r\n--${boundary}--\r\n`,
  ];
  const encoder = new TextEncoder();
  const parts = [encoder.encode(formParts[0]), formParts[1], encoder.encode(formParts[2]), encoder.encode(formParts[3]), encoder.encode(formParts[4])];
  const totalLen = parts.reduce((sum, p) => sum + p.byteLength, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  for (const p of parts) { combined.set(new Uint8Array(p.buffer || p), offset); offset += p.byteLength; }
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: combined,
  });
  const data = await res.json();
  if (!res.ok) return jsonRes({ error: data.error?.message || 'Whisper API error' }, res.status);
  return jsonRes({ text: data.text || '' });
}
