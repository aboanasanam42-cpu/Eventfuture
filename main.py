"""
MEXC Event Futures strategy simulator entry point.
This worker does not submit real exchange orders.
"""
from bot import MexcEventBot


if __name__ == "__main__":
    print("=================================================================")
    print(" MEXC EVENT FUTURES 10-MINUTE PAPER SIMULATOR                    ")
    print(" Market source: live MEXC public data when available             ")
    print(" Execution: SIMULATION ONLY — NO REAL EXCHANGE ORDERS            ")
    print(" The 80% payout is a local assumption, not an exchange guarantee ")
    print("=================================================================")
    bot = MexcEventBot()
    bot.run_loop()
