"""
Test suite for Telegram Mini App 'Калькулятор стоимости услуги'
Verifies business logic, pricing mathematics, promo code validation,
HTML structure, Telegram SDK integration, and CSS safe area declarations.
"""

import os
import re
import math
import unittest

class TestCalculatorLogic(unittest.TestCase):
  """Tests the exact mathematical and business rules specified in the requirements."""

  SERVICES = {
    'landing': {'name': 'Лендинг', 'price': 15000},
    'shop': {'name': 'Интернет-магазин', 'price': 32000},
    'bot': {'name': 'Telegram Mini App', 'price': 45000}
  }

  FIXED_OPTIONS = {
    'opt_payments': 6000,
    'opt_crm': 8000,
    'opt_seo': 4500,
    'opt_domain': 3000
  }

  PERCENTAGE_OPTIONS = {
    'pct_urgent': 30,
    'pct_design': 20,
    'pct_support': 15
  }

  def calculate(self, service_id, selected_options, promo_code=None):
    service = self.SERVICES[service_id]
    base_price = service['price']

    # Fixed options sum
    fixed_total = sum(self.FIXED_OPTIONS[opt] for opt in selected_options if opt in self.FIXED_OPTIONS)

    # Percentage options (calculated from base price)
    pct_total = sum(round(base_price * (self.PERCENTAGE_OPTIONS[opt] / 100)) for opt in selected_options if opt in self.PERCENTAGE_OPTIONS)

    subtotal = base_price + fixed_total + pct_total

    clean_promo = (promo_code or '').strip().upper()
    is_promo_valid = (clean_promo == 'START10')
    discount_percent = 10 if is_promo_valid else 0
    discount_amount = round(subtotal * (discount_percent / 100)) if is_promo_valid else 0

    total = max(0, subtotal - discount_amount)

    return {
      'base_price': base_price,
      'fixed_total': fixed_total,
      'pct_total': pct_total,
      'subtotal': subtotal,
      'is_promo_valid': is_promo_valid,
      'discount_percent': discount_percent,
      'discount_amount': discount_amount,
      'total': total
    }

  def test_base_service_only(self):
    res = self.calculate('landing', [])
    self.assertEqual(res['base_price'], 15000)
    self.assertEqual(res['fixed_total'], 0)
    self.assertEqual(res['pct_total'], 0)
    self.assertEqual(res['subtotal'], 15000)
    self.assertEqual(res['total'], 15000)

  def test_fixed_options_calculation(self):
    # Landing (15000) + Payments (6000) + CRM (8000) = 29000
    res = self.calculate('landing', ['opt_payments', 'opt_crm'])
    self.assertEqual(res['base_price'], 15000)
    self.assertEqual(res['fixed_total'], 14000)
    self.assertEqual(res['subtotal'], 29000)
    self.assertEqual(res['total'], 29000)

  def test_percentage_options_calculation(self):
    # Shop (32000) + Urgent 30% (9600) + Design 20% (6400) = 48000
    res = self.calculate('shop', ['pct_urgent', 'pct_design'])
    self.assertEqual(res['base_price'], 32000)
    self.assertEqual(res['pct_total'], 9600 + 6400)
    self.assertEqual(res['subtotal'], 48000)
    self.assertEqual(res['total'], 48000)

  def test_mixed_options_with_promo_start10(self):
    # Bot (45000) + Payments (6000) + Urgent 30% (13500) = Subtotal 64500
    # START10 discount = 10% of 64500 = 6450
    # Total = 64500 - 6450 = 58050
    res = self.calculate('bot', ['opt_payments', 'pct_urgent'], promo_code='START10')
    self.assertEqual(res['base_price'], 45000)
    self.assertEqual(res['fixed_total'], 6000)
    self.assertEqual(res['pct_total'], 13500)
    self.assertEqual(res['subtotal'], 64500)
    self.assertTrue(res['is_promo_valid'])
    self.assertEqual(res['discount_amount'], 6450)
    self.assertEqual(res['total'], 58050)

  def test_promo_case_insensitivity_and_whitespace(self):
    res_lower = self.calculate('landing', [], promo_code='  start10  ')
    self.assertTrue(res_lower['is_promo_valid'])
    self.assertEqual(res_lower['discount_amount'], 1500)
    self.assertEqual(res_lower['total'], 13500)

  def test_invalid_promo(self):
    res_inv = self.calculate('landing', [], promo_code='INVALID99')
    self.assertFalse(res_inv['is_promo_valid'])
    self.assertEqual(res_inv['discount_amount'], 0)
    self.assertEqual(res_inv['total'], 15000)


