import puppeteer from "puppeteer";
import * as XLSX from "xlsx";
import * as fs from "fs";
import {
  OUTPUT_FILE_PATH,
  PARSER_FILE_PATH,
  IS_CONTENT_COMPLETE,
  LINKS_FILE_PATH,
} from "./config.js";

// --- Вспомогательные функции (запускаются в Node.js) ---

/**
 * Читает ссылки из указанного текстового файла.
 * @param {string} filePath Путь к файлу .txt
 * @returns {string[]} Массив URL-адресов.
 */
function getLinksFromFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const links = fileContent
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.startsWith("http"));

    if (links.length === 0) {
      console.error(
        `Ошибка: Файл ${filePath} пуст или не содержит валидных ссылок.`
      );
      return [];
    }
    console.log(`Найдено ${links.length} ссылок в файле: ${filePath}`);
    return links;
  } catch (error) {
    console.error(`Ошибка при чтении файла ${filePath}:`, error.message);
    return [];
  }
}

/**
 * Конвертирует массив JSON-объектов в XLSX файл.
 * @param {Array<Object>} data Массив с данными о товарах.
 * @param {string} filePath Путь для сохранения файла.
 */
function jsonToXlsx(data, filePath) {
  if (!data || data.length === 0) {
    console.log("Нет данных для записи в файл.");
    return;
  }

  const flattenedData = data.map((item) => {
    return Object.entries(item).reduce((acc, [key, value]) => {
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        return { ...acc, ...value };
      } else {
        acc[key] = value;
        return acc;
      }
    }, {});
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(flattenedData);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  XLSX.writeFile(workbook, filePath);
  console.log(`Файл XLSX успешно создан по пути: ${filePath}`);
}

/**
 * Обрабатывает одну страницу: переходит по ссылке, выполняет необходимые действия и извлекает данные.
 * @param {import('puppeteer').Page} page - Экземпляр страницы Puppeteer.
 * @param {string} link - URL для парсинга.
 * @param {string} parserScript - Строка с кодом функции-парсера.
 * @returns {Promise<Object>} - Объект с данными страницы.
 */
async function scrapeSinglePage(page, link, parserScript) {
  console.log(`Перехожу на страницу: ${link}`);
  await page.goto(link, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("h1");

  if (!IS_CONTENT_COMPLETE) {
    const buttonSelector = ".btnDetail--im7UR";
    try {
      console.log('Жду появления кнопки "развернуть"...');
      await page.waitForSelector(buttonSelector, { timeout: 5000 });
      console.log("Нажимаю на кнопку...");
      await page.click(buttonSelector);
      console.log("Жду загрузки полного контента...");
      await page.waitForSelector(".detailsModal--eHzZX");
    } catch (error) {
      console.log("Кнопка 'развернуть' не найдена или контент уже загружен.");
    }
  }

  const data = await page.evaluate(parserScript + "; getPageData();");
  console.log(`Данные для ${link} собраны.`);
  return data;
}

// --- Основная функция ---

/**
 * Главная функция для сбора данных (скрапинга).
 * @param {string[]} linksToScrape Массив URL для сбора данных.
 */
async function main(linksToScrape) {
  if (!linksToScrape || linksToScrape.length === 0) {
    console.log("Нет ссылок для обработки. Завершение работы.");
    return;
  }

  let parserScript;
  try {
    parserScript = fs.readFileSync(PARSER_FILE_PATH, "utf-8");
    console.log(`Используется парсер: ${PARSER_FILE_PATH}...`);
  } catch (error) {
    console.error(
      `Ошибка чтения файла парсера ${PARSER_FILE_PATH}:`,
      error.message
    );
    return;
  }

  let browser = null;
  try {
    console.log("Запускаю браузер...");
    browser = await puppeteer.launch({
      // headless: false,
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });

    const allResults = [];
    for (const link of linksToScrape) {
      try {
        const result = await scrapeSinglePage(page, link, parserScript);
        allResults.push(result);
      } catch (error) {
        console.error(`Ошибка при обработке ссылки ${link}:`, error.message);
        allResults.push({ url: link, error: error.message });
      }
    }

    console.log("Парсинг завершен. Итоговые данные:");
    console.log(allResults);
    jsonToXlsx(allResults, OUTPUT_FILE_PATH);
  } catch (error) {
    console.error("Произошла глобальная ошибка:", error);
  } finally {
    if (browser) {
      console.log("Закрываю браузер...");
      await browser.close();
    }
  }
}

// --- Точка входа в скрипт ---

function run() {
  const command = process.argv[2];

  if (command === "--scrape") {
    console.log(`Запуск в режиме сбора данных...`);
    const links = getLinksFromFile(LINKS_FILE_PATH);
    main(links);
  } else {
    console.log(
      `Неизвестная или некорректная команда: ${
        command || "команда отсутствует"
      }`
    );
    console.log("Пожалуйста, используйте флаг --scrape.");
    console.log("\nПример: node script.js --scrape");
  }
}

run();
