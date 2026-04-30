(function(){
  var m = document.cookie.match(/(?:^|; )font_size=([^;]*)/);
  if (!m) { m = document.cookie.match(/(?:^|; )goal_ai_fontsize=([^;]*)/); }
  var sizes = {xs:'14px',sm:'16px',md:'18px',lg:'20px'};
  var lh = {xs:'1.55',sm:'1.6',md:'1.65',lg:'1.7'};
  var sz = m ? decodeURIComponent(m[1]) : 'md';
  if (sizes[sz]) {
    document.documentElement.style.setProperty('--base-font-size', sizes[sz]);
    document.documentElement.style.setProperty('--base-line-height', lh[sz]);
  }
})();
