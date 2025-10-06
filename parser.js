/**
 * Парсит HTML-код страницы товара и возвращает "плоский" объект
 * с полной информацией о товаре и странице.
 * @returns {object|null} Объект с данными о товаре или null в случае ошибки.
 */
function getPageData() {
  try {
    // --- 1. Сбор базовых данных о товаре и странице ---
    const baseData = {
      // Заголовок страницы из тега <title>
      pageTitle: document.title?.trim() || null,

      // Основной заголовок на странице (h1)
      pageHeading: document.querySelector("h1")?.textContent?.trim() || null,

      // Мета-описание страницы
      pageDescr:
        document.querySelector('meta[name="description"]')?.content?.trim() ||
        null,

      // Мета-ключевые слова
      pageKeywords:
        document.querySelector('meta[name="keywords"]')?.content?.trim() ||
        null, // Мета-тег keywords присутствует, но пуст.

      // Название товара (дублируем из h1 для удобства)
      productName: document.querySelector("h1")?.textContent?.trim() || null,

      // URL страницы
      url: document.location.href,

      // Артикул товара
      article:
        document
          .querySelector(".shop2-product-article")
          ?.textContent?.replace("Артикул:", "")
          .trim() || null,

      // Цена товара
      price:
        document
          .querySelector(".price-current strong")
          ?.textContent?.replace(/\s/g, "") || null,

      // Производитель/Бренд
      vendor:
        document.querySelector(".site-name__name")?.textContent?.trim() || null,

      // Анонс товара (краткое описание)
      anons:
        document.querySelector(".gr-product-anonce")?.textContent?.trim() ||
        null, // На данной странице элемент с классом .gr-product-anonce не найден.

      // Список URL изображений товара, разделенных запятой
      images:
        Array.from(
          document.querySelectorAll(
            ".card-slider__items-slider .card-slider__item a"
          )
        )
          .map((a) => {
            const href = a.href;
            if (href) {
              const parts = href.split("/");
              const filename = parts[parts.length - 1];
              // Формируем URL полного изображения на основе имени файла
              return `https://altohim.ru/d/${filename}`;
            }
            return null;
          })
          .filter(Boolean) // Убираем null значения, если были
          .join(",") || null,

      // Полное описание товара в формате HTML с заменой переносов строк
      description:
        document
          .querySelector("#shop2-tabs-2 p")
          ?.innerHTML?.trim()
          .replace(/\n/g, "<br>") || null,
    };

    // --- 2. Сбор характеристик товара ---
    const characteristics = {};

    // Вспомогательная функция для парсинга блоков с характеристиками
    const parseCharacteristics = (
      containerSelector,
      itemSelector,
      keySelector,
      valueSelector,
      allowOverwrite = false
    ) => {
      const container = document.querySelector(containerSelector);
      if (container) {
        container.querySelectorAll(itemSelector).forEach((item) => {
          const key = item.querySelector(keySelector)?.textContent?.trim();
          const valueElement = item.querySelector(valueSelector);

          // Добавляем характеристику, только если ключ найден и его еще нет в объекте (или разрешена перезапись)
          if (
            key &&
            valueElement &&
            (allowOverwrite || !characteristics.hasOwnProperty(key))
          ) {
            let value;
            const selectElement = valueElement.querySelector("select");
            if (selectElement) {
              // Если это select, собираем все значения из options
              value = Array.from(selectElement.options)
                .map((opt) => `"${opt.textContent.trim()}"`)
                .join(",");
            } else {
              // Иначе просто берем текстовое содержимое
              value = valueElement.textContent?.trim();
            }
            characteristics[key] = value;
          }
        });
      }
    };

    // Сначала парсим основной блок с параметрами в карточке товара, который виден сразу.
    // Он может содержать дубликаты, поэтому не перезаписываем их на втором шаге.
    parseCharacteristics(
      ".gr-options-container .shop2-product-options",
      ".option-item",
      ".option-title",
      ".option-body",
      true // Разрешаем запись, так как это первый проход.
    );

    // Затем парсим дополнительный блок на вкладке "Параметры", добавляя только уникальные характеристики.
    parseCharacteristics(
      "#shop2-tabs-1 .shop2-product-params",
      ".param-item",
      ".param-title",
      ".param-body",
      false // Не перезаписываем существующие ключи, чтобы избежать дублей.
    );

    // --- 3. Объединение базовых данных и характеристик в один "плоский" объект ---
    const finalData = {
      ...baseData,
      ...characteristics,
    };

    return finalData;
  } catch (error) {
    console.error("Ошибка при парсинге страницы:", error);
    return null;
  }
}
