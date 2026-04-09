// ═══ GOAL AI — ES Module Entry Point ═══
// All files self-register on window. Import order matters for initialization.
import '../style.css';
import './globals.js';
import './location.js';
import './api.js';
import './profile.js';
import './ui.js';
import './chat.js';
import './goals.js';
import './app.js';
// ARCH-00: Preact bridge (hybrid with legacy Vanilla JS)
import '../components/preact-bridge.js';
