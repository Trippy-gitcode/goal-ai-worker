// REWRITE-01: Individual chat message component
import { h } from 'preact';
import { useRef, useEffect, useCallback } from 'preact/hooks';
import { renderMsgContent } from '../js/markdown.js';

// SVG icons for action buttons
const SVG_COPY = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
const SVG_QUOTE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2H5c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.76-2.02-2-2h-3c-1.25 0-2 .75-2 2v6c0 1.25.75 2 2 2h2c0 4-3 5-6 5z"/></svg>';
const SVG_EDIT = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';

function actionsHtml(role) {
  let html = `<span class="msg-actions"><button class="msg-action-btn" title="コピー" onclick="copyMessage(this)">${SVG_COPY}</button><button class="msg-action-btn" title="引用" onclick="quoteMessage(this)">${SVG_QUOTE}</button>`;
  if (role === 'user') html += `<button class="msg-action-btn" title="編集して再送信" onclick="editAndResend(this)">${SVG_EDIT}</button>`;
  html += '</span>';
  return html;
}

/** Date separator */
export function DateSeparator({ date }) {
  return h('div', {
    style: 'text-align:center;padding:16px 0 8px;color:var(--muted);font-size:11px;letter-spacing:0.5px;'
  }, date);
}

/** Streaming placeholder — empty div that api.js mkStreamBubble will attach to */
export function StreamingPlaceholder({ containerRef }) {
  return h('div', { ref: containerRef, class: 'streaming-mount' });
}

/** Single chat message */
export function ChatMessage({ msg, isLast }) {
  const wrapRef = useRef(null);
  const longTapTimerRef = useRef(null);
  const goalTapTimerRef = useRef(null);

  // Empty messages should not render
  if (!msg.content || (typeof msg.content === 'string' && msg.content.trim() === '')) return null;
  if (msg.role === '_sep') {
    return h('div', { style: 'border-top:1px solid var(--border);margin:16px 0;' });
  }

  const isUser = msg.role === 'user';
  const isAI = msg.role === 'ai';

  // Avatar
  const avatarHtml = isAI
    ? (typeof window.getLogoSVG === 'function' ? window.getLogoSVG(14) : '')
    : (typeof window.renderUserAvatarInner === 'function' ? getUserAvatarHtml() : '');

  // Footer
  const footerHtml = isAI
    ? `<span class="msg-time">${msg.time || ''}</span>&nbsp;&nbsp;<span class="msg-model">${msg.model || 'Claude'}</span>${actionsHtml('ai')}`
    : `<span class="msg-time">${msg.time || ''}</span>${actionsHtml('user')}`;

  // Error style
  const bubbleStyle = msg.error ? 'color:var(--red)' : '';

  // Mobile long-press for actions visibility
  const onTouchStart = useCallback(() => {
    longTapTimerRef.current = setTimeout(() => {
      if (wrapRef.current) wrapRef.current.classList.add('msg-actions-visible');
    }, 300);
  }, []);
  const onTouchEnd = useCallback(() => { clearTimeout(longTapTimerRef.current); }, []);
  const onTouchMove = useCallback(() => { clearTimeout(longTapTimerRef.current); }, []);

  // Long-tap goal detection for AI messages
  useEffect(() => {
    if (!isAI || !wrapRef.current) return;
    const bub = wrapRef.current.querySelector('.bubble');
    if (!bub) return;
    const onStart = () => {
      goalTapTimerRef.current = setTimeout(() => {
        if (typeof window.quickGoalFromText === 'function') window.quickGoalFromText(msg.content);
      }, 600);
    };
    const onEnd = () => clearTimeout(goalTapTimerRef.current);
    bub.addEventListener('touchstart', onStart, { passive: true });
    bub.addEventListener('touchend', onEnd, { passive: true });
    bub.addEventListener('touchmove', onEnd, { passive: true });
    return () => {
      bub.removeEventListener('touchstart', onStart);
      bub.removeEventListener('touchend', onEnd);
      bub.removeEventListener('touchmove', onEnd);
    };
  }, [isAI, msg.content]);

  return h('div', {
    ref: wrapRef,
    class: `msg ${msg.role}`,
    style: 'margin-bottom:16px;position:relative;',
    onTouchStart, onTouchEnd, onTouchMove
  },
    // Avatar
    h('div', {
      class: `msg-av ${msg.role}`,
      dangerouslySetInnerHTML: { __html: avatarHtml }
    }),
    // Body
    h('div', { class: 'msg-body' },
      // Image (if user sent one)
      msg.img ? h('img', {
        class: 'msg-img',
        src: `data:${msg.imgType || 'image/jpeg'};base64,${msg.img}`
      }) : null,
      // Bubble
      h('div', {
        class: 'bubble',
        style: bubbleStyle,
        dangerouslySetInnerHTML: { __html: renderMsgContent(msg.content) }
      }),
      // Footer
      h('div', {
        class: 'msg-footer',
        dangerouslySetInnerHTML: { __html: footerHtml }
      })
    )
  );
}

// Helper: get user avatar as HTML string
function getUserAvatarHtml() {
  if (typeof window.USER_PROFILE === 'undefined') return '';
  const p = window.USER_PROFILE;
  if (p.avatar_base64) {
    return `<img src="${p.avatar_base64}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  }
  const n = p.nickname || p.name || '';
  if (n) return n.charAt(0);
  return '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>';
}
