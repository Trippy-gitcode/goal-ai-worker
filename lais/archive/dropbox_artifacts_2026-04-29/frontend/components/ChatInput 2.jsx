// REWRITE-01: Chat input controller component
// Hooks into the existing #home-input-area HTML elements
// Manages send/stop toggle, auto-resize, keyboard, image, pre-routing
import { h } from 'preact';
import { useEffect, useRef, useCallback } from 'preact/hooks';
import { preRouteOnInput, hideRoutePreview } from '../js/chatRouting.js';

// Send icon SVG
const SEND_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text-on-accent)"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';
const STOP_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-on-accent)"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>';

/**
 * ChatInputController - manages input area behavior
 * @param {object} props
 * @param {function} props.onSend - Called with (text, imageData?) when user sends
 * @param {function} props.onStop - Called when user clicks stop
 * @param {boolean} props.loading - Whether a message is being sent/streamed
 * @param {number} props.messageCount - Number of messages (for placeholder toggle)
 */
export function ChatInputController({ onSend, onStop, loading, messageCount }) {
  const imageDataRef = useRef(null);

  // Auto-resize textarea
  const resize = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 110) + 'px';
    // Update send button state
    const btn = document.getElementById('home-send-btn');
    if (btn) btn.disabled = (!el.value.trim() && !imageDataRef.current);
  }, []);

  // Send/stop icon toggle
  useEffect(() => {
    const iconEl = document.getElementById('home-send-icon');
    const btn = document.getElementById('home-send-btn');
    if (!iconEl || !btn) return;

    if (loading) {
      btn.classList.add('sending');
      iconEl.style.opacity = '0';
      iconEl.style.transform = 'scale(0.85)';
      setTimeout(() => {
        iconEl.innerHTML = STOP_SVG;
        iconEl.style.opacity = '1';
        iconEl.style.transform = 'scale(1)';
      }, 100);
    } else {
      btn.classList.remove('sending');
      iconEl.style.opacity = '0';
      iconEl.style.transform = 'scale(0.85)';
      setTimeout(() => {
        iconEl.innerHTML = SEND_SVG;
        iconEl.style.opacity = '1';
        iconEl.style.transform = 'scale(1)';
      }, 100);
      btn.disabled = false;
    }
  }, [loading]);

  // Placeholder update based on message count
  useEffect(() => {
    const el = document.getElementById('home-msg-in');
    if (el) el.placeholder = messageCount > 0 ? '返信する' : '質問、相談、なんでも...';
  }, [messageCount]);

  // Wire up event handlers on mount
  useEffect(() => {
    const inp = document.getElementById('home-msg-in');
    const btn = document.getElementById('home-send-btn');
    const imgInput = document.getElementById('home-img-in');
    if (!inp || !btn) return;

    // Input handler: resize + pre-route
    const onInput = () => {
      resize(inp);
      preRouteOnInput(inp.value.trim());
    };

    // Keyboard handler: Enter to send, Shift+Enter for newline
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        doSend();
      }
    };

    // Paste handler for images
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) processImageFile(file);
          return;
        }
      }
    };

    // Click handler on send button
    const onBtnClick = (e) => {
      e.preventDefault();
      if (loading) { onStop(); } else { doSend(); }
    };

    // Image file change
    const onImgChange = () => {
      const file = imgInput?.files?.[0];
      if (file) { processImageFile(file); imgInput.value = ''; }
    };

    function doSend() {
      const text = inp.value.trim();
      if (!text && !imageDataRef.current) return;
      const img = imageDataRef.current;
      imageDataRef.current = null;
      clearImagePreview();
      inp.value = '';
      resize(inp);
      hideRoutePreview();
      onSend(text, img);
    }

    function processImageFile(file) {
      if (file.size > 5 * 1024 * 1024) {
        if (typeof window.toast === 'function') window.toast('画像サイズは5MB以下にしてください');
        return;
      }
      if (typeof window.compressImage === 'function') {
        window.compressImage(file, 1200).then(result => {
          imageDataRef.current = { base64: result.base64, type: result.type, name: result.name };
          showImagePreview(imageDataRef.current);
        });
      }
    }

    inp.addEventListener('input', onInput);
    inp.addEventListener('keydown', onKeyDown);
    inp.addEventListener('paste', onPaste);
    btn.addEventListener('click', onBtnClick);
    if (imgInput) imgInput.addEventListener('change', onImgChange);

    // Override the global onclick to use our handler
    btn.removeAttribute('onclick');
    inp.removeAttribute('oninput');
    inp.removeAttribute('onkeydown');
    inp.removeAttribute('onpaste');

    return () => {
      inp.removeEventListener('input', onInput);
      inp.removeEventListener('keydown', onKeyDown);
      inp.removeEventListener('paste', onPaste);
      btn.removeEventListener('click', onBtnClick);
      if (imgInput) imgInput.removeEventListener('change', onImgChange);
    };
  }, [loading, onSend, onStop, resize]);

  // Expose image data for external access
  useEffect(() => {
    window.homeImageData = imageDataRef.current;
    window.clearHomeImage = () => {
      imageDataRef.current = null;
      window.homeImageData = null;
      clearImagePreview();
    };
    window.showHomeImagePreview = () => {
      if (imageDataRef.current) showImagePreview(imageDataRef.current);
    };
  }, []);

  // This component doesn't render visible DOM — it controls existing HTML
  return null;
}

function showImagePreview(data) {
  const preview = document.getElementById('home-img-preview');
  if (!preview || !data) return;
  preview.style.display = 'block';
  const thumb = document.getElementById('home-img-thumb');
  const name = document.getElementById('home-img-name');
  if (thumb) { thumb.src = `data:${data.type};base64,${data.base64}`; thumb.style.height = '60px'; thumb.style.width = 'auto'; }
  if (name) name.textContent = data.name;
}

function clearImagePreview() {
  const preview = document.getElementById('home-img-preview');
  if (preview) preview.style.display = 'none';
  const imgInput = document.getElementById('home-img-in');
  if (imgInput) imgInput.value = '';
}
