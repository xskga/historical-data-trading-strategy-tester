# Trading Strategy Tester 🤑

A comprehensive web-based application for testing and analyzing trading strategies with historical data. Track your trades, analyze performance metrics, and refine your trading strategies - all running locally in your browser.

## 🎯 Features

### Account Management
- **Multiple Trading Accounts**: Create and manage multiple trading accounts with different configurations
- **Leverage Support**: Set custom leverage for each account (default: 100x)
- **Balance Tracking**: Automatic balance updates based on trade performance
- **Account Statistics**: View initial balance, current balance, P&L, and ROI for each account
- **Persistent Selection**: Application remembers your last selected account

### Transaction Management
- **Detailed Trade Recording**: Log all trade parameters including:
  - Transaction date
  - Instrument (forex pairs, stocks, crypto, etc.)
  - Strategy used
  - Direction (LONG/SHORT)
  - Entry price
  - Stop loss price
  - Exit price
  - Risk percentage
  - Quick notes (optional)
- **Real-time Calculations**: Automatic calculation of:
  - Position size based on risk percentage
  - Risk amount in dollars
  - Risk/Reward (R/R) ratio
  - Potential and actual P&L
- **Transaction Editing**: Full edit capability for all transaction details and tags via modal
- **Transaction Filtering**: Filter trade history by strategy and/or instrument
- **Transaction Deletion**: Remove transactions with automatic balance recalculation

### Strategy & Instrument Management
- **Strategy Organization**: Create and manage multiple trading strategies per account
- **Instrument Library**: Build a library of trading instruments for each account
- **Dropdown Selection**: Quick selection from your saved strategies and instruments
- **Independent Management**: Strategies and instruments are account-specific

### Transaction Tags System
- **Flexible Tag Configuration**: Create custom tags with multiple field types:
  - Number (integer)
  - Decimal (floating-point)
  - Boolean (true/false)
  - Dropdown list (select)
  - Multiple choice (checkbox)
  - Date & Time
  - Text
  - Notes (textarea)
- **Tag Categories**: Organize tags into 5 predefined categories:
  - Pre-Entry
  - Entry → Break-Even
  - W trakcie transakcji (During Trade)
  - Exit
  - Other
- **Multiple Instances**: Allow multiple instances of the same tag per transaction
- **Tag Management**: Add, edit, and delete tag definitions and their fields
- **Transaction-Level Tags**: Attach configured tags to individual transactions with custom values

### Performance Analytics
- **Dashboard Overview**: Real-time display of:
  - Current balance
  - Total P&L
  - Net ROI
  - Total number of trades
- **Per-Strategy Statistics**: Detailed breakdown for each strategy including:
  - Total trades executed
  - Win rate percentage
  - Total P&L
  - Average Risk/Reward ratio
  - Profit factor
  - Average win amount
  - Average loss amount
- **Visual Indicators**: Color-coded P&L (green for profit, red for loss)

