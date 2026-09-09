/* =====================================================================
 * NextVision 共通スクリプト（全ページで読み込み）
 *  1) LINE「LINEで相談」フローティングボタン（右下固定）
 *  2) GA4 イベント送信: phone_click / line_click / form_submit
 *  3) 問い合わせフォームのエラーメッセージ表示（contact.php から戻った時）
 *
 * ★ LINE の友だち追加URLは、下の NV_LINE_URL の1行だけ書き換えれば
 *    全ページに反映されます。（例: https://lin.ee/9TGxdfG）
 * ===================================================================== */
(function () {
  'use strict';

  var NV_LINE_URL = 'https://lin.ee/9TGxdfG';   // ← ここを書き換える（1箇所だけ）
  var NV_TEL      = '07013192126';              // 電話ボタンの番号（ハイフンなし）
  var NV_TEL_DISP = '070-1319-2126';

  /* <html data-line-url="..."> があればそちらを優先（ページ単位で変えたい場合用） */
  var root = document.documentElement;
  var lineUrl = root.getAttribute('data-line-url') || NV_LINE_URL;
  var lineReady = /^https:\/\/(lin\.ee|line\.me)\//.test(lineUrl) && lineUrl.indexOf('XXXXXXX') === -1;

  /* ---------- GA4 ヘルパー ---------- */
  function track(name, params) {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, params || {});
      }
    } catch (e) { /* 計測失敗でサイトの動作を止めない */ }
  }

  /* ---------- 1) フローティングボタン ---------- */
  function buildFloat() {
    if (document.getElementById('nv-float')) return;

    var css = ''
      + '#nv-float{position:fixed;right:14px;bottom:18px;z-index:58;display:flex;flex-direction:column;align-items:flex-end;gap:10px;'
      + 'font-family:"Zen Maru Gothic","Hiragino Maru Gothic ProN","Yu Gothic",sans-serif}'
      + '#nv-float a{display:inline-flex;align-items:center;gap:8px;text-decoration:none;font-weight:700;border-radius:999px;'
      + 'box-shadow:0 8px 22px -8px rgb(0 0 0/.45);transition:transform .16s,box-shadow .16s;-webkit-tap-highlight-color:transparent}'
      + '#nv-float a:hover{transform:translateY(-2px);box-shadow:0 12px 26px -8px rgb(0 0 0/.5)}'
      + '#nv-float a:active{transform:translateY(1px)}'
      + '#nv-float .nv-line{background:#06C755;color:#fff;padding:10px 18px 10px 12px;font-size:15px;border:2.5px solid #fff}'
      + '#nv-float .nv-line svg{width:28px;height:28px;flex:none}'
      + '#nv-float .nv-tel{display:none;background:#F5A623;color:#3a2600;padding:10px 18px 10px 12px;font-size:15px;border:2.5px solid #fff}'
      + '#nv-float .nv-tel svg{width:24px;height:24px;flex:none}'
      + '#nv-float .nv-soon{position:absolute;right:0;bottom:calc(100% + 6px);white-space:nowrap;font-size:11px;background:#26576E;color:#fff;'
      + 'padding:4px 9px;border-radius:8px;opacity:0;pointer-events:none;transition:.16s}'
      + '#nv-float a[aria-disabled="true"]{opacity:.75;cursor:default;position:relative}'
      + '#nv-float a[aria-disabled="true"]:hover .nv-soon{opacity:1}'
      + '@media(max-width:820px){'
      + '#nv-float{right:12px;bottom:calc(14px + env(safe-area-inset-bottom));gap:8px}'
      + '#nv-float.has-bar{bottom:calc(76px + env(safe-area-inset-bottom))}'
      + '#nv-float a{width:56px;height:56px;padding:0!important;justify-content:center;border-radius:50%}'
      + '#nv-float a span.t{display:none}'
      + '#nv-float .nv-tel{display:inline-flex}'
      + '#nv-float .nv-line svg{width:30px;height:30px}'
      + '}';
    var style = document.createElement('style');
    style.setAttribute('data-nv', 'float');
    style.textContent = css;
    document.head.appendChild(style);

    var wrap = document.createElement('div');
    wrap.id = 'nv-float';
    wrap.setAttribute('data-line-url', lineUrl);
    if (document.querySelector('.mobile-cta')) wrap.className = 'has-bar';

    /* LINE ボタン */
    var line = document.createElement('a');
    line.className = 'nv-line';
    line.setAttribute('data-nv', 'line');
    line.setAttribute('aria-label', 'LINEで相談する');
    line.innerHTML =
      '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">'
      + '<path fill="#fff" d="M20 6C11.7 6 5 11.5 5 18.3c0 6.1 5.4 11.2 12.7 12.1.5.1 1.2.3 1.3.8.1.4.1 1.1 0 1.5l-.2 1.3c-.1.4-.3 1.5 1.3.8 1.6-.7 8.8-5.2 12-8.9C34.4 23.5 35 21 35 18.3 35 11.5 28.3 6 20 6z"/>'
      + '<path fill="#06C755" d="M14.2 15.4h-1.3c-.2 0-.4.2-.4.4v6.1c0 .2.2.4.4.4h1.3c.2 0 .4-.2.4-.4v-6.1c0-.2-.2-.4-.4-.4zm7.1 0H20c-.2 0-.4.2-.4.4v3.6l-2.8-3.8-.1-.1H15.4c-.2 0-.4.2-.4.4v6.1c0 .2.2.4.4.4h1.3c.2 0 .4-.2.4-.4v-3.6l2.8 3.8.1.1h1.3c.2 0 .4-.2.4-.4v-6.1c0-.2-.2-.4-.4-.4zm-11 5.1h-2.6v-4.7c0-.2-.2-.4-.4-.4H6c-.2 0-.4.2-.4.4v6.1c0 .2.2.4.4.4h4.3c.2 0 .4-.2.4-.4v-1c0-.2-.2-.4-.4-.4zm19.6-3.6c.2 0 .4-.2.4-.4v-1.1c0-.2-.2-.4-.4-.4h-4.3c-.2 0-.4.2-.4.4v6.1c0 .2.2.4.4.4h4.3c.2 0 .4-.2.4-.4v-1c0-.2-.2-.4-.4-.4h-2.6v-1h2.6c.2 0 .4-.2.4-.4v-1c0-.2-.2-.4-.4-.4h-2.6v-1h2.6z"/>'
      + '</svg><span class="t">LINEで相談</span>';
    if (lineReady) {
      line.href = lineUrl;
      line.target = '_blank';
      line.rel = 'noopener';
    } else {
      /* URL 未設定のうちはリンクを無効化（プレースホルダのまま公開されても誤リンクしない） */
      line.href = '#contact';
      line.setAttribute('aria-disabled', 'true');
      line.innerHTML += '<span class="nv-soon">LINE相談 準備中（フォーム・お電話へ）</span>';
      line.addEventListener('click', function (ev) {
        if (!document.getElementById('contact')) { ev.preventDefault(); location.href = 'index.html#contact'; }
      });
    }
    wrap.appendChild(line);

    /* 電話ボタン（スマホのみ表示・LINEの下に2段目） */
    var tel = document.createElement('a');
    tel.className = 'nv-tel';
    tel.href = 'tel:' + NV_TEL;
    tel.setAttribute('aria-label', '電話で相談する ' + NV_TEL_DISP);
    tel.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
      + '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/>'
      + '</svg><span class="t">電話で相談</span>';
    wrap.appendChild(tel);

    document.body.appendChild(wrap);
  }

  /* ---------- 2) GA4 イベント（クリック・送信） ---------- */
  function bindEvents() {
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) {
        track('phone_click', { link_url: href, link_text: (a.textContent || '').trim().slice(0, 40), page_path: location.pathname });
      } else if (a.getAttribute('data-nv') === 'line') {
        track('line_click', { link_url: href, page_path: location.pathname });
      }
    }, true);

    // 動画の再生（初回のみ）を計測
    document.addEventListener('play', function (ev) {
      var v = ev.target;
      if (!v || v.tagName !== 'VIDEO' || v.hasAttribute('autoplay') || v.__nvTracked) return;
      v.__nvTracked = true;
      var src = v.currentSrc || (v.querySelector('source') || {}).src || '';
      track('video_play', { video_title: v.getAttribute('aria-label') || '', video_url: src, page_path: location.pathname });
    }, true);

    var form = document.getElementById('inquiry');
    if (form) {
      form.addEventListener('submit', function () {
        var p = form.querySelector('input[name="purpose"]:checked');
        var c = form.querySelector('[name="content"]');
        track('form_submit', {
          form_id: 'inquiry',
          purpose: p ? p.value : '',
          content: c ? c.value : '',
          page_path: location.pathname
        });
        var btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
      });
    }
  }

  /* ---------- 3) contact.php からのエラー戻り表示 ---------- */
  function showFormError() {
    var box = document.getElementById('form-error');
    if (!box) return;
    var q = new URLSearchParams(location.search);
    var msg = q.get('error');
    if (!msg) return;
    box.textContent = msg;
    box.hidden = false;
    /* 入力済みの値を復元（contact.php が返してきた分） */
    var form = document.getElementById('inquiry');
    if (form) {
      ['company', 'name', 'email', 'content', 'message'].forEach(function (k) {
        var v = q.get(k); var el = form.querySelector('[name="' + k + '"]');
        if (v !== null && el) el.value = v;
      });
      ['purpose', 'plan'].forEach(function (k) {
        var v = q.get(k); if (v === null) return;
        var r = form.querySelector('input[name="' + k + '"][value="' + v.replace(/"/g, '') + '"]');
        if (r) r.checked = true;
      });
    }
    if (location.hash !== '#contact') { try { location.hash = '#contact'; } catch (e) {} }
  }

  /* ページ内の「LINEで相談する」ボタン（index.html の CONTACT など）も同じURLに揃える */
  function syncInlineLineLinks() {
    var links = document.querySelectorAll('a[data-nv="line"]:not(.nv-line)');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (lineReady) {
        a.href = lineUrl; a.target = '_blank'; a.rel = 'noopener';
      } else {
        a.href = 'tel:' + NV_TEL; a.removeAttribute('target');
        a.setAttribute('aria-disabled', 'true');
        a.title = 'LINE相談は準備中です。お電話またはフォームをご利用ください。';
      }
    }
  }

  function init() { buildFloat(); syncInlineLineLinks(); bindEvents(); showFormError(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
