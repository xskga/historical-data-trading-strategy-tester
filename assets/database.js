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

        const createTagDefinitionsTable = `
            CREATE TABLE IF NOT EXISTS tag_definitions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                allow_multiple INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(account_id, name),
                FOREIGN KEY (account_id) REFERENCES accounts (id)
            )
        `;

        const createTagFieldsTable = `
            CREATE TABLE IF NOT EXISTS tag_fields (
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
        `;

        const createTransactionTagsTable = `
            CREATE TABLE IF NOT EXISTS transaction_tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_id INTEGER NOT NULL,
                tag_definition_id INTEGER NOT NULL,
                instance_number INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
                FOREIGN KEY (tag_definition_id) REFERENCES tag_definitions (id) ON DELETE CASCADE
            )
        `;

        const createTransactionTagValuesTable = `
            CREATE TABLE IF NOT EXISTS transaction_tag_values (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transaction_tag_id INTEGER NOT NULL,
                tag_field_id INTEGER NOT NULL,
                value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (transaction_tag_id) REFERENCES transaction_tags (id) ON DELETE CASCADE,
                FOREIGN KEY (tag_field_id) REFERENCES tag_fields (id) ON DELETE CASCADE
            )
        `;

        this.db.run(createAccountsTable);
        this.db.run(createTransactionsTable);
        this.db.run(createStrategiesTable);
        this.db.run(createInstrumentsTable);
        const createSettingsTable = `
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createTagDefinitionsTable);
        this.db.run(createTagFieldsTable);
        this.db.run(createTransactionTagsTable);
        this.db.run(createTransactionTagValuesTable);
        this.db.run(createSettingsTable);
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

    updateTransaction(transactionId, data) {
        try {
            const stmt = this.db.prepare(`
                UPDATE transactions
                SET instrument = ?, strategy = ?, direction = ?, entry_price = ?, stop_loss = ?,
                    exit_price = ?, risk_percent = ?, risk_amount = ?, position_size = ?,
                    rr_ratio = ?, pnl = ?, roi = ?, created_at = ?, notes = ?
                WHERE id = ?
            `);
            stmt.run([
                data.instrument, data.strategy, data.direction, data.entry_price, data.stop_loss,
                data.exit_price, data.risk_percent, data.risk_amount, data.position_size,
                data.rr_ratio, data.pnl, data.roi, data.created_at, data.notes, transactionId
            ]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    // Tag Definitions methods
    addTagDefinition(accountId, name, category, allowMultiple = false) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO tag_definitions (account_id, name, category, allow_multiple)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run([accountId, name, category, allowMultiple ? 1 : 0]);
            const tagId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return tagId;
        } catch (error) {
            console.error('Error adding tag definition:', error);
            throw error;
        }
    }

    getTagDefinitions(accountId, category = null) {
        try {
            let query = "SELECT * FROM tag_definitions WHERE account_id = ?";
            const params = [accountId];

            if (category) {
                query += " AND category = ?";
                params.push(category);
            }

            query += " ORDER BY category, name";

            const stmt = this.db.prepare(query);
            stmt.bind(params);

            const tags = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                tags.push({
                    ...row,
                    allow_multiple: row.allow_multiple === 1
                });
            }
            stmt.free();

            return tags;
        } catch (error) {
            console.error('Error getting tag definitions:', error);
            return [];
        }
    }

    getTagDefinition(tagId) {
        try {
            const stmt = this.db.prepare("SELECT * FROM tag_definitions WHERE id = ?");
            const result = stmt.getAsObject([tagId]);
            stmt.free();
            if (result.id) {
                result.allow_multiple = result.allow_multiple === 1;
            }
            return result;
        } catch (error) {
            console.error('Error getting tag definition:', error);
            return null;
        }
    }

    deleteTagDefinition(tagId) {
        try {
            const stmt = this.db.prepare("DELETE FROM tag_definitions WHERE id = ?");
            stmt.run([tagId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting tag definition:', error);
            throw error;
        }
    }

    // Tag Fields methods
    addTagField(tagDefinitionId, fieldName, fieldType, fieldConfig = {}, isRequired = false, displayOrder = 0) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO tag_fields (tag_definition_id, field_name, field_type, field_config, is_required, display_order)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            stmt.run([tagDefinitionId, fieldName, fieldType, JSON.stringify(fieldConfig), isRequired ? 1 : 0, displayOrder]);
            const fieldId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return fieldId;
        } catch (error) {
            console.error('Error adding tag field:', error);
            throw error;
        }
    }

    getTagFields(tagDefinitionId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM tag_fields
                WHERE tag_definition_id = ?
                ORDER BY display_order, id
            `);
            stmt.bind([tagDefinitionId]);

            const fields = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                fields.push({
                    ...row,
                    field_config: JSON.parse(row.field_config || '{}'),
                    is_required: row.is_required === 1
                });
            }
            stmt.free();

            return fields;
        } catch (error) {
            console.error('Error getting tag fields:', error);
            return [];
        }
    }

    deleteTagField(fieldId) {
        try {
            const stmt = this.db.prepare("DELETE FROM tag_fields WHERE id = ?");
            stmt.run([fieldId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting tag field:', error);
            throw error;
        }
    }

    updateTagField(fieldId, fieldName, fieldType, fieldConfig, isRequired, displayOrder) {
        try {
            const stmt = this.db.prepare(`
                UPDATE tag_fields
                SET field_name = ?, field_type = ?, field_config = ?, is_required = ?, display_order = ?
                WHERE id = ?
            `);
            stmt.run([fieldName, fieldType, JSON.stringify(fieldConfig), isRequired ? 1 : 0, displayOrder, fieldId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error updating tag field:', error);
            throw error;
        }
    }

    // Transaction Tags methods
    addTransactionTag(transactionId, tagDefinitionId, instanceNumber = 1) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO transaction_tags (transaction_id, tag_definition_id, instance_number)
                VALUES (?, ?, ?)
            `);
            stmt.run([transactionId, tagDefinitionId, instanceNumber]);
            const transactionTagId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return transactionTagId;
        } catch (error) {
            console.error('Error adding transaction tag:', error);
            throw error;
        }
    }

    getTransactionTags(transactionId) {
        try {
            const stmt = this.db.prepare(`
                SELECT tt.*, td.name, td.category, td.allow_multiple
                FROM transaction_tags tt
                JOIN tag_definitions td ON tt.tag_definition_id = td.id
                WHERE tt.transaction_id = ?
                ORDER BY td.category, tt.tag_definition_id, tt.instance_number
            `);
            stmt.bind([transactionId]);

            const tags = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                tags.push({
                    ...row,
                    allow_multiple: row.allow_multiple === 1
                });
            }
            stmt.free();

            return tags;
        } catch (error) {
            console.error('Error getting transaction tags:', error);
            return [];
        }
    }

    deleteTransactionTag(transactionTagId) {
        try {
            const stmt = this.db.prepare("DELETE FROM transaction_tags WHERE id = ?");
            stmt.run([transactionTagId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting transaction tag:', error);
            throw error;
        }
    }

    deleteTransactionTagsByTransaction(transactionId) {
        try {
            const stmt = this.db.prepare("DELETE FROM transaction_tags WHERE transaction_id = ?");
            stmt.run([transactionId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error deleting transaction tags:', error);
            throw error;
        }
    }

    // Transaction Tag Values methods
    addTransactionTagValue(transactionTagId, tagFieldId, value) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO transaction_tag_values (transaction_tag_id, tag_field_id, value)
                VALUES (?, ?, ?)
            `);
            stmt.run([transactionTagId, tagFieldId, value]);
            const valueId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            stmt.free();
            this.save();
            return valueId;
        } catch (error) {
            console.error('Error adding transaction tag value:', error);
            throw error;
        }
    }

    getTransactionTagValues(transactionTagId) {
        try {
            const stmt = this.db.prepare(`
                SELECT ttv.*, tf.field_name, tf.field_type, tf.field_config
                FROM transaction_tag_values ttv
                JOIN tag_fields tf ON ttv.tag_field_id = tf.id
                WHERE ttv.transaction_tag_id = ?
                ORDER BY tf.display_order, tf.id
            `);
            stmt.bind([transactionTagId]);

            const values = [];
            while (stmt.step()) {
                const row = stmt.getAsObject();
                values.push({
                    ...row,
                    field_config: JSON.parse(row.field_config || '{}')
                });
            }
            stmt.free();

            return values;
        } catch (error) {
            console.error('Error getting transaction tag values:', error);
            return [];
        }
    }

    getTransactionTagsWithValues(transactionId) {
        try {
            const transactionTags = this.getTransactionTags(transactionId);

            return transactionTags.map(tag => {
                const values = this.getTransactionTagValues(tag.id);
                return {
                    ...tag,
                    values: values
                };
            });
        } catch (error) {
            console.error('Error getting transaction tags with values:', error);
            return [];
        }
    }

    updateTransactionTagValue(valueId, newValue) {
        try {
            const stmt = this.db.prepare(`
                UPDATE transaction_tag_values
                SET value = ?
                WHERE id = ?
            `);
            stmt.run([newValue, valueId]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error updating transaction tag value:', error);
            throw error;
        }
    }

    // Settings Methods
    setSetting(key, value) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO settings (key, value, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
            `);
            stmt.run([key, value]);
            stmt.free();
            this.save();
        } catch (error) {
            console.error('Error setting value:', error);
            throw error;
        }
    }

    getSetting(key) {
        try {
            const result = this.db.exec(`SELECT value FROM settings WHERE key = ?`, [key]);
            if (result.length === 0 || result[0].values.length === 0) return null;
            return result[0].values[0][0];
        } catch (error) {
            console.error('Error getting value:', error);
            return null;
        }
    }
}