### Data Persistence & Backup
- **Browser Storage**: All data stored locally in browser's localStorage using SQLite (SQL.js)
- **Export Backup**: Save complete database to file (`.db` format with date stamp)
- **Import Backup**: Restore previous backups from file
- **Data Safety Warning**: Built-in warning about browser data clearing

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xskga/historical-data-trading-strategy-tester.git
cd historical-data-trading-strategy-tester
```

2. Open `app.html` in your web browser (no server required!)

### Usage

1. **Create an Account**
   - Click "+ Add Account" button
   - Enter account name, initial balance, and leverage
   - Click "Create Account"

2. **Add Strategies**
   - Select your account from the dropdown
   - Navigate to "Manage Strategies" section
   - Enter strategy name and click "Add"

3. **Add Instruments**
   - Navigate to "Manage Instruments" section
   - Enter instrument name (e.g., EUR/USD, BTC/USD, AAPL)
   - Click "Add"

4. **Create Custom Tags** (Optional)
   - Navigate to Statistics section
   - In "Manage Transaction Tags" section:
     - Enter tag name (e.g., "Stop Loss Tests")
     - Select category (Pre-Entry, Entry → Break-Even, During Trade, Exit, or Other)
     - Check "Allow Multiple" if you want multiple instances per transaction
     - Click "Add Tag"
   - Click "+ Field" to add fields to your tag:
     - Choose field type (Number, Decimal, Boolean, Dropdown, Checkbox, Date & Time, Text, or Notes)
     - Set field name and configuration
     - Mark as required if needed
     - Click "Add Field"

5. **Record a Transaction**
   - Fill in all transaction details:
     - Date of the trade
     - Select instrument from dropdown
     - Select strategy from dropdown
     - Choose direction (LONG or SHORT)
     - Enter entry price
     - Enter stop loss price
     - Enter risk percentage (default: 1%)
     - Enter exit price
   - Review calculated values (position size, R/R ratio, P&L)
   - Optionally add quick notes
   - Expand tag categories and fill in custom tag data (if configured)
   - Click "Add Transaction"

6. **View/Edit Transactions**
   - Click the 📝 icon next to any transaction in history
   - Edit transaction details, notes, and tag values
   - Remove tag instances if needed
   - Click "Save Changes"

7. **Analyze Performance**
   - View dashboard for overall account performance
   - Check per-strategy statistics in the Statistics section
   - Use filters to analyze specific strategies or instruments

8. **Backup Your Data**
   - Click "💾 Save Backup" to download database file
   - Store backup file safely on your computer
   - Use "📂 Load Backup" to restore from file

## 📊 Position Size Calculation Method

The application uses a **risk-based position sizing** approach, which is a fundamental principle of proper money management in trading.

### How It Works

The position size is calculated to ensure you only risk a specific percentage of your account balance on each trade, regardless of how far your stop loss is from your entry price.

### Formula

```
Risk Amount ($) = Account Balance × (Risk Percentage / 100)
Price Difference = |Entry Price - Stop Loss|
Position Size ($) = Risk Amount / Price Difference
```

### Step-by-Step Example

Let's say you have:
- **Account Balance**: $10,000
- **Risk Percentage**: 1% (you want to risk 1% of your account)
- **Entry Price**: 1.1000 (EUR/USD)
- **Stop Loss**: 1.0950

**Step 1: Calculate Risk Amount**
```
Risk Amount = $10,000 × (1 / 100)
Risk Amount = $100
```
This means you're willing to lose $100 on this trade (1% of your account).

**Step 2: Calculate Price Difference**
```
Price Difference = |1.1000 - 1.0950|
Price Difference = 0.0050 (or 50 pips)
```

**Step 3: Calculate Position Size**
```
Position Size = $100 / 0.0050
Position Size = $20,000
```

### Why This Method?

1. **Consistent Risk Management**: You risk the same percentage on every trade, regardless of stop loss distance
2. **Account Protection**: Your account balance dictates position size, not arbitrary lot sizes
3. **Scalability**: As your account grows, position sizes automatically adjust
4. **Flexibility**: Wider stop losses automatically result in smaller position sizes

### Risk/Reward Ratio Calculation

After calculating position size, the application also computes the R/R ratio:

```
Reward Amount = |Exit Price - Entry Price| × Position Size
R/R Ratio = Reward Amount / Risk Amount
```

**Example (continuing from above):**
- **Exit Price**: 1.1100 (LONG position)
- **Position Size**: $20,000

```
Reward Amount = |1.1100 - 1.1000| × $20,000
Reward Amount = 0.0100 × $20,000
Reward Amount = $200

R/R Ratio = $200 / $100 = 2.0
Displayed as: 1:2.00
```

This means you're risking $100 to potentially make $200, a 1:2 risk/reward ratio.

### P&L Calculation

**For LONG positions:**
```
P&L = (Exit Price - Entry Price) × Position Size
```

**For SHORT positions:**
```
P&L = (Entry Price - Exit Price) × Position Size
```

The P&L is then added to (or subtracted from) your account balance automatically.

## 🛠️ Technical Details

### Technologies Used
- **SQL.js**: SQLite compiled to WebAssembly for client-side database
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Vanilla JavaScript**: No frameworks, pure JavaScript for logic
- **LocalStorage API**: Browser storage for database persistence
- **Blob API**: File download for backups
- **FileReader API**: File upload for backup restoration

### Database Schema

#### Accounts Table
```sql
CREATE TABLE accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    initial_balance REAL NOT NULL,
    current_balance REAL NOT NULL,
    leverage INTEGER NOT NULL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### Transactions Table
