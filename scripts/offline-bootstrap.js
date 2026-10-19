// Runs before the bundled game, including in file/content viewers.
(function () {
  if (typeof globalThis === 'undefined') window.globalThis = window;
  if (!Object.hasOwn) Object.hasOwn = function (object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  };
  // This bundle clones JSON-only profile records, not arbitrary browser objects.
  if (!window.structuredClone) window.structuredClone = function (value) {
    return JSON.parse(JSON.stringify(value));
  };
  // Reuse the single embedded CSS image for the browser tab too.
  var icon = getComputedStyle(document.documentElement).getPropertyValue('--qqu-icon').trim();
  if (icon.indexOf('url(') === 0) {
    var link = document.createElement('link');
    link.rel = 'icon';
    link.href = icon.slice(4, -1).replace(/^["']|["']$/g, '');
    document.head.appendChild(link);
  }
  var failed = false;
  function status(message, error) {
    var element = document.getElementById('offline-status');
    if (element) { element.textContent = message; element.className = error ? 'offline-status error' : 'offline-status'; }
  }
  window.__outpostOfflineReady = function () {
    if (!failed) status('실행 준비 완료 · 닉네임을 적고 시작하세요.', false);
  };
  function report(message) {
    failed = true;
    status('실행 오류: ' + String(message || '이 파일 보기 앱에서는 실행을 지원하지 않습니다.').slice(0, 180) + ' · 이 안내 화면을 캡처해 주세요.', true);
  }
  window.addEventListener('error', function (event) { report(event.message); });
  window.addEventListener('unhandledrejection', function (event) { report(event.reason && event.reason.message || event.reason); });
})();
