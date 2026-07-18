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
  var TELEGRAM_ENDPOINT = "/.netlify/functions/lead"; // напр.: "/.netlify/functions/lead"

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
