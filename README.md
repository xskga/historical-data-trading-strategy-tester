# Trading Strategy Tester

A comprehensive web-based trading journal for backtesting strategies and analyzing performance. Built with vanilla JavaScript, SQL.js, and Tailwind CSS - runs entirely in your browser with no server required.

## Features

### Core Functionality
- **Multi-Account Management** - Create and track multiple trading accounts with custom leverage
- **Trade Recording** - Log complete trade details with automatic P&L and R/R ratio calculations
- **Risk-Based Position Sizing** - Automatic position size calculation based on risk percentage
- **Performance Analytics** - Detailed statistics per strategy: win rate, profit factor, average win/loss
- **Custom Tag System** - Create flexible transaction tags with multiple field types
- **Transaction Editing** - Full edit capability for all trade details and custom tags

### Data Management
- **Browser Storage** - All data stored locally using SQLite (SQL.js)
- **Export/Import** - Backup your complete database to file
- **Trading Rules & Mistakes Log** - Document your trading discipline and learning

## Quick Start

### Installation

```bash
git clone https://github.com/xskga/historical-data-trading-strategy-tester.git
cd historical-data-trading-strategy-tester
```

Open `app.html` in your browser - that's it! No build process, no dependencies to install.

### Usage

1. **Create an Account** - Click "+ Add Account" and set initial balance
2. **Add Strategies & Instruments** - Navigate to Settings section
3. **Record Trades** - Fill in trade details, calculator shows position size automatically
4. **Analyze Performance** - View dashboard and per-strategy statistics
5. **Backup Regularly** - Export your data to protect against browser data loss

## Position Size Calculation

Uses risk-based position sizing to maintain consistent risk across all trades:

```
Risk Amount ($) = Account Balance × (Risk % / 100)
Price Difference = |Entry Price - Stop Loss|
Position Size ($) = Risk Amount / Price Difference
```

**Example:** With $10,000 account, 1% risk, entry at 1.1000, stop at 1.0950:
- Risk Amount = $10,000 × 0.01 = $100
- Price Difference = 0.0050
- Position Size = $100 / 0.0050 = **$20,000**

This ensures you always risk exactly 1% regardless of stop distance.

## Technology Stack

- **SQL.js** - SQLite compiled to WebAssembly
- **Tailwind CSS** - Utility-first CSS framework
- **Vanilla JavaScript** - No frameworks, pure ES6+
- **LocalStorage API** - Browser persistence

## Database Schema

9 tables with relational structure:
- `accounts` - Trading account configurations
- `transactions` - Complete trade records
- `strategies` / `instruments` - Dropdowns and organization
- `tag_definitions` / `tag_fields` - Custom tag system
- `transaction_tags` / `transaction_tag_values` - Tag data per trade
- `settings` - Application preferences

## Project Structure

```
trading-tester/
├── app.html           # Main HTML with UI
├── assets/
│   ├── app.js        # Application logic (1,851 lines)
│   └── database.js   # SQLite wrapper (841 lines)
└── README.md
```

## Important Notes

⚠️ **Data Storage:** All data stored in browser localStorage. Clearing browser data deletes everything. **Export backups regularly!**

**Browser Requirements:**
- Modern browser with WebAssembly support
- LocalStorage enabled
- Tested on Chrome, Firefox, Edge, Safari

**Limitations:**
- No cloud sync or multi-device support
- Limited by browser storage quota (~5-10MB)
- No real-time market data integration

## Privacy & Security

- 100% client-side - no data leaves your browser
- No server communication
- No analytics or tracking
- Open source code

## License

MIT License - See LICENSE file for details

---

**Made with Claude Code** 🤖

For questions or issues, open an issue on GitHub.
