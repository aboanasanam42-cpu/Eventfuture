import os
import time
import hmac
import hashlib
import json
import logging
import math
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("MEXC_Event_Bot")

# Configuration
SYMBOL = os.getenv("SYMBOL", "BTCUSDT")
TRADE_AMOUNT = float(os.getenv("TRADE_AMOUNT_USDT", "3.0"))
CYCLE_MINUTES = int(os.getenv("CYCLE_DURATION_MINUTES", "10"))
MAX_DAILY_LOSS = float(os.getenv("MAX_DAILY_LOSS_USDT", "9.0"))
MAX_CONSECUTIVE_LOSSES = int(os.getenv("MAX_CONSECUTIVE_LOSSES", "3"))
TRADING_MODE = os.getenv("TRADING_MODE", "simulation").lower()
MEXC_API_KEY = os.getenv("MEXC_API_KEY", "")
MEXC_API_SECRET = os.getenv("MEXC_SECRET_KEY") or os.getenv("MEXC_API_SECRET", "")
TRAILING_TP_ENABLED = os.getenv("TRAILING_TP_ENABLED", "false").lower() in ("true", "1", "yes")

CONTRACT_BASE = "https://contract.mexc.com"
SPOT_BASE = "https://api.mexc.com"

class MexcEventBot:
    def __init__(self):
        if TRADING_MODE == "live":
            raise RuntimeError(
                "LIVE TRADING BLOCKED: this Python worker does not submit verified MEXC Event Futures orders. "
                "Set TRADING_MODE=simulation; no live order will be attempted."
            )
        if TRADING_MODE != "simulation":
            raise RuntimeError("TRADING_MODE must be 'simulation' until a documented event-order API is available.")
        self.daily_pnl = 0.0
        self.consecutive_losses = 0
        self.is_halted = False
        self.halt_reason = ""
        self.active_contract = None
        self.last_reset_day = datetime.now(timezone.utc).day

        logger.info("=" * 60)
        logger.info("🚀 MEXC EVENT FUTURES (عقود الأحداث) 10-MINUTE BOT ACTIVE")
        logger.info(f"Target: {SYMBOL} | Expiry Cycle: {CYCLE_MINUTES} Minutes | Mode: {TRADING_MODE.upper()}")
        logger.info(f"Fixed Stake: {TRADE_AMOUNT} USDT | Payout: 80% (Gross Return: ${TRADE_AMOUNT * 1.8:.2f})")
        logger.info(f"Risk Limits: Stop at {MAX_CONSECUTIVE_LOSSES} Consecutive Losses or -${MAX_DAILY_LOSS} Daily")
        logger.info("=" * 60)

    def sign(self, body_str: str, req_time: int) -> str:
        if not MEXC_API_SECRET:
            return ""
        sign_data = f"{MEXC_API_KEY}{req_time}{body_str}"
        return hmac.new(MEXC_API_SECRET.encode('utf-8'), sign_data.encode('utf-8'), hashlib.sha256).hexdigest()

    def fetch_ticker(self):
        symbol_fmt = f"{SYMBOL.replace('USDT', '')}_USDT" if "_" not in SYMBOL else SYMBOL
        try:
            r = requests.get(f"{CONTRACT_BASE}/api/v1/contract/ticker?symbol={symbol_fmt}", timeout=5)
            if r.status_code == 200:
                d = r.json()
                if d.get("success") and d.get("data"):
                    price = float(d["data"].get("lastPrice") or d["data"].get("fairPrice") or 0)
                    if math.isfinite(price) and price > 0:
                        return price
        except Exception:
            pass
        try:
            r = requests.get(f"{SPOT_BASE}/api/v3/ticker/price?symbol={SYMBOL.replace('_', '')}", timeout=5)
            if r.status_code == 200:
                price = float(r.json().get("price") or 0)
                if math.isfinite(price) and price > 0:
                    return price
        except Exception:
            pass
        logger.warning("No valid live ticker received from MEXC contract or spot API.")
        return None

    def fetch_15m_candles(self, limit=50):
        symbol_fmt = f"{SYMBOL.replace('USDT', '')}_USDT" if "_" not in SYMBOL else SYMBOL
        try:
            r = requests.get(f"{CONTRACT_BASE}/api/v1/contract/kline/{symbol_fmt}?interval=Min15&limit={limit}", timeout=5)
            if r.status_code == 200:
                d = r.json()
                if d.get("success") and d.get("data"):
                    closes = [float(c) for c in d["data"].get("close", [])]
                    if len(closes) >= 20 and all(math.isfinite(x) and x > 0 for x in closes):
                        return closes
        except Exception:
            pass

        try:
            r = requests.get(f"{SPOT_BASE}/api/v3/klines?symbol={SYMBOL.replace('_', '')}&interval=15m&limit={limit}", timeout=5)
            if r.status_code == 200:
                data = r.json()
                closes = [float(k[4]) for k in data]
                if len(closes) >= 20 and all(math.isfinite(x) and x > 0 for x in closes):
                    return closes
        except Exception:
            pass

        logger.warning("No valid live candles received from MEXC; signal generation is paused.")
        return []

    def calculate_rsi(self, closes, period=14):
        if len(closes) <= period:
            return 50.0
        gains, losses = 0.0, 0.0
        for i in range(1, period + 1):
            diff = closes[i] - closes[i - 1]
            if diff >= 0:
                gains += diff
            else:
                losses += abs(diff)
        avg_gain = gains / period
        avg_loss = losses / period
        for i in range(period + 1, len(closes)):
            diff = closes[i] - closes[i - 1]
            gain = diff if diff > 0 else 0
            loss = abs(diff) if diff < 0 else 0
            avg_gain = (avg_gain * (period - 1) + gain) / period
            avg_loss = (avg_loss * (period - 1) + loss) / period
        if avg_loss == 0:
            return 100.0
        rs = avg_gain / avg_loss
        return round(100.0 - (100.0 / (1.0 + rs)), 1)

    def calculate_bollinger_bands(self, closes, period=20, mult=2.0):
        if len(closes) < period:
            last = closes[-1]
            return last * 1.01, last, last * 0.99, 0.5
        slice_vals = closes[-period:]
        mean = sum(slice_vals) / period
        var = sum((x - mean) ** 2 for x in slice_vals) / period
        std = math.sqrt(var)
        upper = mean + mult * std
        lower = mean - mult * std
        last_price = closes[-1]
        pct_b = (last_price - lower) / (upper - lower) if upper != lower else 0.5
        return upper, mean, lower, pct_b

    def generate_signal(self):
        closes = self.fetch_15m_candles()
        if len(closes) < 20:
            return {
                "direction": "NEUTRAL",
                "direction_ar": "محايد",
                "rsi": 50.0,
                "bb_lower": 0.0,
                "bb_upper": 0.0,
                "last_price": closes[-1] if closes else 0.0,
                "reasons": "No verified live candles; trade skipped"
            }
        rsi = self.calculate_rsi(closes)
        upper, middle, lower, pct_b = self.calculate_bollinger_bands(closes)
        last_price = closes[-1]

        score = 0
        reasons = []

        if rsi <= 30:
            score += 45
            reasons.append(f"RSI oversold ({rsi} <= 30)")
        elif rsi >= 70:
            score -= 45
            reasons.append(f"RSI overbought ({rsi} >= 70)")
        elif rsi > 50:
            score += 15
            reasons.append(f"RSI above 50 ({rsi})")
        else:
            score -= 15
            reasons.append(f"RSI below 50 ({rsi})")

        if pct_b <= 0.15:
            score += 40
            reasons.append("Price touching BB lower band (Mean Reversion UP)")
        elif pct_b >= 0.85:
            score -= 40
            reasons.append("Price touching BB upper band (Rejection DOWN)")

        direction = "UP" if score > 15 else ("DOWN" if score < -15 else "NEUTRAL")
        direction_ar = "أعلى" if direction == "UP" else ("أقل" if direction == "DOWN" else "محايد")
        return {
            "direction": direction,
            "direction_ar": direction_ar,
            "rsi": rsi,
            "bb_lower": lower,
            "bb_upper": upper,
            "last_price": last_price,
            "reasons": " | ".join(reasons)
        }

    def place_order(self, direction):
        if self.is_halted:
            logger.warning(f"Trade halted by Risk Controller: {self.halt_reason}")
            return

        current_price = self.fetch_ticker()
        if current_price is None or not math.isfinite(current_price) or current_price <= 0:
            logger.error("Trade skipped because no valid live MEXC price is available.")
            return
        now = time.time()
        expiry = now + (CYCLE_MINUTES * 60)
        direction_ar = "أعلى" if direction == "UP" else "أقل"

        self.active_contract = {
            "id": f"EVT-{int(now)}",
            "direction": direction,
            "direction_ar": direction_ar,
            "entry_price": current_price,
            "expiry_time": expiry,
            "amount": TRADE_AMOUNT,
            "payout_pct": 0.80
        }

        logger.info(f"🚀 OPENED 10m EVENT CONTRACT [{self.active_contract['id']}]: Direction {direction} ({direction_ar}) @ ${current_price:.2f} | Stake: {TRADE_AMOUNT} USDT")

    def settle_contract(self):
        if not self.active_contract:
            return

        settle_price = self.fetch_ticker()
        if settle_price is None or not math.isfinite(settle_price) or settle_price <= 0:
            logger.error("Settlement delayed: no valid live MEXC price is available.")
            return
        contract = self.active_contract
        diff = settle_price - contract["entry_price"]
        won = (contract["direction"] == "UP" and diff > 0) or (contract["direction"] == "DOWN" and diff < 0)

        if won:
            net_profit = contract["amount"] * contract["payout_pct"]
            self.daily_pnl += net_profit
            self.consecutive_losses = 0
            logger.info(f"✅ WON CONTRACT {contract['id']}! Entry: ${contract['entry_price']:.2f} -> Settle: ${settle_price:.2f} (+${net_profit:.2f} USDT). Daily PnL: ${self.daily_pnl:.2f}")
        else:
            self.daily_pnl -= contract["amount"]
            self.consecutive_losses += 1
            logger.warning(f"❌ LOST CONTRACT {contract['id']}! Entry: ${contract['entry_price']:.2f} -> Settle: ${settle_price:.2f} (-${contract['amount']:.2f} USDT). Consec Losses: {self.consecutive_losses}")

            if self.consecutive_losses >= MAX_CONSECUTIVE_LOSSES:
                self.is_halted = True
                self.halt_reason = f"Hit {MAX_CONSECUTIVE_LOSSES} consecutive losses limit"
                logger.error(f"🛑 CIRCUIT BREAKER TRIGGERED: {self.halt_reason}. Pausing trades for today.")
            elif self.daily_pnl <= -MAX_DAILY_LOSS:
                self.is_halted = True
                self.halt_reason = f"Hit daily loss limit of -${MAX_DAILY_LOSS}"
                logger.error(f"🛑 CIRCUIT BREAKER TRIGGERED: {self.halt_reason}. Pausing trades for today.")

        self.active_contract = None

    def run_loop(self):
        logger.info("Starting MEXC 24/7 background worker loop...")
        cycle_sec = CYCLE_MINUTES * 60

        while True:
            try:
                # Check midnight UTC reset
                current_day = datetime.now(timezone.utc).day
                if current_day != self.last_reset_day:
                    self.last_reset_day = current_day
                    self.daily_pnl = 0.0
                    self.consecutive_losses = 0
                    self.is_halted = False
                    logger.info("New UTC trading day. Reset risk metrics.")

                now = time.time()

                # Check settlement
                if self.active_contract and now >= self.active_contract["expiry_time"]:
                    self.settle_contract()

                # Check 10m cycle window
                sec_in_cycle = int(now) % cycle_sec
                if not self.active_contract and not self.is_halted and sec_in_cycle < 10:
                    sig = self.generate_signal()
                    logger.info(f"Cycle Boundary Signal: {sig['direction']} ({sig['direction_ar']}) | RSI: {sig['rsi']} | Reasons: {sig['reasons']}")
                    if sig["direction"] in ["UP", "DOWN"]:
                        self.place_order(sig["direction"])

                time.sleep(2)
            except KeyboardInterrupt:
                logger.info("Worker stopped by user.")
                break
            except Exception as e:
                logger.error(f"Worker iteration error: {e}")
                time.sleep(5)

if __name__ == "__main__":
    bot = MexcEventBot()
    bot.run_loop()
