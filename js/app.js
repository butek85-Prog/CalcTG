/**
 * Application Controller & State Management
 * Service Cost Calculator Telegram Mini App
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    selectedServiceId: 'landing',
    selectedOptions: new Set(),
    promoCode: '',
    isPromoApplied: false,
    currentScreen: 'calc', // 'calc' | 'review' | 'success'
    clientInfo: {
      name: '',
      contact: '',
      comment: ''
    },
    lastOrder: null
  };

  // DOM Elements
  const screens = {
    calc: document.getElementById('screenCalc'),
    review: document.getElementById('screenReview'),
    success: document.getElementById('screenSuccess')
  };

  const servicesList = document.getElementById('servicesList');
  const fixedOptionsList = document.getElementById('fixedOptionsList');
  const percentageOptionsList = document.getElementById('percentageOptionsList');

  // Promo elements
  const promoInput = document.getElementById('promoInput');
  const applyPromoBtn = document.getElementById('applyPromoBtn');
  const promoMessage = document.getElementById('promoMessage');
  const appliedPromoBadge = document.getElementById('appliedPromoBadge');
  const appliedPromoText = document.getElementById('appliedPromoText');
  const removePromoBtn = document.getElementById('removePromoBtn');

  // Summary breakdown elements (Screen 1 & Header)
  const headerTotalBadge = document.getElementById('headerTotalBadge');
  const sumBaseService = document.getElementById('sumBaseService');
  const sumBasePrice = document.getElementById('sumBasePrice');
  const sumFixedRow = document.getElementById('sumFixedRow');
  const sumFixedPrice = document.getElementById('sumFixedPrice');
  const sumPercentRow = document.getElementById('sumPercentRow');
  const sumPercentPrice = document.getElementById('sumPercentPrice');
  const sumPromoRow = document.getElementById('sumPromoRow');
  const sumPromoDiscount = document.getElementById('sumPromoDiscount');
  const sumTotalPrice = document.getElementById('sumTotalPrice');

  // Screen 1 inline action button
  const goToReviewBtn = document.getElementById('goToReviewBtn');

  // Screen 2 elements
  const reviewReceipt = document.getElementById('reviewReceipt');
  const clientNameInput = document.getElementById('clientNameInput');
  const clientContactInput = document.getElementById('clientContactInput');
  const clientCommentInput = document.getElementById('clientCommentInput');
  const editSelectionBtn = document.getElementById('editSelectionBtn');
  const confirmOrderBtn = document.getElementById('confirmOrderBtn');

  // Screen 3 elements
  const successOrderId = document.getElementById('successOrderId');
  const successSummaryContent = document.getElementById('successSummaryContent');
  const newOrderBtn = document.getElementById('newOrderBtn');
  const copyOrderBtn = document.getElementById('copyOrderBtn');
  const closeAppBtn = document.getElementById('closeAppBtn');

  // Browser Header tools
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const pageBackBtn = document.getElementById('pageBackBtn');

  // Hide redundant duplicate HTML button when inside Telegram Mini App
  function updateTelegramModeUI() {
    const activeTg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    const isInsideTg = Boolean(
      (typeof TelegramAdapter !== 'undefined' && typeof TelegramAdapter.isInsideTelegram === 'function' && TelegramAdapter.isInsideTelegram()) ||
      (activeTg && ((activeTg.initData && activeTg.initData.length > 0) || (activeTg.platform && activeTg.platform !== 'unknown')))
    );

    const inlineActionWrap = document.getElementById('inlineActionWrap') || document.querySelector('.inline-action-wrap');
    if (isInsideTg) {
      document.body.classList.add('inside-telegram');
      if (inlineActionWrap) {
        inlineActionWrap.style.display = 'none';
      }
      if (goToReviewBtn) {
        goToReviewBtn.style.display = 'none';
      }
    } else {
      document.body.classList.remove('inside-telegram');
      if (inlineActionWrap) {
        inlineActionWrap.style.display = 'block';
      }
      if (goToReviewBtn) {
        goToReviewBtn.style.display = 'block';
      }
    }
  }

  // Initialize Telegram Adapter
  TelegramAdapter.init();

  // Try to prefill user info from Telegram WebApp
  const tgUser = TelegramAdapter.getUser();
  if (tgUser) {
    if (tgUser.first_name) {
      state.clientInfo.name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
    }
    if (tgUser.username) {
      state.clientInfo.contact = `@${tgUser.username}`;
    }
  }

  // Initial Render
  renderServices();
  renderFixedOptions();
  renderPercentageOptions();
  updateCalculation();
  showScreen('calc');
  updateTelegramModeUI();

  // Reload button listener (forces WebApp cache refresh)
  const refreshAppBtn = document.getElementById('refreshAppBtn');
  if (refreshAppBtn) {
    refreshAppBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('impact', 'medium');
      const params = new URLSearchParams(window.location.search);
      params.set('v', Date.now());
      window.location.replace(window.location.pathname + '?' + params.toString());
    });
  }

  // Theme toggle listener
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('selection');
      const newTheme = TelegramAdapter.toggleBrowserTheme();
      themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    });
    // Set initial icon
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }

  // Promo code event listeners
  applyPromoBtn.addEventListener('click', () => handleApplyPromo());
  promoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyPromo();
    }
  });

  removePromoBtn.addEventListener('click', () => {
    TelegramAdapter.haptic('impact', 'light');
    state.promoCode = '';
    state.isPromoApplied = false;
    promoInput.value = '';
    appliedPromoBadge.style.display = 'none';
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';

    const newBreakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: null
    });
    syncMainButton(newBreakdown);
    updateCalculation(newBreakdown);
  });

  // Navigation button listeners
  if (goToReviewBtn) {
    goToReviewBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('impact', 'medium');
      showScreen('review');
    });
  }

  if (editSelectionBtn) {
    editSelectionBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('impact', 'light');
      // Preserve form values
      state.clientInfo.name = clientNameInput.value;
      state.clientInfo.contact = clientContactInput.value;
      state.clientInfo.comment = clientCommentInput.value;
      showScreen('calc');
    });
  }

  if (confirmOrderBtn) {
    confirmOrderBtn.addEventListener('click', () => {
      handleConfirmOrder();
    });
  }

  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('impact', 'medium');
      resetCalculator();
      showScreen('calc');
    });
  }

  if (copyOrderBtn) {
    copyOrderBtn.addEventListener('click', () => {
      handleCopyOrderDetails();
    });
  }

  if (closeAppBtn) {
    closeAppBtn.addEventListener('click', () => {
      TelegramAdapter.haptic('impact', 'light');
      TelegramAdapter.close();
    });
  }

  // Form input sync
  clientNameInput.addEventListener('input', (e) => {
    state.clientInfo.name = e.target.value;
  });
  clientContactInput.addEventListener('input', (e) => {
    state.clientContact = e.target.value;
    state.clientInfo.contact = e.target.value;
  });
  clientCommentInput.addEventListener('input', (e) => {
    state.clientInfo.comment = e.target.value;
  });

  /**
   * Render Services List once into DOM
   */
  function renderServices() {
    servicesList.innerHTML = '';

    SERVICES_DATA.forEach(service => {
      const isSelected = service.id === state.selectedServiceId;
      const card = document.createElement('div');
      card.className = `service-card ${isSelected ? 'selected' : ''}`;
      card.dataset.serviceId = service.id;
      card.setAttribute('role', 'radio');
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');

      card.innerHTML = `
        <div class="service-header">
          <div class="service-icon-wrap">${service.icon}</div>
          <div class="service-title-wrap">
            <div class="service-title-row">
              <span class="service-title">${service.name}</span>
              ${service.badge ? `<span class="service-badge">${service.badge}</span>` : ''}
            </div>
            <div class="service-meta">
              <span class="service-period">⏱ ${service.period}</span>
            </div>
          </div>
          <div class="service-radio ${isSelected ? 'checked' : ''}">
            <span class="radio-inner"></span>
          </div>
        </div>
        <p class="service-desc">${service.description}</p>
        <div class="service-price-tag">
          <span class="price-label">Базовая цена:</span>
          <span class="price-val">${formatRubles(service.price)}</span>
        </div>
      `;

      servicesList.appendChild(card);
    });
  }

  /**
   * Instantaneous Service Selection (in-place UI update, zero DOM recreation)
   */
  function selectService(serviceId) {
    if (!serviceId || state.selectedServiceId === serviceId) return;

    TelegramAdapter.haptic('selection');

    // 1. СТРОГО ПЕРВЫМ делом обновляй состояние:
    state.selectedServiceId = serviceId;

    // 2. ТОЛЬКО ПОСЛЕ ЭТОГО вызывай перерасчёт:
    const breakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });
    const freshBreakdown = breakdown;

    // 3. И сразу же передавай полученный breakdown в syncMainButton:
    syncMainButton(breakdown);

    // 4. Синхронно обновляй верхнюю плашку и блок «Предварительный расчёт»:
    updateCalculation(freshBreakdown);

    // 5. Instantly update service cards styles & radios
    const cards = servicesList.querySelectorAll('.service-card');
    cards.forEach(card => {
      const isSelected = card.dataset.serviceId === serviceId;
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      const radio = card.querySelector('.service-radio');
      if (radio) radio.classList.toggle('checked', isSelected);
    });

    // 6. Instantly update percentage option ruble estimates
    const currentService = freshBreakdown.service;
    const pctCards = percentageOptionsList.querySelectorAll('.option-card');
    pctCards.forEach(card => {
      const optId = card.dataset.optionId;
      const opt = PERCENTAGE_OPTIONS_DATA.find(o => o.id === optId);
      if (opt) {
        const calculatedRub = Math.round(currentService.price * (opt.percent / 100));
        const rubSpan = card.querySelector('.pct-rub');
        if (rubSpan) {
          rubSpan.textContent = `(+${formatRubles(calculatedRub)})`;
        }
      }
    });
  }

  /**
   * Render Fixed Price Options once into DOM
   */
  function renderFixedOptions() {
    fixedOptionsList.innerHTML = '';

    FIXED_OPTIONS_DATA.forEach(option => {
      const isChecked = state.selectedOptions.has(option.id);
      const card = document.createElement('div');
      card.className = `option-card ${isChecked ? 'active' : ''}`;
      card.dataset.optionId = option.id;
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', isChecked ? 'true' : 'false');

      card.innerHTML = `
        <div class="option-icon-box">${option.icon}</div>
        <div class="option-info">
          <div class="option-title">${option.name}</div>
          <div class="option-desc">${option.description}</div>
        </div>
        <div class="option-action">
          <div class="option-price-chip">+${formatRubles(option.price)}</div>
          <div class="custom-switch ${isChecked ? 'active' : ''}">
            <div class="switch-slider"></div>
          </div>
        </div>
      `;

      fixedOptionsList.appendChild(card);
    });
  }

  function toggleFixedOption(optionId) {
    if (!optionId) return;
    TelegramAdapter.haptic('impact', 'light');

    // 1. Strictly update state FIRST
    if (state.selectedOptions.has(optionId)) {
      state.selectedOptions.delete(optionId);
    } else {
      state.selectedOptions.add(optionId);
    }

    // 2. Compute fresh breakdown immediately
    const newBreakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    // 3. Immediately update MainButton and calculation
    syncMainButton(newBreakdown);
    updateCalculation(newBreakdown);

    // 5. Update DOM card & switch
    const card = fixedOptionsList.querySelector(`[data-option-id="${optionId}"]`);
    if (card) {
      const isChecked = state.selectedOptions.has(optionId);
      card.classList.toggle('active', isChecked);
      card.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      const sw = card.querySelector('.custom-switch');
      if (sw) sw.classList.toggle('active', isChecked);
    }
  }

  /**
   * Render Percentage Options once into DOM
   */
  function renderPercentageOptions() {
    percentageOptionsList.innerHTML = '';
    const currentService = SERVICES_DATA.find(s => s.id === state.selectedServiceId) || SERVICES_DATA[0];

    PERCENTAGE_OPTIONS_DATA.forEach(option => {
      const isChecked = state.selectedOptions.has(option.id);
      const calculatedRub = Math.round(currentService.price * (option.percent / 100));

      const card = document.createElement('div');
      card.className = `option-card ${isChecked ? 'active' : ''}`;
      card.dataset.optionId = option.id;
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', isChecked ? 'true' : 'false');

      card.innerHTML = `
        <div class="option-icon-box">${option.icon}</div>
        <div class="option-info">
          <div class="option-title">${option.name}</div>
          <div class="option-desc">${option.description}</div>
        </div>
        <div class="option-action">
          <div class="option-price-chip percent-chip">
            <span class="pct-badge">+${option.percent}%</span>
            <span class="pct-rub">(+${formatRubles(calculatedRub)})</span>
          </div>
          <div class="custom-switch ${isChecked ? 'active' : ''}">
            <div class="switch-slider"></div>
          </div>
        </div>
      `;

      percentageOptionsList.appendChild(card);
    });
  }

  function togglePercentageOption(optionId) {
    if (!optionId) return;
    TelegramAdapter.haptic('impact', 'light');

    // 1. Strictly update state FIRST
    if (state.selectedOptions.has(optionId)) {
      state.selectedOptions.delete(optionId);
    } else {
      state.selectedOptions.add(optionId);
    }

    // 2. Compute fresh breakdown immediately
    const newBreakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    // 3. Immediately update MainButton and calculation
    syncMainButton(newBreakdown);
    updateCalculation(newBreakdown);

    // 4. Update DOM card & switch
    const card = percentageOptionsList.querySelector(`[data-option-id="${optionId}"]`);
    if (card) {
      const isChecked = state.selectedOptions.has(optionId);
      card.classList.toggle('active', isChecked);
      card.setAttribute('aria-checked', isChecked ? 'true' : 'false');
      const sw = card.querySelector('.custom-switch');
      if (sw) sw.classList.toggle('active', isChecked);
    }
  }

  /**
   * Fast, reliable event delegation for click and keyboard accessibility.
   * With CSS touch-action: manipulation, mobile click events fire with 0ms delay.
   */
  function bindListSelection(container, selector, callback) {
    if (!container) return;

    container.addEventListener('click', (e) => {
      const item = e.target.closest(selector);
      if (item && container.contains(item)) {
        callback(item);
      }
    });

    // Keyboard accessibility (Enter and Space)
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const item = e.target.closest(selector);
        if (item && container.contains(item)) {
          e.preventDefault();
          callback(item);
        }
      }
    });
  }

  // Event Delegation for Services (Instant response to click, touch, keyboard)
  bindListSelection(servicesList, '.service-card', (card) => {
    if (card.dataset.serviceId) {
      selectService(card.dataset.serviceId);
    }
  });

  // Event Delegation for Fixed Options
  bindListSelection(fixedOptionsList, '.option-card', (card) => {
    if (card.dataset.optionId) {
      toggleFixedOption(card.dataset.optionId);
    }
  });

  // Event Delegation for Percentage Options
  bindListSelection(percentageOptionsList, '.option-card', (card) => {
    if (card.dataset.optionId) {
      togglePercentageOption(card.dataset.optionId);
    }
  });

  /**
   * Apply Promo Code logic
   */
  function handleApplyPromo() {
    const rawVal = promoInput.value.trim();
    if (!rawVal) {
      showPromoStatus('Введите промокод (например, START10)', true);
      return;
    }

    const clean = rawVal.toUpperCase();
    if (VALID_PROMOCODES[clean]) {
      TelegramAdapter.haptic('notification', 'success');
      // 1. Strictly update state FIRST
      state.promoCode = clean;
      state.isPromoApplied = true;

      const promoInfo = VALID_PROMOCODES[clean];
      appliedPromoBadge.style.display = 'flex';
      appliedPromoText.textContent = `${clean} (-${promoInfo.discountPercent}%) — ${promoInfo.title}`;

      showPromoStatus(`Промокод ${clean} успешно применён! Скидка ${promoInfo.discountPercent}%`, false);
      promoInput.value = '';

      // 2. Compute fresh breakdown immediately
      const newBreakdown = calculateCost({
        selectedServiceId: state.selectedServiceId,
        selectedOptions: state.selectedOptions,
        promoCode: state.promoCode
      });

      // 3. Immediately update bottom button and calculation
      syncMainButton(newBreakdown);
      updateCalculation(newBreakdown);
    } else {
      TelegramAdapter.haptic('notification', 'error');
      showPromoStatus(`Промокод «${rawVal}» не найден или недействителен. Попробуйте START10`, true);
    }
  }

  function showPromoStatus(message, isError) {
    promoMessage.textContent = message;
    promoMessage.className = `promo-message ${isError ? 'error' : 'success'}`;
  }

  /**
   * Recalculate cost and synchronously update all summary displays and buttons
   * @param {Object} [providedBreakdown]
   * @returns {Object} breakdown
   */
  function updateCalculation(providedBreakdown) {
    const breakdown = providedBreakdown || calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    // 1. Sticky Top Header Total Badge - synchronous immediate update
    if (headerTotalBadge) {
      headerTotalBadge.textContent = breakdown.formatted.total;
    }

    // 2. Screen 1 Summary Card
    sumBaseService.textContent = breakdown.service.shortName;
    sumBasePrice.textContent = breakdown.formatted.basePrice;

    if (breakdown.fixedTotal > 0) {
      sumFixedRow.style.display = 'flex';
      sumFixedPrice.textContent = `+${breakdown.formatted.fixedTotal}`;
    } else {
      sumFixedRow.style.display = 'none';
    }

    if (breakdown.percentageTotal > 0) {
      sumPercentRow.style.display = 'flex';
      sumPercentPrice.textContent = `+${breakdown.formatted.percentageTotal}`;
    } else {
      sumPercentRow.style.display = 'none';
    }

    if (breakdown.discountAmount > 0) {
      sumPromoRow.style.display = 'flex';
      sumPromoDiscount.textContent = breakdown.formatted.discountAmount;
    } else {
      sumPromoRow.style.display = 'none';
    }

    sumTotalPrice.textContent = breakdown.formatted.total;

    // 3. Screen 1 Inline Action Button
    if (goToReviewBtn) {
      goToReviewBtn.textContent = `Перейти к проверке • ${breakdown.formatted.total}`;
    }

    // 4. Update Telegram MainButton & Browser Button synchronously
    syncMainButton(breakdown);

    return breakdown;
  }

  /**
   * Sync MainButton / Browser Bottom Button state
   * @param {Object} [breakdown]
   */
  function syncMainButton(breakdown) {
    const activeBreakdown = breakdown || calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    const totalText = activeBreakdown.formatted.total;
    const buttonText = `Перейти к проверке • ${totalText}`;

    if (state.currentScreen === 'calc') {
      if (goToReviewBtn) {
        goToReviewBtn.textContent = buttonText;
      }
      TelegramAdapter.setMainButton({
        text: buttonText,
        onClick: () => {
          showScreen('review');
        },
        isVisible: true,
        isActive: true
      });

      // Прямой синхронный вызов setText для нативной кнопки Telegram WebApp
      const nativeTg = window.Telegram?.WebApp;
      if (nativeTg?.MainButton && typeof nativeTg.MainButton.setText === 'function') {
        try {
          nativeTg.MainButton.setText(buttonText);
        } catch (e) {
          console.warn('Native MainButton direct sync error:', e);
        }
      }
    } else if (state.currentScreen === 'review') {
      TelegramAdapter.setMainButton({
        text: `Подтвердить заказ • ${totalText}`,
        onClick: () => {
          handleConfirmOrder();
        },
        isVisible: true,
        isActive: true
      });
    } else if (state.currentScreen === 'success') {
      TelegramAdapter.setMainButton({
        text: 'Новый расчёт',
        onClick: () => {
          resetCalculator();
          showScreen('calc');
        },
        isVisible: true,
        isActive: true
      });
    }
  }

  /**
   * Screen Management Router
   * @param {'calc'|'review'|'success'} screenName
   */
  function showScreen(screenName) {
    state.currentScreen = screenName;

    // Toggle screen DOM visibility
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].classList.toggle('active', key === screenName);
      }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle Back Button & Navigation
    if (screenName === 'calc') {
      TelegramAdapter.hideBackButton();
      updateTelegramModeUI();
    } else if (screenName === 'review') {
      const handleBackFromReview = () => {
        state.clientInfo.name = clientNameInput.value;
        state.clientInfo.contact = clientContactInput.value;
        state.clientInfo.comment = clientCommentInput.value;
        showScreen('calc');
      };
      TelegramAdapter.setBackButton({
        onClick: handleBackFromReview,
        isVisible: true
      });
      renderReviewScreen();
    } else if (screenName === 'success') {
      TelegramAdapter.hideBackButton();
      renderSuccessScreen();
    }

    // Refresh buttons with fresh breakdown
    const freshBreakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });
    syncMainButton(freshBreakdown);
    updateCalculation(freshBreakdown);
  }

  /**
   * Render Review Screen (Screen 2)
   */
  function renderReviewScreen() {
    const breakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    // Populate client input fields with preserved state
    clientNameInput.value = state.clientInfo.name || '';
    clientContactInput.value = state.clientInfo.contact || '';
    clientCommentInput.value = state.clientInfo.comment || '';

    let fixedItemsHtml = '';
    if (breakdown.fixedOptions.length > 0) {
      fixedItemsHtml = breakdown.fixedOptions.map(opt => `
        <div class="receipt-row opt-item">
          <span class="receipt-label">
            <span class="receipt-icon">${opt.icon}</span> ${opt.name}
          </span>
          <span class="receipt-val">+${formatRubles(opt.price)}</span>
        </div>
      `).join('');
    }

    let percentItemsHtml = '';
    if (breakdown.percentageOptions.length > 0) {
      percentItemsHtml = breakdown.percentageOptions.map(opt => `
        <div class="receipt-row opt-item">
          <span class="receipt-label">
            <span class="receipt-icon">${opt.icon}</span> ${opt.name} (+${opt.percent}%)
          </span>
          <span class="receipt-val">+${formatRubles(opt.calculatedAmount)}</span>
        </div>
      `).join('');
    }

    reviewReceipt.innerHTML = `
      <div class="receipt-card">
        <div class="receipt-header">
          <div class="receipt-badge">Спецификация заказа</div>
          <div class="receipt-date">${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="receipt-section">
          <div class="receipt-section-title">Основная услуга</div>
          <div class="receipt-row main-service-row">
            <div class="service-receipt-info">
              <span class="receipt-icon">${breakdown.service.icon}</span>
              <div>
                <strong class="receipt-main-name">${breakdown.service.name}</strong>
                <div class="receipt-sub">${breakdown.service.period} • ${breakdown.service.badge}</div>
              </div>
            </div>
            <span class="receipt-val">${breakdown.formatted.basePrice}</span>
          </div>
        </div>

        ${(breakdown.fixedOptions.length > 0 || breakdown.percentageOptions.length > 0) ? `
          <div class="receipt-section">
            <div class="receipt-section-title">Выбранные дополнительные опции</div>
            ${fixedItemsHtml}
            ${percentItemsHtml}
          </div>
        ` : `
          <div class="receipt-section no-extras">
            <div class="receipt-hint">Дополнительные опции не выбраны</div>
          </div>
        `}

        <div class="receipt-section summary-calc-section">
          <div class="receipt-row subtotal-row">
            <span class="receipt-label">Подытог без скидок:</span>
            <span class="receipt-val">${breakdown.formatted.subtotal}</span>
          </div>

          ${breakdown.isPromoApplied ? `
            <div class="receipt-row discount-row">
              <span class="receipt-label promo-applied-label">
                🎁 Промокод <strong>${breakdown.promoCode}</strong> (-${breakdown.discountPercent}%)
              </span>
              <span class="receipt-val discount-val">${breakdown.formatted.discountAmount}</span>
            </div>
          ` : ''}

          <div class="receipt-divider"></div>

          <div class="receipt-row total-row">
            <span class="receipt-total-label">Итоговая стоимость:</span>
            <span class="receipt-total-val">${breakdown.formatted.total}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle Order Confirmation
   */
  function handleConfirmOrder() {
    TelegramAdapter.haptic('notification', 'success');

    const breakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: state.isPromoApplied ? state.promoCode : null
    });

    const orderId = `TG-${Math.floor(10000 + Math.random() * 90000)}`;
    const orderTimestamp = new Date();

    const orderData = {
      orderId,
      timestamp: orderTimestamp.toISOString(),
      formattedDate: orderTimestamp.toLocaleString('ru-RU'),
      service: breakdown.service,
      fixedOptions: breakdown.fixedOptions,
      percentageOptions: breakdown.percentageOptions,
      promoCode: breakdown.promoCode,
      discountAmount: breakdown.discountAmount,
      totalRubles: breakdown.total,
      formattedTotal: breakdown.formatted.total,
      client: {
        name: clientNameInput.value.trim() || 'Не указано',
        contact: clientContactInput.value.trim() || (tgUser?.username ? `@${tgUser.username}` : 'Не указан'),
        comment: clientCommentInput.value.trim() || 'Без комментария'
      }
    };

    state.lastOrder = orderData;

    // Send data to Telegram bot if available
    TelegramAdapter.sendData({
      action: 'ORDER_SUBMITTED',
      ...orderData
    });

    showScreen('success');
  }

  /**
   * Render Success Screen (Screen 3)
   */
  function renderSuccessScreen() {
    if (!state.lastOrder) return;

    const order = state.lastOrder;
    successOrderId.textContent = `#${order.orderId}`;

    const extrasCount = order.fixedOptions.length + order.percentageOptions.length;
    const extrasList = [
      ...order.fixedOptions.map(o => o.name),
      ...order.percentageOptions.map(o => `${o.name} (+${o.percent}%)`)
    ];

    successSummaryContent.innerHTML = `
      <div class="success-receipt-box">
        <div class="success-row">
          <span class="s-label">Услуга:</span>
          <span class="s-val">${order.service.icon} ${order.service.name}</span>
        </div>
        <div class="success-row">
          <span class="s-label">Срок исполнения:</span>
          <span class="s-val">${order.service.period}</span>
        </div>
        <div class="success-row">
          <span class="s-label">Доп. опции (${extrasCount}):</span>
          <span class="s-val">${extrasCount > 0 ? extrasList.join(', ') : 'Не выбраны'}</span>
        </div>
        ${order.promoCode ? `
          <div class="success-row promo-highlight">
            <span class="s-label">Промокод:</span>
            <span class="s-val">🎁 ${order.promoCode} (-${order.discountAmount.toLocaleString('ru-RU')} ₽)</span>
          </div>
        ` : ''}
        <div class="success-row">
          <span class="s-label">Клиент:</span>
          <span class="s-val">${escapeHtml(order.client.name)} (${escapeHtml(order.client.contact)})</span>
        </div>
        <div class="success-divider"></div>
        <div class="success-row total-highlight">
          <span class="s-label">Итого к оплате:</span>
          <span class="s-val-total">${order.formattedTotal}</span>
        </div>
      </div>
    `;
  }

  /**
   * Reset Calculator to initial state
   */
  function resetCalculator() {
    state.selectedServiceId = 'landing';
    state.selectedOptions.clear();
    state.promoCode = '';
    state.isPromoApplied = false;
    promoInput.value = '';
    appliedPromoBadge.style.display = 'none';
    promoMessage.textContent = '';
    promoMessage.className = 'promo-message';
    clientCommentInput.value = '';

    // Reset services UI
    const cards = servicesList.querySelectorAll('.service-card');
    cards.forEach(card => {
      const isSelected = card.dataset.serviceId === 'landing';
      card.classList.toggle('selected', isSelected);
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      const radio = card.querySelector('.service-radio');
      if (radio) radio.classList.toggle('checked', isSelected);
    });

    // Reset fixed options UI
    fixedOptionsList.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('active');
      card.setAttribute('aria-checked', 'false');
      const sw = card.querySelector('.custom-switch');
      if (sw) sw.classList.remove('active');
    });

    // Reset percentage options UI and chips
    const baseService = SERVICES_DATA[0];
    percentageOptionsList.querySelectorAll('.option-card').forEach(card => {
      card.classList.remove('active');
      card.setAttribute('aria-checked', 'false');
      const sw = card.querySelector('.custom-switch');
      if (sw) sw.classList.remove('active');
      const optId = card.dataset.optionId;
      const opt = PERCENTAGE_OPTIONS_DATA.find(o => o.id === optId);
      if (opt) {
        const calculatedRub = Math.round(baseService.price * (opt.percent / 100));
        const rubSpan = card.querySelector('.pct-rub');
        if (rubSpan) rubSpan.textContent = `(+${formatRubles(calculatedRub)})`;
      }
    });

    const freshBreakdown = calculateCost({
      selectedServiceId: state.selectedServiceId,
      selectedOptions: state.selectedOptions,
      promoCode: null
    });
    syncMainButton(freshBreakdown);
    updateCalculation(freshBreakdown);
  }

  /**
   * Copy Order Summary to Clipboard
   */
  function handleCopyOrderDetails() {
    if (!state.lastOrder) return;
    const o = state.lastOrder;
    const extras = [
      ...o.fixedOptions.map(i => `• ${i.name} (+${formatRubles(i.price)})`),
      ...o.percentageOptions.map(i => `• ${i.name} (+${i.percent}% / +${formatRubles(i.calculatedAmount)})`)
    ].join('\n');

    const textToCopy = `📋 Заказ #${o.orderId}\n` +
      `-------------------------\n` +
      `Услуга: ${o.service.name} (${formatRubles(o.service.price)})\n` +
      (extras ? `Опции:\n${extras}\n` : `Опции: не выбраны\n`) +
      (o.promoCode ? `Промокод: ${o.promoCode} (-${formatRubles(o.discountAmount)})\n` : '') +
      `Итого: ${o.formattedTotal}\n` +
      `-------------------------\n` +
      `Клиент: ${o.client.name} (${o.client.contact})\n` +
      `Комментарий: ${o.client.comment}`;

    function copyText(str) {
      if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(str);
      }
      return new Promise((resolve, reject) => {
        const ta = document.createElement('textarea');
        ta.value = str;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try {
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) resolve();
          else reject(new Error('execCommand failed'));
        } catch (err) {
          document.body.removeChild(ta);
          reject(err);
        }
      });
    }

    copyText(textToCopy).then(() => {
      TelegramAdapter.haptic('notification', 'success');
      copyOrderBtn.textContent = '✓ Скопировано в буфер!';
      setTimeout(() => {
        copyOrderBtn.textContent = '📋 Скопировать детали заказа';
      }, 2500);
    }).catch(() => {
      prompt('Скопируйте детали заказа вручную:', textToCopy);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
