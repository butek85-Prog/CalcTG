/**
 * Telegram WebApp Adapter
 * Provides seamless integration with Telegram Mini App API and browser fallbacks.
 */

const TelegramAdapter = (() => {
  function getTg() {
    return (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp)
      ? window.Telegram.WebApp
      : null;
  }

  const tg = getTg();

  // Telegram environment detection:
  // In real Telegram, initData is present or platform is not 'unknown' and parent != window or webapp headers exist
  function isInsideTelegram() {
    const activeTg = getTg();
    return Boolean(
      activeTg && (
        (activeTg.initData && activeTg.initData.length > 0) ||
        (activeTg.platform && activeTg.platform !== 'unknown')
      )
    );
  }

  let mainButtonCallback = null;
  let backButtonCallback = null;

  /**
   * Initialize WebApp environment
   */
  function init() {
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        if (typeof tg.enableClosingConfirmation === 'function') {
          tg.enableClosingConfirmation();
        }
      } catch (e) {
        console.warn('Telegram WebApp init warning:', e);
      }

      // Stable delegates registered ONCE on startup
      if (tg.MainButton && typeof tg.MainButton.onClick === 'function') {
        try {
          tg.MainButton.onClick(() => {
            if (typeof mainButtonCallback === 'function') {
              mainButtonCallback();
            }
          });
        } catch (e) {}
      }

      if (tg.BackButton && typeof tg.BackButton.onClick === 'function') {
        try {
          tg.BackButton.onClick(() => {
            if (typeof backButtonCallback === 'function') {
              backButtonCallback();
            }
          });
        } catch (e) {}
      }

      // Listen for Telegram events
      tg.onEvent('themeChanged', handleThemeChange);
      tg.onEvent('viewportChanged', handleViewportChange);
    }

    applyTheme();
    handleViewportChange();
  }

  /**
   * Apply Telegram theme or fallback browser theme
   */
  function applyTheme() {
    const root = document.documentElement;

    if (tg && tg.themeParams && Object.keys(tg.themeParams).length > 0) {
      const p = tg.themeParams;
      if (p.bg_color) root.style.setProperty('--tg-theme-bg-color', p.bg_color);
      if (p.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', p.secondary_bg_color);
      if (p.text_color) root.style.setProperty('--tg-theme-text-color', p.text_color);
      if (p.hint_color) root.style.setProperty('--tg-theme-hint-color', p.hint_color);
      if (p.link_color) root.style.setProperty('--tg-theme-link-color', p.link_color);
      if (p.button_color) root.style.setProperty('--tg-theme-button-color', p.button_color);
      if (p.button_text_color) root.style.setProperty('--tg-theme-button-text-color', p.button_text_color);
      if (p.header_bg_color) root.style.setProperty('--tg-theme-header-bg-color', p.header_bg_color);
      if (p.section_bg_color) root.style.setProperty('--tg-theme-section-bg-color', p.section_bg_color);
      if (p.section_separator_color) root.style.setProperty('--tg-theme-section-separator-color', p.section_separator_color);

      const colorScheme = tg.colorScheme || (isDark(p.bg_color) ? 'dark' : 'light');
      root.setAttribute('data-theme', colorScheme);
    } else {
      // Browser fallback theme detection
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const savedTheme = localStorage.getItem('calctg_theme') || (prefersDark ? 'dark' : 'light');
      root.setAttribute('data-theme', savedTheme);
    }
  }

  function isDark(hex) {
    if (!hex) return false;
    const c = hex.replace('#', '');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  function toggleBrowserTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('calctg_theme', next);
    return next;
  }

  /**
   * Handle safe area and viewport
   */
  function handleViewportChange() {
    const root = document.documentElement;
    if (tg) {
      if (tg.viewportHeight) {
        root.style.setProperty('--tg-viewport-height', `${tg.viewportHeight}px`);
      }
      if (tg.safeAreaInset) {
        root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
        root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
        root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
        root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
      }
      if (tg.contentSafeAreaInset) {
        root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
        root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
      }
    }
  }

  function handleThemeChange() {
    applyTheme();
  }

  /**
   * Main Button management (TG native + Browser DOM fallback)
   */
  function setMainButton(params) {
    if (!params) return;
    const btnText = String(params.text || '');
    const onClick = params.onClick;
    const isVisible = params.isVisible !== undefined ? params.isVisible : true;
    const isActive = params.isActive !== undefined ? params.isActive : true;

    mainButtonCallback = onClick || null;

    // 1. Native Telegram MainButton - Synchronous setText with zero debounces, timers, or queues
    const activeTg = (typeof window !== 'undefined' && window.Telegram && window.Telegram.WebApp)
      ? window.Telegram.WebApp
      : null;
    if (activeTg && activeTg.MainButton) {
      try {
        if (btnText && typeof activeTg.MainButton.setText === 'function') {
          activeTg.MainButton.setText(btnText);
        }
        if (isVisible && typeof activeTg.MainButton.show === 'function') {
          activeTg.MainButton.show();
        } else if (!isVisible && typeof activeTg.MainButton.hide === 'function') {
          activeTg.MainButton.hide();
        }
        if (isActive && typeof activeTg.MainButton.enable === 'function') {
          activeTg.MainButton.enable();
        } else if (!isActive && typeof activeTg.MainButton.disable === 'function') {
          activeTg.MainButton.disable();
        }
      } catch (e) {
        console.warn('setMainButton error:', e);
      }
    }

    // 2. Fixed footer / Browser DOM Fallback buttons
    const browserBar = document.getElementById('browserBottomBar');
    const browserBtn = document.getElementById('browserMainBtn');
    if (browserBtn) {
      browserBtn.textContent = btnText;
      browserBtn.disabled = !isActive;
      browserBtn.onclick = () => {
        haptic('impact', 'medium');
        if (onClick) onClick();
      };
    }
    const goToReviewBtn = document.getElementById('goToReviewBtn');
    if (goToReviewBtn) {
      goToReviewBtn.textContent = btnText;
    }
    if (browserBar) {
      if (isInsideTelegram()) {
        browserBar.style.display = 'none';
      } else {
        browserBar.style.display = isVisible ? 'block' : 'none';
      }
    }
  }

  function updateMainButtonText(text) {
    const btnText = String(text || '');
    const activeTg = getTg();
    if (activeTg && activeTg.MainButton && btnText) {
      try {
        if (typeof activeTg.MainButton.setText === 'function') {
          activeTg.MainButton.setText(btnText);
        }
        if (typeof activeTg.MainButton.setParams === 'function') {
          activeTg.MainButton.setParams({ text: btnText });
        }
      } catch (e) {
        console.warn('updateMainButtonText error:', e);
      }
    }
    const browserBtn = document.getElementById('browserMainBtn');
    if (browserBtn && btnText) {
      browserBtn.textContent = btnText;
    }
  }

  function hideMainButton() {
    mainButtonCallback = null;
    const activeTg = getTg();
    if (activeTg && activeTg.MainButton) {
      try {
        if (typeof activeTg.MainButton.setParams === 'function') {
          activeTg.MainButton.setParams({ is_visible: false });
        } else {
          activeTg.MainButton.hide();
        }
      } catch (e) {}
    }
    const browserBar = document.getElementById('browserBottomBar');
    if (browserBar) {
      browserBar.style.display = 'none';
    }
  }

  /**
   * Back Button management
   */
  function setBackButton({ onClick, isVisible = true }) {
    backButtonCallback = onClick || null;

    if (tg && tg.BackButton) {
      try {
        if (isVisible) tg.BackButton.show();
        else tg.BackButton.hide();
      } catch (e) {}
    }

    // Browser in-page back button
    const pageBackBtn = document.getElementById('pageBackBtn');
    if (pageBackBtn) {
      pageBackBtn.style.display = isVisible ? 'inline-flex' : 'none';
      if (isVisible && onClick) {
        pageBackBtn.onclick = () => {
          haptic('impact', 'light');
          onClick();
        };
      }
    }
  }

  function hideBackButton() {
    setBackButton({ isVisible: false });
  }

  /**
   * Haptic feedback helper
   */
  function haptic(type = 'impact', style = 'light') {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (type === 'impact') {
        tg.HapticFeedback.impactOccurred(style); // 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
      } else if (type === 'notification') {
        tg.HapticFeedback.notificationOccurred(style); // 'error' | 'success' | 'warning'
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      }
    } catch (e) {}
  }

  /**
   * Close WebApp
   */
  function close() {
    if (tg && typeof tg.close === 'function') {
      try {
        tg.close();
      } catch (e) {}
    }
  }

  /**
   * Send data back to Telegram bot (if launched from keyboard button)
   */
  function sendData(data) {
    if (tg && typeof tg.sendData === 'function') {
      try {
        tg.sendData(typeof data === 'string' ? data : JSON.stringify(data));
      } catch (e) {
        console.warn('sendData error:', e);
      }
    }
  }

  /**
   * Get user data from Telegram if available
   */
  function getUser() {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      return tg.initDataUnsafe.user;
    }
    return null;
  }

  return {
    get tg() {
      return getTg();
    },
    isInsideTelegram,
    init,
    applyTheme,
    toggleBrowserTheme,
    setMainButton,
    updateMainButtonText,
    hideMainButton,
    setBackButton,
    hideBackButton,
    haptic,
    close,
    sendData,
    getUser
  };
})();

// Export for module/global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramAdapter;
}
