// ════════ LOCATION SERVICES ════════
// 位置情報取得（オプトイン：ブラウザ標準の許可ダイアログ）
function requestLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ja`
        );
        const geo = await res.json();
        const city = geo.city || geo.locality || geo.principalSubdivision || '';
        const region = geo.principalSubdivision || '';
        window.USER_LOCATION = { lat: latitude, lng: longitude, city, region };
        document.cookie = `user_location=${encodeURIComponent(JSON.stringify(window.USER_LOCATION))}; max-age=86400; path=/; SameSite=Lax; Secure`;
      } catch (e) {
        window.USER_LOCATION = { lat: latitude, lng: longitude, city: '', region: '' };
      }
    },
    (err) => {
      window.USER_LOCATION = null;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 3600000 }
  );
}

// Cookie から復元を試行 → なければ新規取得
function initLocation() {
  const cookie = document.cookie.split('; ').find(c => c.startsWith('user_location='));
  if (cookie) {
    try {
      window.USER_LOCATION = JSON.parse(decodeURIComponent(cookie.split('=').slice(1).join('=')));
      return;
    } catch (e) { /* パース失敗 → 新規取得 */ }
  }
  requestLocation();
}
