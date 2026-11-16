/* Decorative rising bubbles behind the sheet (same effect as the Evening Brewing Handover). */
(function () {
  var host = document.getElementById("bubbles");
  if (!host) return;
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  } catch (e) {}
  for (var i = 0; i < 16; i++) {
    var b = document.createElement("span");
    var size = 8 + Math.random() * 26;
    b.style.cssText = "left:" + (Math.random() * 100) + "%;width:" + size + "px;height:" + size + "px;" +
      "animation-duration:" + (14 + Math.random() * 16) + "s;animation-delay:" + (-Math.random() * 24) + "s;";
    host.appendChild(b);
  }
})();
