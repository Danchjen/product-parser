/**
 * Извлекает всю необходимую информацию со страницы товара.
 * Эта функция выполняется в контексте браузера через page.evaluate().
 * Она должна быть самодостаточной и не зависеть от внешнего кода.
 */
function getPageData() {
  // 1. SEO-данные
  const pageTitle = document.title || null;
  const pageDescr =
    document
      .querySelector('meta[name="description"]')
      ?.getAttribute("content") || null;
  const pageKeywords =
    document.querySelector('meta[name="keywords"]')?.getAttribute("content") ||
    null;

  // 2. Основные данные о товаре
  const pageHeading =
    document.querySelector("h1.productTitle--J2W7I")?.innerText.trim() || null;
  const productName = pageHeading;
  const article =
    document
      .querySelector(".productOptionsTable--epyAr tr:first-child td span")
      ?.innerText.trim() || null;
  const price =
    document
      .querySelector(".priceBlockFinalPrice--iToZR")
      ?.innerText.replace(/\D/g, "") || null;
  const rawDescription =
    document.querySelector(".descriptionText--Jq9n2")?.innerHTML.trim() || null;

  // Если описание было найдено, заменяем в нём все символы переноса строки на тег <br>
  const description = rawDescription
    ? rawDescription.replace(/\n/g, "<br>")
    : null;
  const url = window.location.href;

  // 3. Изображения
  const imageElements = document.querySelectorAll(
    ".mainSlider--JxK8z .swiper-slide img"
  );
  const images = Array.from(imageElements)
    .map((img) => img.src)
    .join(",");

  // 4. Характеристики
  const characteristics = {};
  const characteristicRows = document.querySelectorAll(
    ".table--CGApj tr, .productOptionsTable--epyAr tr"
  );
  characteristicRows.forEach((row) => {
    const keyElement =
      row.querySelector("th .cellWrapper--i4h93 span") ||
      row.querySelector("th .cellWrapper--i4h93");
    const valueElement = row.querySelector("td");
    if (keyElement && valueElement) {
      const key = keyElement.innerText.trim();
      const value = valueElement.innerText.trim();
      if (key && value && key !== "Артикул") {
        characteristics[key] = value;
      }
    }
  });

  return {
    pageTitle,
    pageHeading,
    pageDescr,
    pageKeywords,
    productName,
    url,
    article,
    price,
    images,
    description,
    characteristics,
  };
}
