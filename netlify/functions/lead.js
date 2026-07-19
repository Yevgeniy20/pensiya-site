/* =========================================================
   ПРИМЕР СЕРВЕРНОЙ ФУНКЦИИ для отправки заявок в Telegram
   =========================================================

   Зачем она нужна:
   Токен бота нельзя класть в script.js — его увидит любой
   посетитель сайта. Эта функция хранит токен на сервере
   (в переменных окружения) и пересылает заявку в вашу
   Telegram-группу. Сайт остаётся статическим.

   ---------------------------------------------------------
   КАК ПОДКЛЮЧИТЬ (вариант для Netlify):
   1. Создайте бота через @BotFather → получите TOKEN.
   2. Добавьте бота в вашу группу-заявочную.
   3. Узнайте CHAT_ID группы (например, через @getidsbot).
   4. Положите этот файл в папку:  netlify/functions/lead.js
   5. В настройках сайта Netlify задайте переменные окружения:
        TELEGRAM_TOKEN  = ваш токен
        TELEGRAM_CHAT   = id группы (напр. -1001234567890)
   6. В script.js укажите:
        var TELEGRAM_ENDPOINT = "/.netlify/functions/lead";

   Для Vercel структура похожа: файл api/lead.js,
   переменные окружения в настройках проекта,
   endpoint = "/api/lead".
   --------------------------------------------------------- */

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Простейшая защита от пустых/спам-заявок
    if (!data.name || !data.phone) {
      return { statusCode: 400, body: "Bad Request" };
    }

    const TOKEN = process.env.TELEGRAM_TOKEN;
    const CHAT = process.env.TELEGRAM_CHAT;

    // Собираем ответы квиза в читаемый вид
    const qLabels = {
      "1": "Работал(а) до 2000 года",
      "2": "Менял(а) работодателей несколько раз",
      "3": "Трудовая терялась/переоформлялась",
      "4": "Работал(а) в разных городах",
      "5": "Были декретные отпуска",
      "6": "Была работа без оформления"
    };
    let quizText = "";
    if (data.answers) {
      Object.keys(qLabels).forEach(function (k) {
        const a = data.answers[k] === "yes" ? "Да" : (data.answers[k] === "no" ? "Нет" : "—");
        quizText += "• " + qLabels[k] + ": " + a + "\n";
      });
    }

    const message =
      "🔔 Новая заявка с сайта\n\n" +
      "Имя: " + data.name + "\n" +
      "Телефон: " + data.phone + "\n" +
      "Удобное время: " + (data.time || "не указано") + "\n\n" +
      "Ответы на опрос:\n" + quizText;

    const tgUrl = "https://api.telegram.org/bot" + TOKEN + "/sendMessage";
    const res = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text: message })
    });

    const resultText = await res.text();
    console.log("Telegram ответил:", res.status, resultText);

    if (!res.ok) {
      return { statusCode: 502, body: "Telegram error: " + resultText };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: "Server error" };
  }
};
