// WCAG contrast ratio calculator
function srgbToLinear(c) {
  c = c / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
function contrast(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
function blend(fg, bg, alpha) {
  const parse = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  };
  const [r1,g1,b1] = parse(fg);
  const [r2,g2,b2] = parse(bg);
  const r = Math.round(r1*alpha + r2*(1-alpha));
  const g = Math.round(g1*alpha + g2*(1-alpha));
  const b = Math.round(b1*alpha + b2*(1-alpha));
  return '#' + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

const themes = {
  'night-sky':     { bg: '#0D1117', surface: '#161B22', danger: '#F85149', dangerAlpha: 0.08, textPrimary: '#E6EDF3' },
  'dawn':          { bg: '#FBF8F4', surface: '#F4EFE8', danger: '#B32121', dangerAlpha: 0.10, textPrimary: '#2B2319' },
  'harajuku-light':{ bg: '#FFF5F7', surface: '#FFEDF0', danger: '#C01C4A', dangerAlpha: 0.10, textPrimary: '#3B1F2A' },
  'harajuku-dark': { bg: '#1A0D14', surface: '#241219', danger: '#FF5577', dangerAlpha: 0.12, textPrimary: '#F5E8EE' },
};

console.log('Theme             | --danger on --bg-primary | --danger on --danger-subtle (over bg-primary) | --text-primary on --danger-subtle');
console.log('---'.repeat(40));
for (const [name, t] of Object.entries(themes)) {
  const dangerOnBg = contrast(t.danger, t.bg).toFixed(2);
  const blended = blend(t.danger, t.bg, t.dangerAlpha);
  const dangerOnSubtle = contrast(t.danger, blended).toFixed(2);
  const textOnSubtle = contrast(t.textPrimary, blended).toFixed(2);
  console.log(`${name.padEnd(16)}  | ${dangerOnBg}:1 (${dangerOnBg>=4.5?'PASS':'FAIL'})${'      '.slice(0,12-dangerOnBg.length)} | ${dangerOnSubtle}:1 (${dangerOnSubtle>=4.5?'PASS':'FAIL'})                             | ${textOnSubtle}:1 (${textOnSubtle>=4.5?'PASS':'FAIL'})`);
}
