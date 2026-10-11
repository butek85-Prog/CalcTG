/**
 * Calculator Data and Core Calculation Engine
 * Service Cost Calculator Telegram Mini App
 */

const SERVICES_DATA = [
  {
    id: 'landing',
    name: 'Лендинг / Одностраничный сайт',
    shortName: 'Лендинг',
    description: 'Адаптивный дизайн, высокая скорость загрузки, формы сбора заявок и базовая SEO-структура.',
    price: 15000,
    icon: '🚀',
    period: '3–5 дней',
    badge: 'Быстрый старт'
  },
  {
    id: 'shop',
    name: 'Интернет-магазин / Каталог',
    shortName: 'Интернет-магазин',
    description: 'Каталог товаров с умным поиском, карточками, корзиной, фильтрами и историей заказов.',
    price: 32000,
    icon: '🛍️',
    period: '7–12 дней',
    badge: 'Популярный'
  },
  {
    id: 'bot',
    name: 'Telegram-бот / Mini App',
    shortName: 'Telegram Mini App',
    description: 'Интерактивное веб-приложение внутри Telegram с авторизацией, витриной и нативным UX.',
    price: 45000,
    icon: '🤖',
    period: '10–14 дней',
    badge: 'Флагман'
  }
];

const FIXED_OPTIONS_DATA = [
  {
    id: 'opt_payments',
    type: 'fixed',
    name: 'Подключение онлайн-оплаты',
    description: 'Приём платежей картами, СБП и электронными кошельками (ЮKassa / CloudPayments).',
    price: 6000,
    icon: '💳'
  },
  {
    id: 'opt_crm',
    type: 'fixed',
    name: 'Интеграция с CRM / Таблицами',
    description: 'Автоматическая передача контактов и заказов в AmoCRM, Bitrix24 или Google Sheets.',
    price: 8000,
    icon: '📊'
  },
  {
    id: 'opt_seo',
    type: 'fixed',
    name: 'SEO-оптимизация и индексация',
    description: 'Семантическая разметка, OpenGraph, sitemap.xml и регистрация в поисковиках.',
    price: 4500,
    icon: '🔍'
  },
  {
    id: 'opt_domain',
    type: 'fixed',
    name: 'Домен, SSL-сертификат и почта',
    description: 'Подбор и подключение домена, выпуск SSL-сертификата и корпоративная почта.',
    price: 3000,
    icon: '🌐'
  }
];

const PERCENTAGE_OPTIONS_DATA = [
  {
    id: 'pct_urgent',
    type: 'percentage',
    name: 'Срочная разработка (х2 быстрее)',
    description: 'Приоритетный спринт разработки, сдача проекта в два раза быстрее базового срока.',
    percent: 30,
    icon: '⚡'
  },
  {
    id: 'pct_design',
    type: 'percentage',
    name: 'Премиум UI/UX дизайн и анимации',
    description: 'Уникальные иллюстрации, микроанимации интерфейса и кастомная айдентика.',
    percent: 20,
    icon: '✨'
  },
  {
    id: 'pct_support',
    type: 'percentage',
    name: 'Приоритетная техподдержка (6 мес.)',
    description: 'Персональный менеджер, мониторинг 24/7 и пакет ежемесячных доработок.',
    percent: 15,
    icon: '🛡️'
  }
];

const VALID_PROMOCODES = {
  START10: {
    discountPercent: 10,
    title: 'Скидка 10% для новых клиентов'
  }
};

/**
 * Format number as rubles (e.g. 15 000 ₽)
 * @param {number} num
 * @returns {string}
 */
function formatRubles(num) {
  const rounded = Math.round(Number(num) || 0);
  return rounded.toLocaleString('ru-RU') + ' ₽';
}

/**
 * Calculate total breakdown based on current state
 * @param {Object} state
 * @param {string} state.selectedServiceId
 * @param {Set<string>|Array<string>} state.selectedOptions
 * @param {string|null} state.promoCode
 * @returns {Object} breakdown
 */
function calculateCost(state) {
  const service = SERVICES_DATA.find(s => s.id === state.selectedServiceId) || SERVICES_DATA[0];
  const selectedOptsSet = new Set(state.selectedOptions || []);

  const basePrice = service.price;

  // Selected fixed options
  const fixedOptions = FIXED_OPTIONS_DATA.filter(opt => selectedOptsSet.has(opt.id));
  const fixedTotal = fixedOptions.reduce((acc, opt) => acc + opt.price, 0);

  // Selected percentage options (calculated on base price)
  const percentageOptions = PERCENTAGE_OPTIONS_DATA.filter(opt => selectedOptsSet.has(opt.id)).map(opt => {
    const calculatedAmount = Math.round(basePrice * (opt.percent / 100));
    return {
      ...opt,
      calculatedAmount
    };
  });
  const percentageTotal = percentageOptions.reduce((acc, opt) => acc + opt.calculatedAmount, 0);

  // Subtotal before discount
  const subtotal = basePrice + fixedTotal + percentageTotal;

  // Promo code
  const cleanPromo = (state.promoCode || '').trim().toUpperCase();
  const promoData = VALID_PROMOCODES[cleanPromo] || null;
  const isPromoApplied = Boolean(promoData);
  const discountPercent = isPromoApplied ? promoData.discountPercent : 0;
  const discountAmount = isPromoApplied ? Math.round(subtotal * (discountPercent / 100)) : 0;

  const total = Math.max(0, subtotal - discountAmount);

  return {
    service,
    basePrice,
    fixedOptions,
    fixedTotal,
    percentageOptions,
    percentageTotal,
    subtotal,
    promoCode: isPromoApplied ? cleanPromo : null,
    promoData,
    isPromoApplied,
    discountPercent,
    discountAmount,
    total,
    formatted: {
      basePrice: formatRubles(basePrice),
      fixedTotal: formatRubles(fixedTotal),
      percentageTotal: formatRubles(percentageTotal),
      subtotal: formatRubles(subtotal),
      discountAmount: discountAmount > 0 ? `-${formatRubles(discountAmount)}` : '0 ₽',
      total: formatRubles(total)
    }
  };
}

// Export for ES modules / Browser globals
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SERVICES_DATA,
    FIXED_OPTIONS_DATA,
    PERCENTAGE_OPTIONS_DATA,
    VALID_PROMOCODES,
    formatRubles,
    calculateCost
  };
}