```sql
CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    instrument TEXT NOT NULL,
    strategy TEXT NOT NULL,
    direction TEXT NOT NULL,
    entry_price REAL NOT NULL,
    stop_loss REAL NOT NULL,
    exit_price REAL NOT NULL,
    risk_percent REAL NOT NULL,
    risk_amount REAL NOT NULL,
    position_size REAL NOT NULL,
    rr_ratio REAL NOT NULL,
    pnl REAL NOT NULL,
    roi REAL NOT NULL,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts (id)
)
```

#### Strategies Table
```sql
CREATE TABLE strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, name),
    FOREIGN KEY (account_id) REFERENCES accounts (id)
)
```

#### Instruments Table
```sql
CREATE TABLE instruments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, name),
    FOREIGN KEY (account_id) REFERENCES accounts (id)
)
```

#### Tag Definitions Table
```sql
CREATE TABLE tag_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    allow_multiple INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, name),
    FOREIGN KEY (account_id) REFERENCES accounts (id)
)
```

#### Tag Fields Table
```sql
CREATE TABLE tag_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_definition_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    field_type TEXT NOT NULL,
    field_config TEXT DEFAULT '{}',
    is_required INTEGER NOT NULL DEFAULT 0,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tag_definition_id) REFERENCES tag_definitions (id) ON DELETE CASCADE
)
```

#### Transaction Tags Table
```sql
CREATE TABLE transaction_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    tag_definition_id INTEGER NOT NULL,
    instance_number INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_definition_id) REFERENCES tag_definitions (id) ON DELETE CASCADE
)
```

#### Transaction Tag Values Table
```sql
CREATE TABLE transaction_tag_values (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_tag_id INTEGER NOT NULL,
    tag_field_id INTEGER NOT NULL,
    value TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_tag_id) REFERENCES transaction_tags (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_field_id) REFERENCES tag_fields (id) ON DELETE CASCADE
)
```

### Key Statistics Calculated

1. **Win Rate**: `(Winning Trades / Total Trades) × 100`
2. **Profit Factor**: `Total Wins / Total Losses`
3. **Net ROI**: `(Total P&L / Initial Balance) × 100`
4. **Average Win**: `Sum of Profitable Trades / Number of Winning Trades`
5. **Average Loss**: `Sum of Losing Trades / Number of Losing Trades`

## ⚠️ Important Notes

### Data Storage
- All data is stored in your browser's localStorage
- Clearing browser data/cookies will **DELETE ALL TRANSACTIONS**
- **Regularly export backups** to protect your data
- Backups are saved as `.db` files with format: `trading-backup-YYYY-MM-DD.db`

### Browser Compatibility
- Modern browsers with WebAssembly support required
- Tested on: Chrome, Firefox, Edge, Safari (recent versions)
- LocalStorage must be enabled

### Limitations
- Data is stored locally (not in the cloud)
- No multi-device synchronization
- Limited by browser storage quota (typically 5-10MB)
- No real-time market data integration

## 📁 Project Structure

```
trading-tester/
├── app.html              # Main HTML file with UI structure
├── assets/
│   ├── app.js           # Application logic and event handlers
│   └── database.js      # SQLite database wrapper and operations
└── README.md            # This file
```

## 🔒 Privacy & Security

- **100% Client-Side**: All data stays in your browser
- **No Server Communication**: No data sent to external servers
- **No Analytics**: No tracking or telemetry
- **Open Source**: Full transparency of code

## 📈 Use Cases

- **Strategy Backtesting**: Test trading strategies with historical data
- **Performance Tracking**: Analyze which strategies perform best
- **Risk Management**: Ensure consistent risk across all trades
- **Trade Journaling**: Keep detailed notes on each trade
- **Portfolio Analysis**: Manage multiple accounts with different strategies

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## 📄 License

This project is open source and available for personal and educational use.

## 🙏 Acknowledgments

- Built with SQL.js - SQLite compiled to JavaScript
- Styled with Tailwind CSS
- Icon: 🤑

---

**Made with Claude Code** 🤖

For questions or support, please open an issue on GitHub.
