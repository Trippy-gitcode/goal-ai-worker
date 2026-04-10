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
// ARCH-01: Preact bridge must load BEFORE app.js which calls init()→goPage('today')
import '../components/preact-bridge.js';
import './app.js';
