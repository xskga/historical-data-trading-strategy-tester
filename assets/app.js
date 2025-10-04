class TradingTester {
    constructor() {
        this.db = new Database();
        this.currentAccount = null;
        this.currentTransactionId = null;
        this.init();
    }

    async init() {
        const dbInitialized = await this.db.init();
        if (!dbInitialized) {
            alert('Database initialization error!');
            return;
        }

        this.setupEventListeners();
        this.loadAccounts();
    }

    setupEventListeners() {
        // Modal handlers
        document.getElementById('addAccountBtn').addEventListener('click', () => {
            document.getElementById('accountModal').classList.remove('hidden');
        });

        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('accountModal').classList.add('hidden');
        });

        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('accountModal')) {
                document.getElementById('accountModal').classList.add('hidden');
            }
        });

        // Account form
        document.getElementById('accountForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createAccount();
        });

        document.getElementById('accountSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.selectAccount(parseInt(e.target.value));
            }
        });

        // Transaction form
        document.getElementById('addTransactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Strategy management
        document.getElementById('addStrategyBtn').addEventListener('click', () => {
            this.addStrategy();
        });

        // Instrument management
        document.getElementById('addInstrumentBtn').addEventListener('click', () => {
            this.addInstrument();
        });

        // Notes modal handlers
        document.getElementById('closeNotesModal').addEventListener('click', () => {
            this.closeNotesModal();
        });

        document.getElementById('cancelNotesBtn').addEventListener('click', () => {
            this.closeNotesModal();
        });

        document.getElementById('saveNotesBtn').addEventListener('click', () => {
            this.saveNotes();
        });

        // Filter handlers
        document.getElementById('filterStrategy').addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('filterInstrument').addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        // Backup handlers
        document.getElementById('exportBackupBtn').addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('importBackupInput').addEventListener('change', (e) => {
            this.importBackup(e);
        });

        // Real-time calculation
        ['entryPrice', 'stopLoss', 'exitPrice', 'riskPercent'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calculatePositionSize();
            });
        });

        // Smooth scroll for navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                document.getElementById(targetId).scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        });
    }

    loadAccounts() {
        const accounts = this.db.getAccounts();
        const select = document.getElementById('accountSelect');
        const lastAccountId = localStorage.getItem('lastSelectedAccountId');

        select.innerHTML = '<option value="">Select account...</option>';

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} ($${account.current_balance.toFixed(2)})`;
            select.appendChild(option);
        });

        // Automatically select last used account
        if (lastAccountId && accounts.find(acc => acc.id == lastAccountId)) {
            select.value = lastAccountId;
            this.selectAccount(parseInt(lastAccountId));
        }
    }

    createAccount() {
        const name = document.getElementById('accountName').value;
        const initialBalance = parseFloat(document.getElementById('initialBalance').value);
        const leverage = parseInt(document.getElementById('leverage').value);

        try {
            const accountId = this.db.createAccount(name, initialBalance, leverage);
            document.getElementById('accountModal').classList.add('hidden');
            document.getElementById('accountForm').reset();
            document.getElementById('leverage').value = 100;
            this.loadAccounts();

            document.getElementById('accountSelect').value = accountId;
            this.selectAccount(accountId);
        } catch (error) {
            console.error('Error creating account:', error);
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                alert('Account with this name already exists!');
            } else {
                alert('Error creating account!');
            }
        }
    }

    selectAccount(accountId) {
        this.currentAccount = this.db.getAccount(accountId);
        if (this.currentAccount) {
            localStorage.setItem('lastSelectedAccountId', accountId);
            this.loadStrategies();
            this.loadInstruments();
            this.updateDashboard();
            this.loadTransactionHistory();
            this.updateStatistics();
            this.loadAccountsList();
        }
    }

    calculatePositionSize() {
        if (!this.currentAccount) return;

        const entryPrice = parseFloat(document.getElementById('entryPrice').value) || 0;
        const stopLoss = parseFloat(document.getElementById('stopLoss').value) || 0;
        const exitPrice = parseFloat(document.getElementById('exitPrice').value) || 0;
        const riskPercent = parseFloat(document.getElementById('riskPercent').value) || 0;
        const direction = document.getElementById('direction').value;

        if (entryPrice > 0 && stopLoss > 0 && riskPercent > 0) {
            const riskAmount = (this.currentAccount.current_balance * riskPercent) / 100;
            const priceDifference = Math.abs(entryPrice - stopLoss);

            let positionSize = 0;
            if (priceDifference > 0) {
                positionSize = riskAmount / priceDifference;
            }

            document.getElementById('positionSize').textContent = `$${positionSize.toFixed(2)}`;
            document.getElementById('riskAmount').textContent = `$${riskAmount.toFixed(2)}`;

            if (exitPrice > 0 && entryPrice > 0) {
                let pnl = 0;
                let rewardAmount = 0;

                if (direction === 'LONG') {
                    pnl = (exitPrice - entryPrice) * positionSize;
                    rewardAmount = Math.abs(exitPrice - entryPrice) * positionSize;
                } else if (direction === 'SHORT') {
                    pnl = (entryPrice - exitPrice) * positionSize;
                    rewardAmount = Math.abs(entryPrice - exitPrice) * positionSize;
                }

                const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(2) : 0;
                document.getElementById('rrRatio').textContent = `1:${rrRatio}`;

                const pnlElement = document.getElementById('potentialPnL');
                pnlElement.textContent = `$${pnl.toFixed(2)}`;
                pnlElement.className = pnl >= 0 ? 'text-lg font-bold text-success' : 'text-lg font-bold text-danger';
            } else {
                document.getElementById('rrRatio').textContent = '0:0';
                document.getElementById('potentialPnL').textContent = '$0.00';
                document.getElementById('potentialPnL').className = 'text-lg font-bold text-slate-100';
            }
        } else {
            document.getElementById('positionSize').textContent = '$0.00';
            document.getElementById('riskAmount').textContent = '$0.00';
            document.getElementById('rrRatio').textContent = '0:0';
            document.getElementById('potentialPnL').textContent = '$0.00';
            document.getElementById('potentialPnL').className = 'text-lg font-bold text-slate-100';
        }
    }

    addTransaction() {
        if (!this.currentAccount) {
            alert('Select an account!');
            return;
        }

        const transactionDate = document.getElementById('transactionDate').value;
        const instrument = document.getElementById('instrument').value;
        const strategy = document.getElementById('strategy').value;
        const direction = document.getElementById('direction').value;
        const entryPrice = parseFloat(document.getElementById('entryPrice').value);
        const stopLoss = parseFloat(document.getElementById('stopLoss').value);
        const exitPrice = parseFloat(document.getElementById('exitPrice').value);
        const riskPercent = parseFloat(document.getElementById('riskPercent').value);

        const riskAmount = (this.currentAccount.current_balance * riskPercent) / 100;
        const priceDifference = Math.abs(entryPrice - stopLoss);
        const positionSize = riskAmount / priceDifference;

        let pnl = 0;
        let rewardAmount = 0;

        if (direction === 'LONG') {
            pnl = (exitPrice - entryPrice) * positionSize;
            rewardAmount = Math.abs(exitPrice - entryPrice) * positionSize;
        } else if (direction === 'SHORT') {
            pnl = (entryPrice - exitPrice) * positionSize;
            rewardAmount = Math.abs(entryPrice - exitPrice) * positionSize;
        }

        const rrRatio = riskAmount > 0 ? (rewardAmount / riskAmount) : 0;
        const roi = this.currentAccount.initial_balance > 0 ? (pnl / this.currentAccount.initial_balance) * 100 : 0;

        try {
            this.db.addTransaction(
                this.currentAccount.id,
                instrument,
                strategy,
                direction,
                entryPrice,
                stopLoss,
                exitPrice,
                riskPercent,
                riskAmount,
                positionSize,
                rrRatio,
                pnl,
                roi,
                transactionDate
            );

            const newBalance = this.currentAccount.current_balance + pnl;
            this.db.updateAccountBalance(this.currentAccount.id, newBalance);
            this.currentAccount.current_balance = newBalance;

            document.getElementById('addTransactionForm').reset();
            document.getElementById('positionSize').textContent = '$0.00';
            document.getElementById('riskAmount').textContent = '$0.00';
            document.getElementById('rrRatio').textContent = '0:0';
            document.getElementById('potentialPnL').textContent = '$0.00';
            document.getElementById('potentialPnL').className = 'text-lg font-bold text-slate-100';

            this.updateDashboard();
            this.loadTransactionHistory();
            this.updateStatistics();
            this.loadAccounts();

            alert('Transaction added successfully!');
        } catch (error) {
            alert('Error adding transaction!');
            console.error(error);
        }
    }

    updateDashboard() {
        if (!this.currentAccount) return;

        document.getElementById('currentBalance').textContent = `$${this.currentAccount.current_balance.toFixed(2)}`;

        const stats = this.db.getAllStats(this.currentAccount.id);

        const totalPnLElement = document.getElementById('totalPnL');
        totalPnLElement.textContent = `$${stats.total_pnl.toFixed(2)}`;
        totalPnLElement.className = stats.total_pnl >= 0 ? 'text-3xl font-bold text-success' : 'text-3xl font-bold text-danger';

        document.getElementById('totalTransactions').textContent = stats.total_trades;

        const netROI = this.currentAccount.initial_balance > 0
            ? ((stats.total_pnl / this.currentAccount.initial_balance) * 100)
            : 0;

        const netROIElement = document.getElementById('netROI');
        netROIElement.textContent = `${netROI.toFixed(2)}%`;
        netROIElement.className = netROI >= 0 ? 'text-3xl font-bold text-success' : 'text-3xl font-bold text-danger';
    }

    loadTransactionHistory() {
        if (!this.currentAccount) return;

        let transactions = this.db.getTransactions(this.currentAccount.id);
        const tbody = document.getElementById('transactionTableBody');

        // Apply filters
        const filterStrategy = document.getElementById('filterStrategy').value;
        const filterInstrument = document.getElementById('filterInstrument').value;

        if (filterStrategy) {
            transactions = transactions.filter(t => t.strategy === filterStrategy);
        }

        if (filterInstrument) {
            transactions = transactions.filter(t => t.instrument === filterInstrument);
        }

        tbody.innerHTML = '';

        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const date = transaction.created_at;

            const pnlClass = transaction.pnl >= 0 ? 'text-success' : 'text-danger';
            const hasNotes = transaction.notes && transaction.notes.trim().length > 0;
            const notesIcon = hasNotes ? '✏️' : '📄';
            const notesClass = hasNotes ? 'hover:text-slate-300' : 'hover:text-slate-400';

            row.className = 'border-b border-slate-700 hover:bg-slate-700/50';
            row.innerHTML = `
                <td class="py-3 px-4">${date}</td>
                <td class="py-3 px-4">${transaction.instrument}</td>
                <td class="py-3 px-4">${transaction.strategy}</td>
                <td class="py-3 px-4">${transaction.direction}</td>
                <td class="py-3 px-4">${transaction.entry_price.toFixed(5)}</td>
                <td class="py-3 px-4">${transaction.stop_loss.toFixed(5)}</td>
                <td class="py-3 px-4">${transaction.exit_price.toFixed(5)}</td>
                <td class="py-3 px-4">${transaction.risk_percent.toFixed(1)}%</td>
                <td class="py-3 px-4">$${transaction.risk_amount.toFixed(2)}</td>
                <td class="py-3 px-4">1:${transaction.rr_ratio.toFixed(2)}</td>
                <td class="py-3 px-4 font-semibold ${pnlClass}">$${transaction.pnl.toFixed(2)}</td>
                <td class="py-3 px-4">
                    <button class="notes-btn ${notesClass} transition duration-200 mr-2" data-id="${transaction.id}" title="Notes">
                        ${notesIcon}
                    </button>
                    <button class="delete-transaction-btn text-slate-400 hover:text-danger transition duration-200" data-id="${transaction.id}" title="Delete transaction">
                        ✕
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        document.querySelectorAll('.notes-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transactionId = parseInt(e.target.getAttribute('data-id'));
                this.openNotesModal(transactionId);
            });
        });

        document.querySelectorAll('.delete-transaction-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transactionId = parseInt(e.target.getAttribute('data-id'));
                this.deleteTransaction(transactionId);
            });
        });
    }

    loadStrategies() {
        if (!this.currentAccount) return;

        const strategies = this.db.getStrategies(this.currentAccount.id);
        const select = document.getElementById('strategy');
        const strategiesList = document.getElementById('strategiesList');
        const filterSelect = document.getElementById('filterStrategy');

        select.innerHTML = '<option value="">Select strategy...</option>';
        filterSelect.innerHTML = '<option value="">All strategies</option>';
        strategiesList.innerHTML = '';

        strategies.forEach(strategy => {
            const option = document.createElement('option');
            option.value = strategy.name;
            option.textContent = strategy.name;
            select.appendChild(option);

            const filterOption = document.createElement('option');
            filterOption.value = strategy.name;
            filterOption.textContent = strategy.name;
            filterSelect.appendChild(filterOption);

            const strategyItem = document.createElement('div');
            strategyItem.className = 'flex justify-between items-center p-3 bg-slate-700 rounded-lg border border-slate-600';
            strategyItem.innerHTML = `
                <span class="font-medium text-slate-100">${strategy.name}</span>
                <button class="delete-strategy-btn px-3 py-1 bg-danger hover:bg-red-600 text-white text-sm rounded transition duration-200" data-id="${strategy.id}">Delete</button>
            `;
            strategiesList.appendChild(strategyItem);
        });

        document.querySelectorAll('.delete-strategy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const strategyId = parseInt(e.target.getAttribute('data-id'));
                this.deleteStrategy(strategyId);
            });
        });
    }

    loadInstruments() {
        if (!this.currentAccount) return;

        const instruments = this.db.getInstruments(this.currentAccount.id);
        const select = document.getElementById('instrument');
        const instrumentsList = document.getElementById('instrumentsList');
        const filterSelect = document.getElementById('filterInstrument');

        select.innerHTML = '<option value="">Select instrument...</option>';
        filterSelect.innerHTML = '<option value="">All instruments</option>';
        instrumentsList.innerHTML = '';

        instruments.forEach(instrument => {
            const option = document.createElement('option');
            option.value = instrument.name;
            option.textContent = instrument.name;
            select.appendChild(option);

            const filterOption = document.createElement('option');
            filterOption.value = instrument.name;
            filterOption.textContent = instrument.name;
            filterSelect.appendChild(filterOption);

            const instrumentItem = document.createElement('div');
            instrumentItem.className = 'flex justify-between items-center p-3 bg-slate-700 rounded-lg border border-slate-600';
            instrumentItem.innerHTML = `
                <span class="font-medium text-slate-100">${instrument.name}</span>
                <button class="delete-instrument-btn px-3 py-1 bg-danger hover:bg-red-600 text-white text-sm rounded transition duration-200" data-id="${instrument.id}">Delete</button>
            `;
            instrumentsList.appendChild(instrumentItem);
        });

        document.querySelectorAll('.delete-instrument-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const instrumentId = parseInt(e.target.getAttribute('data-id'));
                this.deleteInstrument(instrumentId);
            });
        });
    }

    addStrategy() {
        if (!this.currentAccount) {
            alert('Select an account!');
            return;
        }

        const name = document.getElementById('newStrategyName').value.trim();
        if (!name) {
            alert('Enter strategy name!');
            return;
        }

        try {
            this.db.addStrategy(this.currentAccount.id, name);
            document.getElementById('newStrategyName').value = '';
            this.loadStrategies();
            this.updateStatistics();
        } catch (error) {
            console.error('Error adding strategy:', error);
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                alert('Strategy with this name already exists!');
            } else {
                alert('Error adding strategy!');
            }
        }
    }

    deleteStrategy(strategyId) {
        if (confirm('Are you sure you want to delete this strategy?')) {
            try {
                this.db.deleteStrategy(strategyId);
                this.loadStrategies();
                this.updateStatistics();
            } catch (error) {
                console.error('Error deleting strategy:', error);
                alert('Error deleting strategy!');
            }
        }
    }

    addInstrument() {
        if (!this.currentAccount) {
            alert('Select an account!');
            return;
        }

        const name = document.getElementById('newInstrumentName').value.trim();
        if (!name) {
            alert('Enter instrument name!');
            return;
        }

        try {
            this.db.addInstrument(this.currentAccount.id, name);
            document.getElementById('newInstrumentName').value = '';
            this.loadInstruments();
        } catch (error) {
            console.error('Error adding instrument:', error);
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                alert('Instrument with this name already exists!');
            } else {
                alert('Error adding instrument!');
            }
        }
    }

    deleteInstrument(instrumentId) {
        if (confirm('Are you sure you want to delete this instrument?')) {
            try {
                this.db.deleteInstrument(instrumentId);
                this.loadInstruments();
            } catch (error) {
                console.error('Error deleting instrument:', error);
                alert('Error deleting instrument!');
            }
        }
    }

    deleteTransaction(transactionId) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                const transaction = this.db.getTransaction(transactionId);
                if (!transaction) {
                    alert('Transaction not found!');
                    return;
                }

                const newBalance = this.currentAccount.current_balance - transaction.pnl;
                this.db.deleteTransaction(transactionId);
                this.db.updateAccountBalance(this.currentAccount.id, newBalance);
                this.currentAccount.current_balance = newBalance;

                this.updateDashboard();
                this.loadTransactionHistory();
                this.updateStatistics();
                this.loadAccounts();
                this.loadAccountsList();
            } catch (error) {
                console.error('Error deleting transaction:', error);
                alert('Error deleting transaction!');
            }
        }
    }

    deleteAccount(accountId) {
        if (confirm('Are you sure you want to delete this account? All transactions and strategies will be deleted!')) {
            try {
                this.db.deleteAccount(accountId);

                if (this.currentAccount && this.currentAccount.id === accountId) {
                    this.currentAccount = null;
                    localStorage.removeItem('lastSelectedAccountId');
                    document.getElementById('accountSelect').value = '';
                    this.updateDashboard();
                    this.loadTransactionHistory();
                    this.updateStatistics();
                }

                this.loadAccounts();
                this.loadAccountsList();
            } catch (error) {
                console.error('Error deleting account:', error);
                alert('Error deleting account!');
            }
        }
    }

    loadAccountsList() {
        const accounts = this.db.getAccounts();
        const accountsList = document.getElementById('accountsList');

        accountsList.innerHTML = '';

        accounts.forEach(account => {
            const profitLoss = account.current_balance - account.initial_balance;
            const profitLossPercent = account.initial_balance > 0 ? ((profitLoss / account.initial_balance) * 100) : 0;
            const profitLossClass = profitLoss >= 0 ? 'text-success' : 'text-danger';

            const accountItem = document.createElement('div');
            accountItem.className = 'p-4 bg-slate-700 rounded-lg border border-slate-600';
            accountItem.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-lg text-slate-100">${account.name}</span>
                        <span class="text-sm text-slate-400">Leverage: ${account.leverage}x</span>
                    </div>
                    <button class="delete-account-btn px-3 py-1 bg-danger hover:bg-red-600 text-white text-sm rounded transition duration-200" data-id="${account.id}">Delete</button>
                </div>
                <div class="flex gap-4 text-sm">
                    <div>
                        <span class="text-slate-400">Initial: </span>
                        <span class="text-slate-100">$${account.initial_balance.toFixed(2)}</span>
                    </div>
                    <div>
                        <span class="text-slate-400">Current: </span>
                        <span class="text-slate-100">$${account.current_balance.toFixed(2)}</span>
                    </div>
                    <div>
                        <span class="text-slate-400">P&L: </span>
                        <span class="font-semibold ${profitLossClass}">$${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)</span>
                    </div>
                </div>
            `;
            accountsList.appendChild(accountItem);
        });

        document.querySelectorAll('.delete-account-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const accountId = parseInt(e.target.getAttribute('data-id'));
                this.deleteAccount(accountId);
            });
        });
    }

    updateStatistics() {
        if (!this.currentAccount) return;

        const strategies = this.db.getStrategies(this.currentAccount.id);
        const container = document.getElementById('strategyStatsContainer');

        container.innerHTML = '';

        strategies.forEach(strategy => {
            const stats = this.db.getStrategyStats(this.currentAccount.id, strategy.name);

            const card = document.createElement('div');
            card.className = 'bg-slate-800 border border-slate-700 rounded-xl p-6';

            const profitFactorClass = stats.profit_factor >= 1 ? 'text-success' : 'text-danger';

            card.innerHTML = `
                <h3 class="text-xl font-bold text-slate-100 mb-4 text-center">${strategy.name}</h3>
                <div class="space-y-3">
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Total Trades</span>
                        <span class="font-semibold text-slate-100">${stats.total_trades}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Win Rate</span>
                        <span class="font-semibold text-slate-100">${stats.win_rate.toFixed(1)}%</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Total P&L</span>
                        <span class="font-semibold ${stats.total_pnl >= 0 ? 'text-success' : 'text-danger'}">$${stats.total_pnl.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Risk/Reward Ratio</span>
                        <span class="font-semibold text-slate-100">1:${stats.avg_rr_ratio.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Profit Factor</span>
                        <span class="font-semibold ${profitFactorClass}">${stats.profit_factor === Infinity ? '∞' : stats.profit_factor.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between py-2 border-b border-slate-700">
                        <span class="text-slate-400">Average Win</span>
                        <span class="font-semibold text-success">$${stats.avg_win.toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between py-2">
                        <span class="text-slate-400">Average Loss</span>
                        <span class="font-semibold text-danger">$${Math.abs(stats.avg_loss).toFixed(2)}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    openNotesModal(transactionId) {
        const transaction = this.db.getTransaction(transactionId);
        if (!transaction) {
            alert('Transaction not found!');
            return;
        }

        this.currentTransactionId = transactionId;
        document.getElementById('transactionNotes').value = transaction.notes || '';
        document.getElementById('notesModal').classList.remove('hidden');
    }

    closeNotesModal() {
        document.getElementById('notesModal').classList.add('hidden');
        this.currentTransactionId = null;
        document.getElementById('transactionNotes').value = '';
    }

    saveNotes() {
        if (!this.currentTransactionId) return;

        const notes = document.getElementById('transactionNotes').value;

        try {
            this.db.updateTransactionNotes(this.currentTransactionId, notes);
            this.closeNotesModal();
            this.loadTransactionHistory();
        } catch (error) {
            console.error('Error saving notes:', error);
            alert('Error saving notes!');
        }
    }

    exportBackup() {
        try {
            const data = this.db.db.export();
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            a.href = url;
            a.download = `trading-backup-${date}.db`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting backup:', error);
            alert('Error creating backup!');
        }
    }

    async importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('Are you sure you want to load the backup? All current data will be replaced!')) {
            event.target.value = '';
            return;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const data = new Uint8Array(arrayBuffer);

            // Save to localStorage
            localStorage.setItem('trading_tester_db', JSON.stringify(Array.from(data)));

            // Reload page to reinitialize with new database
            alert('Backup loaded successfully! The page will be refreshed.');
            location.reload();
        } catch (error) {
            console.error('Error importing backup:', error);
            alert('Error loading backup!');
            event.target.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TradingTester();
});
