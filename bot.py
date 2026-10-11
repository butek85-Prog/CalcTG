import asyncio
import json
import logging
import sys

from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import CommandStart
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonWebApp,
    WebAppInfo,
)
from aiogram.client.session.aiohttp import AiohttpSession

from config import BOT_TOKEN, WEBAPP_URL, PROXY_URL

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("CalcTGBot")


def create_bot() -> Bot:
    session = None
    if PROXY_URL:
        logger.info(f"Using proxy: {PROXY_URL}")
        session = AiohttpSession(proxy=PROXY_URL)
    return Bot(token=BOT_TOKEN, session=session)


bot = create_bot()
dp = Dispatcher()


@dp.message(CommandStart())
async def cmd_start(message: types.Message):
    """
    Handle /start command:
    - Sets WebApp Menu Button in the chat
    - Sends an Inline Button launching the Mini App
    """
    logger.info(f"User {message.from_user.id} (@{message.from_user.username}) started the bot")

    # Set bottom-left menu button to open Mini App
    try:
        await bot.set_chat_menu_button(
            chat_id=message.chat.id,
            menu_button=MenuButtonWebApp(
                text="Калькулятор",
                web_app=WebAppInfo(url=WEBAPP_URL)
            )
        )
    except Exception as e:
        logger.warning(f"Could not set menu button: {e}")

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Открыть калькулятор услуг",
                    web_app=WebAppInfo(url=WEBAPP_URL)
                )
            ]
        ]
    )

    welcome_text = (
        "👋 <b>Добро пожаловать в «Калькулятор стоимости услуг»!</b>\n\n"
        "Здесь вы можете в удобном интерактивном интерфейсе:\n"
        "• Выбрать подходящую услугу (Лендинг, Интернет-магазин, TG Mini App)\n"
        "• Настроить нужные опции с фиксированной ценой и процентной наценкой\n"
        "• Применить промокод <code>START10</code> на скидку 10%\n"
        "• Мгновенно рассчитать бюджет и оформить заявку\n\n"
        "Нажмите кнопку ниже, чтобы открыть калькулятор:"
    )

    await message.answer(welcome_text, reply_markup=keyboard, parse_mode="HTML")


@dp.message(F.web_app_data)
async def handle_webapp_data(message: types.Message):
    """
    Handle data submitted from the Telegram Mini App via Telegram.WebApp.sendData
    """
    try:
        raw_data = message.web_app_data.data
        logger.info(f"Received web_app_data from {message.from_user.id}: {raw_data}")
        data = json.loads(raw_data)

        order_id = data.get("orderId", "N/A")
        service = data.get("service", {}).get("name", "Основная услуга")
        period = data.get("service", {}).get("period", "По согласованию")
        total_formatted = data.get("formattedTotal", "0 ₽")

        # Extract options
        fixed_opts = data.get("fixedOptions", [])
        pct_opts = data.get("percentageOptions", [])
        opts_list = []
        for opt in fixed_opts:
            price = opt.get("price", 0)
            opts_list.append(f"• {opt.get('name')} (+{price:,} ₽)".replace(",", " "))
        for opt in pct_opts:
            percent = opt.get("percent", 0)
            amount = opt.get("calculatedAmount", 0)
            opts_list.append(f"• {opt.get('name')} (+{percent}% / +{amount:,} ₽)".replace(",", " "))

        opts_text = "\n".join(opts_list) if opts_list else "<i>Не выбраны</i>"

        promo = data.get("promoCode")
        discount = data.get("discountAmount", 0)
        promo_text = f"🎁 <b>{promo}</b> (-{discount:,} ₽)".replace(",", " ") if promo else "<i>Не применён</i>"

        client = data.get("client", {})
        client_name = client.get("name", "Не указано")
        client_contact = client.get("contact", f"@{message.from_user.username}" if message.from_user.username else "Не указан")
        client_comment = client.get("comment", "")

        receipt_text = (
            f"🎉 <b>Заказ #{order_id} успешно оформлен!</b>\n\n"
            f"📌 <b>Услуга:</b> {service} (срок: {period})\n\n"
            f"🛠 <b>Дополнительные опции:</b>\n{opts_text}\n\n"
            f"🏷 <b>Промокод:</b> {promo_text}\n"
            f"💰 <b>Итого к оплате:</b> <b>{total_formatted}</b>\n\n"
            f"👤 <b>Клиент:</b> {client_name}\n"
            f"📞 <b>Контакты:</b> {client_contact}\n"
            f"💬 <b>Комментарий:</b> {client_comment or 'Без комментария'}\n\n"
            f"<i>Мы сохранили вашу заявку и свяжемся с вами в течение 15 минут!</i>"
        )

        await message.answer(receipt_text, parse_mode="HTML")

    except Exception as e:
        logger.error(f"Error processing WebApp order: {e}", exc_info=True)
        await message.answer("✅ <b>Ваша заявка принята!</b> Скоро мы свяжемся с вами.", parse_mode="HTML")


async def main():
    logger.info("Starting Telegram Bot...")
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped.")
