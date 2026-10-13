import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Token (loaded from .env)
BOT_TOKEN = os.getenv("BOT_TOKEN", "").strip()

# URL of the Mini App (HTTPS is required by Telegram)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://butek85-prog.github.io/CalcTG/?v=20261013-2")

# Optional proxy (HTTP or SOCKS5)
PROXY_URL = os.getenv("PROXY_URL", "").strip() or None
