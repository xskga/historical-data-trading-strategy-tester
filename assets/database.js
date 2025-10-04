class Database {
    constructor() {
        this.db = null;
        this.SQL = null;
    }

    async init() {
        try {
            this.SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            
            const savedData = localStorage.getItem('trading_tester_db');
            if (savedData) {
                const data = new Uint8Array(JSON.parse(savedData));
                this.db = new this.SQL.Database(data);
            } else {
                this.db = new this.SQL.Database();
                this.createTables();
            }
            
            return true;
        } catch (error) {
            console.error('Database initialization failed:', error);
            return false;
        }
    }

    createTables() {
        const createAccountsTable = `
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                initial_balance REAL NOT NULL,
                current_balance REAL NOT NULL,
                leverage INTEGER NOT NULL DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createTransactionsTable = `
            CREATE TABLE IF NOT EXISTS transactions (
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
        `;

        const createStrategiesTable = `
            CREATE TABLE IF NOT EXISTS strategies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, name),
                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )
        `;

        const createInstrumentsTable = `
            CREATE TABLE IF NOT EXISTS instruments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, name),
                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )
        `;

        this.db.run(createAccountsTable);
        this.db.run(createTransactionsTable);
        this.db.run(createStrategiesTable);
        this.db.run(createInstrumentsTable);
        this.save();
    }

    save() {
        const data = this.db.export();
        localStorage.setItem('trading_tester_db', JSON.stringify(Array.from(data)));
    }

    createAccount(name, initialBalance, leverage = 100) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO accounts (name, initial_balance, current_balance, leverage)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run([name, initialBalance, initialBalance, leverage]);
            const accountId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return accountId;
        } catch (error) {
            console.error('Error creating account:', error);
            throw error;
        }
    }

    getAccounts() {
        try {
            const result = this.db.exec("SELECT * FROM accounts ORDER BY created_at DESC");
            if (result.length === 0) return [];
            
            return result[0].values.map(row => ({
                id: row[0],
                name: row[1],
                initial_balance: row[2],
                current_balance: row[3],
                leverage: row[4],
                created_at: row[5]
            }));
        } catch (error) {
            console.error('Error getting accounts:', error);
            return [];
        }
    }

    getAccount(id) {
        try {
            const stmt = this.db.prepare("SELECT * FROM accounts WHERE id = ?");
            const result = stmt.getAsObject([id]);
            stmt.free();
            return result;
        } catch (error) {
            console.error('Error getting account:', error);
            return null;
        }
    }

    updateAccountBalance(accountId, newBalance) {
        try {
            const stmt = this.db.prepare("UPDATE accounts SET current_balance = ? WHERE id = ?");
            stmt.run([newBalance, accountId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error updating account balance:', error);
            throw error;
        }
    }

    addTransaction(accountId, instrument, strategy, direction, entryPrice, stopLoss, exitPrice, riskPercent, riskAmount, positionSize, rrRatio, pnl, roi, transactionDate) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO transactions
                (account_id, instrument, strategy, direction, entry_price, stop_loss, exit_price, risk_percent, risk_amount, position_size, rr_ratio, pnl, roi, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run([accountId, instrument, strategy, direction, entryPrice, stopLoss, exitPrice, riskPercent, riskAmount, positionSize, rrRatio, pnl, roi, transactionDate]);
            const transactionId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return transactionId;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    }

    getTransactions(accountId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM transactions
                WHERE account_id = ?
                ORDER BY created_at DESC
            `);
            stmt.bind([accountId]);

            const transactions = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                transactions.push(row);
            }
            stmt.free();

            return transactions;
        } catch (error) {
            console.error('Error getting transactions:', error);
            return [];
        }
    }

    getStrategyStats(accountId, strategy) {
        try {
            const stmt = this.db.prepare(`
                SELECT
                    COUNT(*) as total_trades,
                    COUNT(CASE WHEN pnl > 0 THEN 1 END) as winning_trades,
                    COUNT(CASE WHEN pnl < 0 THEN 1 END) as losing_trades,
                    SUM(pnl) as total_pnl,
                    SUM(CASE WHEN pnl > 0 THEN pnl ELSE 0 END) as total_wins,
                    SUM(CASE WHEN pnl < 0 THEN ABS(pnl) ELSE 0 END) as total_losses,
                    AVG(CASE WHEN pnl > 0 THEN pnl END) as avg_win,
                    AVG(CASE WHEN pnl < 0 THEN pnl END) as avg_loss,
                    AVG(rr_ratio) as avg_rr_ratio
                FROM transactions
                WHERE account_id = ? AND strategy = ?
            `);
            stmt.bind([accountId, strategy]);
            stmt.step();
            const result = stmt.getAsObject();
            stmt.free();

            const total_trades = result.total_trades || 0;
            const winning_trades = result.winning_trades || 0;
            const losing_trades = result.losing_trades || 0;
            const total_pnl = result.total_pnl || 0;
            const total_wins = result.total_wins || 0;
            const total_losses = result.total_losses || 0;
            const avg_win = result.avg_win || 0;
            const avg_loss = result.avg_loss || 0;
            const avg_rr_ratio = result.avg_rr_ratio || 0;

            const win_rate = total_trades > 0 ? (winning_trades / total_trades) * 100 : 0;
            const profit_factor = total_losses > 0 ? (total_wins / total_losses) : (total_wins > 0 ? Infinity : 0);

            return {
                total_trades,
                winning_trades,
                losing_trades,
                total_pnl,
                win_rate,
                avg_rr_ratio,
                profit_factor,
                avg_win,
                avg_loss
            };
        } catch (error) {
            console.error('Error getting strategy stats:', error);
            return {
                total_trades: 0,
                winning_trades: 0,
                losing_trades: 0,
                total_pnl: 0,
                win_rate: 0,
                avg_rr_ratio: 0,
                profit_factor: 0,
                avg_win: 0,
                avg_loss: 0
            };
        }
    }

    getAllStats(accountId) {
        try {
            const stmt = this.db.prepare(`
                SELECT
                    COUNT(*) as total_trades,
                    SUM(pnl) as total_pnl
                FROM transactions
                WHERE account_id = ?
            `);
            stmt.bind([accountId]);
            stmt.step();
            const result = stmt.getAsObject();
            stmt.free();

            return {
                total_trades: result.total_trades || 0,
                total_pnl: result.total_pnl || 0
            };
        } catch (error) {
            console.error('Error getting all stats:', error);
            return { total_trades: 0, total_pnl: 0 };
        }
    }

    addStrategy(accountId, name) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO strategies (account_id, name)
                VALUES (?, ?)
            `);
            stmt.run([accountId, name]);
            const strategyId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return strategyId;
        } catch (error) {
            console.error('Error adding strategy:', error);
            throw error;
        }
    }

    getStrategies(accountId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM strategies
                WHERE account_id = ?
                ORDER BY created_at ASC
            `);
            stmt.bind([accountId]);

            const strategies = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                strategies.push(row);
            }
            stmt.free();

            return strategies;
        } catch (error) {
            console.error('Error getting strategies:', error);
            return [];
        }
    }

    deleteStrategy(strategyId) {
        try {
            const stmt = this.db.prepare("DELETE FROM strategies WHERE id = ?");
            stmt.run([strategyId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting strategy:', error);
            throw error;
        }
    }

    deleteTransaction(transactionId) {
        try {
            const stmt = this.db.prepare("DELETE FROM transactions WHERE id = ?");
            stmt.run([transactionId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    getTransaction(transactionId) {
        try {
            const stmt = this.db.prepare("SELECT * FROM transactions WHERE id = ?");
            const result = stmt.getAsObject([transactionId]);
            stmt.free();
            return result;
        } catch (error) {
            console.error('Error getting transaction:', error);
            return null;
        }
    }

    deleteAccount(accountId) {
        try {
            // Delete all transactions for this account
            const deleteTransactions = this.db.prepare("DELETE FROM transactions WHERE account_id = ?");
            deleteTransactions.run([accountId]);
            deleteTransactions.free();

            // Delete all strategies for this account
            const deleteStrategies = this.db.prepare("DELETE FROM strategies WHERE account_id = ?");
            deleteStrategies.run([accountId]);
            deleteStrategies.free();

            // Delete all instruments for this account
            const deleteInstruments = this.db.prepare("DELETE FROM instruments WHERE account_id = ?");
            deleteInstruments.run([accountId]);
            deleteInstruments.free();

            // Delete the account
            const deleteAccount = this.db.prepare("DELETE FROM accounts WHERE id = ?");
            deleteAccount.run([accountId]);
            deleteAccount.free();

            this.save();
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }

    addInstrument(accountId, name) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO instruments (account_id, name)
                VALUES (?, ?)
            `);
            stmt.run([accountId, name]);
            const instrumentId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return instrumentId;
        } catch (error) {
            console.error('Error adding instrument:', error);
            throw error;
        }
    }

    getInstruments(accountId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM instruments
                WHERE account_id = ?
                ORDER BY created_at ASC
            `);
            stmt.bind([accountId]);

            const instruments = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                instruments.push(row);
            }
            stmt.free();

            return instruments;
        } catch (error) {
            console.error('Error getting instruments:', error);
            return [];
        }
    }

    deleteInstrument(instrumentId) {
        try {
            const stmt = this.db.prepare("DELETE FROM instruments WHERE id = ?");
            stmt.run([instrumentId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting instrument:', error);
            throw error;
        }
    }

    updateTransactionNotes(transactionId, notes) {
        try {
            const stmt = this.db.prepare("UPDATE transactions SET notes = ? WHERE id = ?");
            stmt.run([notes, transactionId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error updating transaction notes:', error);
            throw error;
        }
    }
}