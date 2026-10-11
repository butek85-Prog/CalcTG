"""
Unit test for bot configuration and router registration
"""
import unittest
from config import BOT_TOKEN, WEBAPP_URL
from bot import dp, cmd_start, handle_webapp_data

class TestBotSetup(unittest.TestCase):
    def test_token_loaded(self):
        self.assertEqual(BOT_TOKEN, "8980754849:AAGw3dSc4dL_kvqIPjdedUTG5xFnyD48yHM")
        self.assertTrue(len(BOT_TOKEN) > 20)

    def test_webapp_url_configured(self):
        self.assertTrue(bool(WEBAPP_URL))

    def test_handlers_registered(self):
        # Verify Dispatcher has message handlers registered
        self.assertTrue(len(dp.message.handlers) >= 2)

if __name__ == "__main__":
    unittest.main()
