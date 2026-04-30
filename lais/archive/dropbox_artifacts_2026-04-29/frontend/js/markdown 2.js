// REWRITE-01: Shared markdown rendering (extracted from chat.js)
// Used by Talk.jsx, ChatMessage.jsx, GoalHub, and other chat screens

export function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderMsgContent(text) {
  if (!text) return '';
  // Extract code blocks first
  const codeBlocks = [];
  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (m, lang, code) => {
    codeBlocks.push(code);
    return `%%CODE_${codeBlocks.length - 1}%%`;
  });
  // Strip JSON blocks
  html = html.replace(/```json[\s\S]*?```/g, '');
  // Sanitize HTML
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Restore code blocks (already sanitized)
  codeBlocks.forEach((code, i) => {
    const safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    html = html.replace(`%%CODE_${i}%%`, `<pre style="background:var(--bg2);padding:10px 12px;border-radius:8px;overflow-x:auto;font-family:var(--fm);font-size:12px;margin:8px 0;white-space:pre-wrap;"><code>${safeCode}</code></pre>`);
  });
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:var(--bg2);padding:1px 5px;border-radius:4px;font-family:var(--fm);font-size:12px;">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Lists
  html = html.replace(/^[-•]\s+(.+)$/gm, '<div style="padding-left:16px;position:relative;"><span style="position:absolute;left:4px;">•</span>$1</div>');
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="padding-left:20px;position:relative;"><span style="position:absolute;left:0;color:var(--amber);font-weight:500;">$1.</span>$2</div>');
  // URLs
  html = html.replace(/(https?:\/\/[^\s&lt;]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--amber);text-decoration:underline;">$1</a>');
  // Paragraphs
  const parts = html.split(/\n{2,}/);
  if (parts.length > 1) {
    html = parts.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  } else {
    html = html.replace(/\n/g, '<br>');
  }
  return html;
}

// Backward compat: expose to window for legacy code
window.renderMsgContent = renderMsgContent;
window.escapeHtml = escapeHtml;
