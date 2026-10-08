"""
MEXC Event Futures (العقود الآجلة للأحداث) 10-Minute Quantitative Trading Bot
Entry point for Railway worker (main.py)
"""
import sys
import os

# Delegate directly to our Event Futures Bot
if __name__ == "__main__":
    from bot import MexcEventBot
    print("=================================================================")
    print(" 🚀 STARTING MEXC EVENT FUTURES 10-MINUTE QUANTITATIVE BOT       ")
    print(" Strategy: 10m Binary Expiry Cycles on BTCUSDT (15m Indicators) ")
    print(" Fixed Stake: 3.00 USDT | Return: 80% (5.40 USDT)               ")
    print(" Risk Circuit Breaker: 3 Consecutive Losses / $9 Daily Loss Max  ")
    print("=================================================================")
    bot = MexcEventBot()
    bot.run_loop()
