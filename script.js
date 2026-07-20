/* =========================================================
   Логика квиза и формы заявки
   - Все интерактивные элементы доступны с клавиатуры
   - Результат честный, ступенчатый (0 / 1-2 / 3+)
   - Данные уходят в Telegram через серверную функцию
   ========================================================= */

(function () {
  "use strict";

  /* -----------------------------------------------------------
     НАСТРОЙКА ОТПРАВКИ В TELEGRAM
     ВАЖНО (предупреждение Максима): токен бота НЕЛЬЗЯ хранить
     в этом файле — его увидит любой посетитель. Поэтому здесь
     указывается адрес серверной функции (Netlify/Vercel),
     которая хранит токен у себя. Пример функции — в файле
     telegram-function-example.js.
     Пока адрес не задан — форма покажет контактный телефон.
  ----------------------------------------------------------- */
  var TELEGRAM_ENDPOINT = ""; // напр.: "/.netlify/functions/lead"

  var answers = {}; // { "1": "yes", ... }

  /* ---------- Переключатели Да/Нет ---------- */
  var toggles = document.querySelectorAll(".quiz__answers .toggle");
  toggles.forEach(function (btn) {
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", function () {
      var q = btn.closest(".quiz__q").getAttribute("data-q");
      var val = btn.getAttribute("data-val");
      // снять выделение с пары кнопок этого вопроса
      var group = btn.closest(".quiz__answers");
      group.querySelectorAll(".toggle").forEach(function (b) {
        b.setAttribute("aria-pressed", "false");
      });
      btn.setAttribute("aria-pressed", "true");
      answers[q] = val;
    });
  });

  /* ---------- Отправка квиза → показ результата ---------- */
  var quizForm = document.getElementById("quiz-form");
  var quizError = document.getElementById("quiz-error");

  quizForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Проверяем, что отвечены все 6 вопросов
    var answered = Object.keys(answers).length;
    if (answered < 6) {
      quizError.hidden = false;
      quizError.focus && quizError.focus();
      return;
    }
    quizError.hidden = true;

    // Считаем количество «да»
    var yesCount = 0;
    for (var k in answers) {
      if (answers[k] === "yes") yesCount++;
    }

    showResult(yesCount);
  });

  function showResult(yesCount) {
    var title = document.getElementById("result-title");
    var text = document.getElementById("result-text");

    if (yesCount === 0) {
      title.textContent = "Судя по ответам, поводов для беспокойства немного";
      text.textContent = "Ярких причин для расхождений в стаже у вас не видно. Но если сомневаетесь — проверка всё равно доступна и лишней не будет.";
    } else if (yesCount <= 2) {
      title.textContent = "У вас есть случаи, которые стоит перепроверить";
      text.textContent = "Один или несколько ответов «да» — частая ситуация. Такие моменты обычно легко уточнить. Оставьте контакты, и мы поможем разобраться.";
    } else {
      title.textContent = "Таких случаев у вас несколько — есть смысл проверить";
      text.textContent = "Несколько ответов «да» означают, что стоит спокойно убедиться, всё ли учтено верно. Это не значит, что что-то не так — это значит, что проверка полезна.";
    }

    // Прячем вопросы, показываем результат + форму
    document.getElementById("quiz-step-questions").hidden = true;
    document.getElementById("quiz-step-result").hidden = false;
    // Переносим фокус на заголовок результата (для скринридеров)
    title.setAttribute("tabindex", "-1");
    title.focus();
  }

  /* ---------- Валидация и отправка формы контактов ---------- */
  var contactForm = document.getElementById("contact-form");

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // honeypot: если заполнено — это бот, тихо выходим
    if (document.getElementById("company").value.trim() !== "") return;

    var ok = true;
    ok = validateField("name", function (v) { return v.length >= 2; },
      "Пожалуйста, напишите, как вас зовут.") && ok;
    ok = validateField("phone", function (v) { return /[0-9]{6,}/.test(v.replace(/\D/g, "")); },
      "Проверьте номер телефона — кажется, в нём не хватает цифр.") && ok;
    ok = validateConsent() && ok;

    if (!ok) return;

    var payload = {
      name: document.getElementById("name").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      time: document.getElementById("time").value.trim(),
      answers: answers
    };

    sendLead(payload);
  });

  function validateField(id, testFn, message) {
    var input = document.getElementById(id);
    var err = document.querySelector('[data-error-for="' + id + '"]');
    var val = input.value.trim();
    if (!testFn(val)) {
      err.textContent = message;
      err.hidden = false;
      input.setAttribute("aria-invalid", "true");
      return false;
    }
    err.hidden = true;
    input.removeAttribute("aria-invalid");
    return true;
  }

  function validateConsent() {
    var box = document.getElementById("consent");
    var err = document.querySelector('[data-error-for="consent"]');
    if (!box.checked) {
      err.textContent = "Чтобы отправить заявку, нужно согласие на обработку данных.";
      err.hidden = false;
      return false;
    }
    err.hidden = true;
    return true;
  }

  /* ---------- Отправка данных в Telegram ---------- */
  function sendLead(payload) {
    var submitBtn = document.getElementById("contact-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "Отправляем…";

    if (!TELEGRAM_ENDPOINT) {
      // Адрес функции не настроен — не теряем заявку, показываем телефон
      console.warn("TELEGRAM_ENDPOINT не задан. Настройте серверную функцию.");
      finishSuccess();
      return;
    }

    fetch(TELEGRAM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Ошибка отправки");
        finishSuccess();
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Отправить заявку";
        alert("Не удалось отправить заявку. Пожалуйста, позвоните нам по телефону, указанному внизу страницы.");
      });
  }

  function finishSuccess() {
    document.getElementById("quiz-step-result").hidden = true;
    var done = document.getElementById("quiz-step-done");
    done.hidden = false;
    var heading = done.querySelector("h3");
    heading.setAttribute("tabindex", "-1");
    heading.focus();
    done.scrollIntoView({ block: "center" });
  }

})();

/* =========================================================
   Карусель историй (ручное управление, без автопрокрутки)
   - листается кнопками, свайпом, стрелками клавиатуры
   - счётчик «N из M» + точки
   - уважает prefers-reduced-motion (мгновенная смена)
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

    // строим точки
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

    // клавиатура
    root.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { go(index - 1); }
      if (e.key === "ArrowRight") { go(index + 1); }
    });

    // свайп
    var startX = 0, startY = 0, swiping = false;
    track.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY; swiping = true;
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      // реагируем только на горизонтальный жест, чтобы не мешать вертикальной прокрутке
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) go(index + 1); else go(index - 1);
      }
    }, { passive: true });

    update();
  });

})();