class TestAppFilesAndMarkup(unittest.TestCase):
  """Verifies the files on disk and required elements in HTML, CSS, and JS."""

  def setUp(self):
    self.root = os.path.dirname(os.path.abspath(__file__))

  def test_files_exist(self):
    required_files = [
      'index.html',
      'css/styles.css',
      'js/calculator.js',
      'js/tg-adapter.js',
      'js/app.js'
    ]
    for rel_path in required_files:
      full_path = os.path.join(self.root, rel_path)
      self.assertTrue(os.path.isfile(full_path), f"File {rel_path} must exist")

  def test_html_contains_required_elements(self):
    with open(os.path.join(self.root, 'index.html'), 'r', encoding='utf-8') as f:
      html = f.read()

    # Telegram SDK
    self.assertIn('telegram-web-app.js', html, "Must link to Telegram WebApp SDK")

    # 3 Screens
    self.assertIn('id="screenCalc"', html, "Must contain screen 1 (calculator)")
    self.assertIn('id="screenReview"', html, "Must contain screen 2 (review)")
    self.assertIn('id="screenSuccess"', html, "Must contain screen 3 (success)")

    # Promo code START10 mention
    self.assertIn('START10', html, "Must mention or support START10 promo")

    # Floating browser MainButton fallback
    self.assertIn('id="browserBottomBar"', html, "Must have fallback bottom bar for browser")
    self.assertIn('id="browserMainBtn"', html, "Must have fallback MainButton for browser")

    # Safe back navigation
    self.assertIn('id="pageBackBtn"', html, "Must have in-page back button")
    self.assertIn('id="editSelectionBtn"', html, "Must have edit selection button on review screen")

  def test_css_contains_safe_area_and_telegram_vars(self):
    with open(os.path.join(self.root, 'css/styles.css'), 'r', encoding='utf-8') as f:
      css = f.read()

    # Safe area handling
    self.assertIn('safe-area-inset', css, "CSS must support safe-area insets")
    # Telegram theme CSS variables
    self.assertIn('--tg-theme-bg-color', css, "CSS must support Telegram theme variables")
    self.assertIn('--tg-theme-button-color', css, "CSS must support Telegram button color")
    self.assertIn('[data-theme="dark"]', css, "CSS must support dark theme")

  def test_js_contains_telegram_mainbutton_and_backbutton(self):
    with open(os.path.join(self.root, 'js/tg-adapter.js'), 'r', encoding='utf-8') as f:
      adapter_code = f.read()

    self.assertIn('MainButton', adapter_code, "Adapter must support Telegram MainButton")
    self.assertIn('BackButton', adapter_code, "Adapter must support Telegram BackButton")
    self.assertIn('HapticFeedback', adapter_code, "Adapter must support Telegram HapticFeedback")
    self.assertIn('safeAreaInset', adapter_code, "Adapter must support safeAreaInset")

  def test_app_js_synchronous_state_and_mainbutton_sync(self):
    with open(os.path.join(self.root, 'js', 'app.js'), 'r', encoding='utf-8') as f:
      app_code = f.read()

    # Verify selectService updates state before calculation and passes fresh breakdown
    self.assertIn('state.selectedServiceId = serviceId;', app_code)
    self.assertIn('updateCalculation(newBreakdown);', app_code)

    # Verify toggleFixedOption updates state before calculation and passes fresh breakdown
    self.assertIn('state.selectedOptions.add(optionId);', app_code)
    self.assertIn('state.selectedOptions.delete(optionId);', app_code)

    # Verify updateCalculation updates header badge and passes breakdown to syncMainButton
    self.assertIn('headerTotalBadge.textContent = breakdown.formatted.total', app_code)
    self.assertIn('syncMainButton(breakdown);', app_code)

    # Verify syncMainButton consumes fresh breakdown and sets identical text across all buttons
    self.assertIn('function syncMainButton(breakdown)', app_code)
    self.assertIn('Перейти к проверке • ${totalText}', app_code)

  def test_tg_adapter_always_calls_set_text_and_updates_browser_btn(self):
    with open(os.path.join(self.root, 'js', 'tg-adapter.js'), 'r', encoding='utf-8') as f:
      adapter_code = f.read()

    # Verify setText is unconditionally called on Telegram.WebApp.MainButton
    self.assertIn('tg.MainButton.setText(text)', adapter_code)
    # Verify browserBtn.textContent is unconditionally updated
    self.assertIn('browserBtn.textContent = text', adapter_code)

if __name__ == '__main__':
  unittest.main()
