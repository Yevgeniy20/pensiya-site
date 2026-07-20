/* =========================================================
   Карусель историй (ручное управление, без автопрокрутки)
   - листается кнопками, свайпом, стрелками клавиатуры
   - счётчик «N из M» + точки
   - уважает prefers-reduced-motion (мгновенная смена)
   Квиз убран: все обращения идут через WhatsApp-кнопки.
   ========================================================= */
(function () {
  "use strict";

  var carousels = document.querySelectorAll("[data-carousel]");
  carousels.forEach(function (root) {
    var track = root.querySelector(".carousel__track");
    var slides = Array.prototype.slice.call(track.children);
    var prev = root.querySelector(".carousel__arrow--prev");
    var next = root.querySelector(".carousel__arrow--next");
    var curEl = root.querySelector("[data-current]");
    var dotsWrap = root.querySelector(".carousel__dots");
    var index = 0;
    var total = slides.length;

    var dots = [];
    for (var i = 0; i < total; i++) {
      var d = document.createElement("button");
      d.type = "button";
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "История " + (i + 1));
      (function (n) { d.addEventListener("click", function () { go(n); }); })(i);
      dotsWrap.appendChild(d);
      dots.push(d);
    }

    function update() {
      track.style.transform = "translateX(" + (-index * 100) + "%)";
      if (curEl) curEl.textContent = (index + 1);
      dots.forEach(function (dot, n) {
        dot.setAttribute("aria-selected", n === index ? "true" : "false");
      });
      if (prev) prev.disabled = (index === 0);
      if (next) next.disabled = (index === total - 1);
    }

    function go(n) {
      index = Math.max(0, Math.min(total - 1, n));
      update();
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(index - 1); }
      if (e.key === "ArrowRight") { go(index + 1); }
    });

    var startX = 0, startY = 0, swiping = false;
    track.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) go(index + 1); else go(index - 1);
      }
    }, { passive: true });

    update();
  });

})();
