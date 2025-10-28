class TradingTester {
    constructor() {
        this.db = new Database();
        this.currentAccount = null;
        this.currentTransactionId = null;
        this.currentTagDefinitionId = null;
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.sortColumn = 'created_at';
        this.sortDirection = 'desc';
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

        // Filter handlers
        document.getElementById('filterStrategy').addEventListener('change', () => {
            this.loadTransactionHistory();
        });

        document.getElementById('filterInstrument').addEventListener('change', () => {
            this.currentPage = 1;
            this.loadTransactionHistory();
        });

        // Pagination handlers
        document.getElementById('itemsPerPage').addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.currentPage = 1;
            this.loadTransactionHistory();
        });

        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.loadTransactionHistory();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = this.getTotalPages();
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.loadTransactionHistory();
            }
        });

        // Sorting handlers - using event delegation
        document.querySelector('thead').addEventListener('click', (e) => {
            const th = e.target.closest('th.sortable');
            if (th) {
                const column = th.getAttribute('data-column');
                this.sortBy(column);
            }
        });

        // Backup handlers
        document.getElementById('exportBackupBtn').addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('importBackupInput').addEventListener('change', (e) => {
            this.importBackup(e);
        });

        // Tag management handlers
        document.getElementById('addTagBtn').addEventListener('click', () => {
            this.addTag();
        });

        document.getElementById('closeTagFieldModal').addEventListener('click', () => {
            this.closeTagFieldModal();
        });

        document.getElementById('cancelTagFieldBtn').addEventListener('click', () => {
            this.closeTagFieldModal();
        });

        document.getElementById('tagFieldForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTagField();
        });

        document.getElementById('fieldType').addEventListener('change', (e) => {
            const optionsContainer = document.getElementById('fieldOptionsContainer');
            if (e.target.value === 'select' || e.target.value === 'checkbox') {
                optionsContainer.classList.remove('hidden');
            } else {
                optionsContainer.classList.add('hidden');
            }
        });

        // Trading Rules and Mistakes Log handlers
        document.getElementById('tradingRulesBtn').addEventListener('click', () => {
            this.openTradingRulesModal();
        });

        document.getElementById('closeTradingRulesModal').addEventListener('click', () => {
            this.closeTradingRulesModal();
        });

        document.getElementById('cancelTradingRulesBtn').addEventListener('click', () => {
            this.closeTradingRulesModal();
        });

        document.getElementById('saveTradingRulesBtn').addEventListener('click', () => {
            this.saveTradingRules();
        });

        document.getElementById('mistakesLogBtn').addEventListener('click', () => {
            this.openMistakesLogModal();
        });

        document.getElementById('closeMistakesLogModal').addEventListener('click', () => {
            this.closeMistakesLogModal();
        });

        document.getElementById('cancelMistakesLogBtn').addEventListener('click', () => {
            this.closeMistakesLogModal();
        });

        document.getElementById('saveMistakesLogBtn').addEventListener('click', () => {
            this.saveMistakesLog();
        });

        document.getElementById('closeTransactionEditModal').addEventListener('click', () => {
            this.closeTransactionEditModal();
        });

        document.getElementById('cancelTransactionEditBtn').addEventListener('click', () => {
            this.closeTransactionEditModal();
        });

        document.getElementById('saveTransactionEditBtn').addEventListener('click', () => {
            this.saveTransactionEdit();
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
            this.loadTags();
            this.renderTransactionTagsForm();
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
        const quickNotes = document.getElementById('transactionQuickNotes').value.trim();

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
            const transactionId = this.db.addTransaction(
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

            // Save quick notes if provided
            if (quickNotes) {
                this.db.updateTransactionNotes(transactionId, quickNotes);
            }

            // Collect and save transaction tags
            const tagsData = this.collectTransactionTagsData();
            if (tagsData.length > 0) {
                this.saveTransactionTags(transactionId, tagsData);
            }

            const newBalance = this.currentAccount.current_balance + pnl;
            this.db.updateAccountBalance(this.currentAccount.id, newBalance);
            this.currentAccount.current_balance = newBalance;

            document.getElementById('addTransactionForm').reset();
            document.getElementById('positionSize').textContent = '$0.00';
            document.getElementById('riskAmount').textContent = '$0.00';
            document.getElementById('rrRatio').textContent = '0:0';
            document.getElementById('potentialPnL').textContent = '$0.00';
            document.getElementById('potentialPnL').className = 'text-lg font-bold text-slate-100';

            // Reset tags form
            this.renderTransactionTagsForm();

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

    sortBy(column) {
        if (this.sortColumn === column) {
            // Toggle direction if same column
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New column - default to descending for numbers, ascending for text
            this.sortColumn = column;
            if (['created_at', 'instrument', 'strategy', 'direction'].includes(column)) {
                this.sortDirection = 'asc';
            } else {
                this.sortDirection = 'desc';
            }
        }
        this.currentPage = 1;
        this.loadTransactionHistory();
    }

    updateSortArrows() {
        // Clear all arrows
        document.querySelectorAll('.sort-arrow').forEach(arrow => {
            arrow.textContent = '';
        });

        // Set arrow for current sort column
        const currentTh = document.querySelector(`th[data-column="${this.sortColumn}"]`);
        if (currentTh) {
            const arrow = currentTh.querySelector('.sort-arrow');
            arrow.textContent = this.sortDirection === 'asc' ? ' ↑' : ' ↓';
        }
    }

    getTotalPages() {
        if (!this.currentAccount) return 1;

        let transactions = this.db.getTransactions(this.currentAccount.id);

        // Apply filters
        const filterStrategy = document.getElementById('filterStrategy').value;
        const filterInstrument = document.getElementById('filterInstrument').value;

        if (filterStrategy) {
            transactions = transactions.filter(t => t.strategy === filterStrategy);
        }

        if (filterInstrument) {
            transactions = transactions.filter(t => t.instrument === filterInstrument);
        }

        return Math.ceil(transactions.length / this.itemsPerPage) || 1;
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

        // Apply sorting
        transactions.sort((a, b) => {
            let aVal = a[this.sortColumn];
            let bVal = b[this.sortColumn];

            // Handle string comparison case-insensitively
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            let comparison = 0;
            if (aVal < bVal) comparison = -1;
            if (aVal > bVal) comparison = 1;

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });

        // Update sort arrows
        this.updateSortArrows();

        // Calculate pagination
        const totalPages = Math.ceil(transactions.length / this.itemsPerPage) || 1;
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTransactions = transactions.slice(startIndex, endIndex);

        // Update pagination controls
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;

        tbody.innerHTML = '';

        paginatedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            const date = transaction.created_at;

            const pnlClass = transaction.pnl >= 0 ? 'text-success' : 'text-danger';

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
                    <button class="view-edit-btn text-slate-300 hover:text-primary transition duration-200 mr-2" data-id="${transaction.id}" title="View/Edit">
                        📝
                    </button>
                    <button class="delete-transaction-btn text-slate-400 hover:text-danger transition duration-200" data-id="${transaction.id}" title="Delete transaction">
                        ✕
                    </button>
                </td>
            `;

            tbody.appendChild(row);
        });

        document.querySelectorAll('.view-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transactionId = parseInt(e.target.getAttribute('data-id'));
                this.openTransactionEditModal(transactionId);
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

    // Tag Management Methods
    addTag() {
        if (!this.currentAccount) {
            alert('Select an account!');
            return;
        }

        const name = document.getElementById('newTagName').value.trim();
        const category = document.getElementById('newTagCategory').value;
        const allowMultiple = document.getElementById('newTagAllowMultiple').checked;

        if (!name) {
            alert('Enter tag name!');
            return;
        }

        try {
            this.db.addTagDefinition(this.currentAccount.id, name, category, allowMultiple);
            document.getElementById('newTagName').value = '';
            document.getElementById('newTagAllowMultiple').checked = false;
            this.loadTags();
        } catch (error) {
            console.error('Error adding tag:', error);
            if (error.message && error.message.includes('UNIQUE constraint failed')) {
                alert('Tag with this name already exists!');
            } else {
                alert('Error adding tag!');
            }
        }
    }

    loadTags() {
        if (!this.currentAccount) return;

        const tags = this.db.getTagDefinitions(this.currentAccount.id);
        const container = document.getElementById('tagsContainer');
        container.innerHTML = '';

        // Group by category
        const categories = {
            'Pre-Trade Checklist': [],
            'Pre-Entry': [],
            'Entry → Break-Even': [],
            'During Trade': [],
            'Exit': [],
            'Other': []
        };

        tags.forEach(tag => {
            if (categories[tag.category]) {
                categories[tag.category].push(tag);
            }
        });

        // Render each category
        Object.keys(categories).forEach(category => {
            const categoryTags = categories[category];
            if (categoryTags.length === 0) return;

            const categoryDiv = document.createElement('details');
            categoryDiv.className = 'mb-4 bg-slate-700/30 border border-slate-600 rounded-lg';
            categoryDiv.innerHTML = `
                <summary class="cursor-pointer px-4 py-3 font-semibold text-slate-100 hover:bg-slate-700/50 rounded-lg transition select-none">
                    ${category} (${categoryTags.length})
                </summary>
                <div class="px-4 pb-4 pt-2 space-y-3" id="category-${category.replace(/\s+/g, '-')}"></div>
            `;
            container.appendChild(categoryDiv);

            const categoryContainer = categoryDiv.querySelector(`#category-${category.replace(/\s+/g, '-')}`);

            categoryTags.forEach(tag => {
                const fields = this.db.getTagFields(tag.id);

                const tagCard = document.createElement('div');
                tagCard.className = 'bg-slate-700/50 border border-slate-600 rounded-lg p-4';

                let fieldsHTML = '';
                if (fields.length > 0) {
                    fieldsHTML = `
                        <details class="mt-3 pt-3 border-t border-slate-600">
                            <summary class="text-xs text-slate-400 mb-2 cursor-pointer hover:text-slate-300 transition select-none">
                                Fields: (${fields.length})
                            </summary>
                            <div class="space-y-1 mt-2">
                                ${fields.map(field => `
                                    <div class="flex justify-between items-center text-sm">
                                        <span class="text-slate-300">${field.field_name} <span class="text-xs text-slate-500">(${field.field_type})</span>${field.is_required ? ' <span class="text-red-400">*</span>' : ''}</span>
                                        <button class="delete-field-btn text-slate-400 hover:text-danger transition" data-field-id="${field.id}">✕</button>
                                    </div>
                                `).join('')}
                            </div>
                        </details>
                    `;
                }

                tagCard.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-semibold text-slate-100">${tag.name}</span>
                                ${tag.allow_multiple ? '<span class="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Multiple</span>' : ''}
                            </div>
                            ${fieldsHTML}
                        </div>
                        <div class="flex gap-2">
                            <button class="add-field-btn px-3 py-1 bg-primary hover:bg-blue-600 text-white text-sm rounded transition" data-tag-id="${tag.id}">
                                + Field
                            </button>
                            <button class="delete-tag-btn px-3 py-1 bg-danger hover:bg-red-600 text-white text-sm rounded transition" data-tag-id="${tag.id}">
                                Delete
                            </button>
                        </div>
                    </div>
                `;

                categoryContainer.appendChild(tagCard);
            });
        });

        // Attach event listeners
        document.querySelectorAll('.add-field-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = parseInt(e.target.getAttribute('data-tag-id'));
                this.openTagFieldModal(tagId);
            });
        });

        document.querySelectorAll('.delete-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tagId = parseInt(e.target.getAttribute('data-tag-id'));
                this.deleteTag(tagId);
            });
        });

        document.querySelectorAll('.delete-field-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const fieldId = parseInt(e.target.getAttribute('data-field-id'));
                this.deleteTagField(fieldId);
            });
        });
    }

    deleteTag(tagId) {
        if (confirm('Are you sure you want to delete this tag? All associated fields will be deleted!')) {
            try {
                this.db.deleteTagDefinition(tagId);
                this.loadTags();
            } catch (error) {
                console.error('Error deleting tag:', error);
                alert('Error deleting tag!');
            }
        }
    }

    openTagFieldModal(tagDefinitionId) {
        this.currentTagDefinitionId = tagDefinitionId;
        document.getElementById('tagFieldModal').classList.remove('hidden');
        document.getElementById('tagFieldForm').reset();
        document.getElementById('fieldOptionsContainer').classList.add('hidden');
    }

    closeTagFieldModal() {
        document.getElementById('tagFieldModal').classList.add('hidden');
        this.currentTagDefinitionId = null;
        document.getElementById('tagFieldForm').reset();
    }

    addTagField() {
        if (!this.currentTagDefinitionId) return;

        const fieldName = document.getElementById('fieldName').value.trim();
        const fieldType = document.getElementById('fieldType').value;
        const isRequired = document.getElementById('fieldRequired').checked;

        if (!fieldName) {
            alert('Enter field name!');
            return;
        }

        let fieldConfig = {};

        // For select and checkbox, parse options
        if (fieldType === 'select' || fieldType === 'checkbox') {
            const optionsText = document.getElementById('fieldOptions').value.trim();
            if (!optionsText) {
                alert('Enter at least one option!');
                return;
            }
            const options = optionsText.split('\n').map(o => o.trim()).filter(o => o.length > 0);
            if (options.length === 0) {
                alert('Enter at least one option!');
                return;
            }
            fieldConfig = { options };
        }

        try {
            // Get current max display order
            const existingFields = this.db.getTagFields(this.currentTagDefinitionId);
            const displayOrder = existingFields.length;

            this.db.addTagField(this.currentTagDefinitionId, fieldName, fieldType, fieldConfig, isRequired, displayOrder);
            this.closeTagFieldModal();
            this.loadTags();
        } catch (error) {
            console.error('Error adding tag field:', error);
            alert('Error adding field!');
        }
    }

    deleteTagField(fieldId) {
        if (confirm('Are you sure you want to delete this field?')) {
            try {
                this.db.deleteTagField(fieldId);
                this.loadTags();
            } catch (error) {
                console.error('Error deleting field:', error);
                alert('Error deleting field!');
            }
        }
    }

    renderTransactionTagsForm() {
        if (!this.currentAccount) return;

        const container = document.getElementById('transactionTagsSection');
        container.innerHTML = '';

        const tags = this.db.getTagDefinitions(this.currentAccount.id);
        if (tags.length === 0) return;

        // Group by category
        const categories = {
            'Pre-Trade Checklist': [],
            'Pre-Entry': [],
            'Entry → Break-Even': [],
            'During Trade': [],
            'Exit': [],
            'Other': []
        };

        tags.forEach(tag => {
            if (categories[tag.category]) {
                categories[tag.category].push(tag);
            }
        });

        // Render each category with tags
        Object.keys(categories).forEach(category => {
            const categoryTags = categories[category];
            if (categoryTags.length === 0) return;

            const categorySection = document.createElement('details');
            categorySection.className = 'bg-slate-700/30 border border-slate-600 rounded-lg mb-3';
            categorySection.innerHTML = `
                <summary class="px-4 py-3 cursor-pointer font-semibold text-slate-100 hover:bg-slate-700/50 rounded-lg transition">
                    ${category}
                </summary>
                <div class="px-4 pb-4 space-y-4" id="category-fields-${category.replace(/\s+/g, '-')}"></div>
            `;
            container.appendChild(categorySection);

            const fieldsContainer = categorySection.querySelector(`#category-fields-${category.replace(/\s+/g, '-')}`);

            categoryTags.forEach(tag => {
                const fields = this.db.getTagFields(tag.id);
                if (fields.length === 0) return;

                const tagDiv = document.createElement('div');
                tagDiv.className = 'border-t border-slate-600 pt-3 first:border-t-0 first:pt-0';
                tagDiv.innerHTML = `
                    <div class="flex items-center gap-3 mb-3">
                        <label class="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" class="tag-enable-checkbox w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-primary" data-tag-id="${tag.id}">
                            <span class="font-medium">${tag.name}</span>
                        </label>
                        ${tag.allow_multiple ? '<button type="button" class="add-tag-instance-btn text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition hidden" data-tag-id="' + tag.id + '">+ Add Another</button>' : ''}
                    </div>
                    <div class="tag-fields-container hidden" data-tag-id="${tag.id}"></div>
                `;
                fieldsContainer.appendChild(tagDiv);

                // Event listener for checkbox
                const checkbox = tagDiv.querySelector('.tag-enable-checkbox');
                const tagFieldsContainer = tagDiv.querySelector('.tag-fields-container');
                const addInstanceBtn = tagDiv.querySelector('.add-tag-instance-btn');

                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        tagFieldsContainer.classList.remove('hidden');
                        if (addInstanceBtn) addInstanceBtn.classList.remove('hidden');
                        this.renderTagFieldsInstance(tag, fields, tagFieldsContainer, 1);
                    } else {
                        tagFieldsContainer.classList.add('hidden');
                        if (addInstanceBtn) addInstanceBtn.classList.add('hidden');
                        tagFieldsContainer.innerHTML = '';
                    }
                });

                // Event listener for "Add Another" button
                if (addInstanceBtn && tag.allow_multiple) {
                    addInstanceBtn.addEventListener('click', () => {
                        const existingInstances = tagFieldsContainer.querySelectorAll('.tag-instance');
                        const nextInstance = existingInstances.length + 1;
                        this.renderTagFieldsInstance(tag, fields, tagFieldsContainer, nextInstance);
                    });
                }
            });
        });
    }

    renderTagFieldsInstance(tag, fields, container, instanceNumber) {
        const instanceDiv = document.createElement('div');
        instanceDiv.className = 'tag-instance bg-slate-700/30 rounded-lg p-3 mb-3';
        instanceDiv.setAttribute('data-tag-id', tag.id);
        instanceDiv.setAttribute('data-instance', instanceNumber);

        let fieldsHTML = '';
        if (tag.allow_multiple && instanceNumber > 1) {
            fieldsHTML += `
                <div class="flex justify-between items-center mb-3">
                    <span class="text-xs text-slate-400">Instance #${instanceNumber}</span>
                    <button type="button" class="remove-tag-instance-btn text-xs text-danger hover:text-red-400">Remove</button>
                </div>
            `;
        }

        fieldsHTML += '<div class="grid grid-cols-2 gap-3">';

        fields.forEach(field => {
            const fieldId = `tag_${tag.id}_${instanceNumber}_field_${field.id}`;
            fieldsHTML += this.renderTagField(field, fieldId);
        });

        fieldsHTML += '</div>';
        instanceDiv.innerHTML = fieldsHTML;
        container.appendChild(instanceDiv);

        // Add remove button listener
        const removeBtn = instanceDiv.querySelector('.remove-tag-instance-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                instanceDiv.remove();
            });
        }
    }

    renderTagField(field, fieldId) {
        const required = field.is_required ? 'required' : '';
        const requiredLabel = field.is_required ? '<span class="text-red-400">*</span>' : '';

        let fieldHTML = `
            <div>
                <label for="${fieldId}" class="block text-xs font-medium text-slate-300 mb-1">
                    ${field.field_name} ${requiredLabel}
                </label>
        `;

        switch (field.field_type) {
            case 'number':
                fieldHTML += `
                    <input type="number" id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                `;
                break;

            case 'decimal':
                fieldHTML += `
                    <input type="number" step="0.01" id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                `;
                break;

            case 'boolean':
                fieldHTML += `
                    <select id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                        <option value="">Select...</option>
                        <option value="true">Yes / True</option>
                        <option value="false">No / False</option>
                    </select>
                `;
                break;

            case 'select':
                fieldHTML += `
                    <select id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                        <option value="">Select...</option>
                        ${field.field_config.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                `;
                break;

            case 'checkbox':
                fieldHTML += `<div class="space-y-1 mt-1">`;
                field.field_config.options.forEach((opt, idx) => {
                    fieldHTML += `
                        <label class="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" name="${fieldId}" value="${opt}"
                                class="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-primary">
                            ${opt}
                        </label>
                    `;
                });
                fieldHTML += `</div>`;
                break;

            case 'datetime':
                fieldHTML += `
                    <input type="datetime-local" id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                `;
                break;

            case 'text':
                fieldHTML += `
                    <input type="text" id="${fieldId}" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100">
                `;
                break;

            case 'textarea':
                fieldHTML += `
                    <textarea id="${fieldId}" rows="3" ${required}
                        class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-slate-100 resize-none"></textarea>
                `;
                break;
        }

        fieldHTML += `</div>`;
        return fieldHTML;
    }

    collectTransactionTagsData() {
        const tagsData = [];
        const tagContainers = document.querySelectorAll('.tag-fields-container:not(.hidden)');

        tagContainers.forEach(container => {
            const tagId = parseInt(container.getAttribute('data-tag-id'));
            const instances = container.querySelectorAll('.tag-instance');

            instances.forEach(instance => {
                const instanceNumber = parseInt(instance.getAttribute('data-instance'));
                const fields = instance.querySelectorAll('input, select, textarea');
                const fieldValues = {};

                fields.forEach(field => {
                    if (field.type === 'checkbox') {
                        // For checkbox groups, collect all checked values
                        const checkboxes = instance.querySelectorAll(`input[name="${field.name}"]:checked`);
                        if (checkboxes.length > 0) {
                            const values = Array.from(checkboxes).map(cb => cb.value);
                            // Extract field id from the name
                            const fieldIdMatch = field.name.match(/field_(\d+)/);
                            if (fieldIdMatch) {
                                fieldValues[fieldIdMatch[1]] = values.join(', ');
                            }
                        }
                    } else if (field.id) {
                        // Extract field id from the element id
                        const fieldIdMatch = field.id.match(/field_(\d+)/);
                        if (fieldIdMatch && field.value) {
                            fieldValues[fieldIdMatch[1]] = field.value;
                        }
                    }
                });

                if (Object.keys(fieldValues).length > 0) {
                    tagsData.push({
                        tagDefinitionId: tagId,
                        instanceNumber: instanceNumber,
                        fieldValues: fieldValues
                    });
                }
            });
        });

        return tagsData;
    }

    saveTransactionTags(transactionId, tagsData) {
        try {
            tagsData.forEach(tagData => {
                const transactionTagId = this.db.addTransactionTag(
                    transactionId,
                    tagData.tagDefinitionId,
                    tagData.instanceNumber
                );

                // Save field values
                Object.keys(tagData.fieldValues).forEach(fieldId => {
                    this.db.addTransactionTagValue(
                        transactionTagId,
                        parseInt(fieldId),
                        tagData.fieldValues[fieldId]
                    );
                });
            });
        } catch (error) {
            console.error('Error saving transaction tags:', error);
            throw error;
        }
    }

    openTransactionEditModal(transactionId) {
        const transaction = this.db.getTransaction(transactionId);
        if (!transaction) {
            alert('Transaction not found!');
            return;
        }

        this.currentTransactionId = transactionId;
        const content = document.getElementById('transactionEditContent');
        content.innerHTML = '';

        // Transaction Details Section
        const detailsSection = document.createElement('div');
        detailsSection.className = 'bg-slate-700/30 border border-slate-600 rounded-lg p-6';
        detailsSection.innerHTML = `
            <h3 class="text-xl font-semibold text-slate-100 mb-4">Transaction Details</h3>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Date</label>
                    <input type="date" id="edit_transactionDate" value="${transaction.created_at}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Instrument</label>
                    <input type="text" id="edit_instrument" value="${transaction.instrument}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Strategy</label>
                    <input type="text" id="edit_strategy" value="${transaction.strategy}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Direction</label>
                    <select id="edit_direction"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                        <option value="LONG" ${transaction.direction === 'LONG' ? 'selected' : ''}>LONG</option>
                        <option value="SHORT" ${transaction.direction === 'SHORT' ? 'selected' : ''}>SHORT</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Entry Price</label>
                    <input type="number" step="0.00001" id="edit_entryPrice" value="${transaction.entry_price}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Stop Loss</label>
                    <input type="number" step="0.00001" id="edit_stopLoss" value="${transaction.stop_loss}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Exit Price</label>
                    <input type="number" step="0.00001" id="edit_exitPrice" value="${transaction.exit_price}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-2">Risk %</label>
                    <input type="number" step="0.1" id="edit_riskPercent" value="${transaction.risk_percent}"
                        class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                </div>
            </div>
            <div class="mt-4">
                <label class="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                <textarea id="edit_notes" rows="3"
                    class="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100 resize-none">${transaction.notes || ''}</textarea>
            </div>
        `;
        content.appendChild(detailsSection);

        // Tags Section
        this.renderEditableTags(transactionId, content);

        document.getElementById('transactionEditModal').classList.remove('hidden');
    }

    renderEditableTags(transactionId, container) {
        const tagsWithValues = this.db.getTransactionTagsWithValues(transactionId);
        const allTags = this.db.getTagDefinitions(this.currentAccount.id);

        const tagsSection = document.createElement('div');
        tagsSection.className = 'bg-slate-700/30 border border-slate-600 rounded-lg p-6';
        tagsSection.innerHTML = '<h3 class="text-xl font-semibold text-slate-100 mb-4">Tags</h3>';

        const categories = {
            'Pre-Trade Checklist': [],
            'Pre-Entry': [],
            'Entry → Break-Even': [],
            'During Trade': [],
            'Exit': [],
            'Other': []
        };

        // Group existing tags by category
        tagsWithValues.forEach(tag => {
            if (categories[tag.category]) {
                categories[tag.category].push(tag);
            }
        });

        // Render each category
        Object.keys(categories).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'mb-4';

            const categoryHeader = document.createElement('h4');
            categoryHeader.className = 'text-lg font-medium text-slate-100 mb-3';
            categoryHeader.textContent = category;
            categoryDiv.appendChild(categoryHeader);

            const categoryContent = document.createElement('div');
            categoryContent.className = 'space-y-3';

            const categoryTags = categories[category];

            // Group by tag definition and instance
            const tagsByDef = {};
            categoryTags.forEach(tag => {
                const key = `${tag.tag_definition_id}_${tag.instance_number}`;
                if (!tagsByDef[key]) {
                    tagsByDef[key] = {
                        transactionTagId: tag.id,
                        tagDefinitionId: tag.tag_definition_id,
                        name: tag.name,
                        instance: tag.instance_number,
                        values: tag.values || []
                    };
                }
            });

            Object.values(tagsByDef).forEach(tag => {
                const tagCard = document.createElement('div');
                tagCard.className = 'bg-slate-700/50 rounded-lg p-4';

                let cardHTML = `
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <span class="font-medium text-slate-100">${tag.name}</span>
                            ${tag.instance > 1 ? `<span class="text-xs text-slate-400">#${tag.instance}</span>` : ''}
                        </div>
                        <button class="remove-tag-instance-btn text-xs text-danger hover:text-red-400" data-transaction-tag-id="${tag.transactionTagId}">Remove</button>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                `;

                tag.values.forEach(value => {
                    const fieldId = `edit_tag_${tag.transactionTagId}_field_${value.tag_field_id}`;
                    cardHTML += this.renderEditableTagField(value, fieldId);
                });

                cardHTML += `</div>`;
                tagCard.innerHTML = cardHTML;
                categoryContent.appendChild(tagCard);
            });

            if (categoryTags.length === 0) {
                categoryContent.innerHTML = '<p class="text-sm text-slate-400">No tags in this category</p>';
            }

            categoryDiv.appendChild(categoryContent);
            tagsSection.appendChild(categoryDiv);
        });

        container.appendChild(tagsSection);

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-tag-instance-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Remove this tag instance?')) {
                    const transactionTagId = parseInt(e.target.getAttribute('data-transaction-tag-id'));
                    this.db.deleteTransactionTag(transactionTagId);
                    this.openTransactionEditModal(transactionId); // Refresh modal
                }
            });
        });
    }

    renderEditableTagField(value, fieldId) {
        let fieldHTML = `
            <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">${value.field_name}</label>
        `;

        switch (value.field_type) {
            case 'number':
                fieldHTML += `<input type="number" id="${fieldId}" value="${value.value || ''}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">`;
                break;
            case 'decimal':
                fieldHTML += `<input type="number" step="0.01" id="${fieldId}" value="${value.value || ''}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">`;
                break;
            case 'boolean':
                fieldHTML += `<select id="${fieldId}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                    <option value="">Select...</option>
                    <option value="true" ${value.value === 'true' ? 'selected' : ''}>Yes / True</option>
                    <option value="false" ${value.value === 'false' ? 'selected' : ''}>No / False</option>
                </select>`;
                break;
            case 'select':
                const selectOptions = value.field_config.options || [];
                fieldHTML += `<select id="${fieldId}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">
                    <option value="">Select...</option>
                    ${selectOptions.map(opt => `<option value="${opt}" ${value.value === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                </select>`;
                break;
            case 'checkbox':
                const checkOptions = value.field_config.options || [];
                const selectedValues = value.value ? value.value.split(', ') : [];
                fieldHTML += `<div class="space-y-1 mt-1">`;
                checkOptions.forEach(opt => {
                    const checked = selectedValues.includes(opt) ? 'checked' : '';
                    fieldHTML += `
                        <label class="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" name="${fieldId}" value="${opt}" ${checked}
                                class="w-4 h-4 bg-slate-700 border border-slate-600 rounded focus:ring-2 focus:ring-primary">
                            ${opt}
                        </label>
                    `;
                });
                fieldHTML += `</div>`;
                break;
            case 'datetime':
                fieldHTML += `<input type="datetime-local" id="${fieldId}" value="${value.value || ''}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">`;
                break;
            case 'text':
                fieldHTML += `<input type="text" id="${fieldId}" value="${value.value || ''}"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100">`;
                break;
            case 'textarea':
                fieldHTML += `<textarea id="${fieldId}" rows="3"
                    class="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg focus:ring-2 focus:ring-primary outline-none text-slate-100 resize-none">${value.value || ''}</textarea>`;
                break;
        }

        fieldHTML += `</div>`;
        return fieldHTML;
    }

    closeTransactionEditModal() {
        document.getElementById('transactionEditModal').classList.add('hidden');
        this.currentTransactionId = null;
    }

    saveTransactionEdit() {
        if (!this.currentTransactionId) return;

        try {
            // Get transaction details
            const transactionDate = document.getElementById('edit_transactionDate').value;
            const instrument = document.getElementById('edit_instrument').value;
            const strategy = document.getElementById('edit_strategy').value;
            const direction = document.getElementById('edit_direction').value;
            const entryPrice = parseFloat(document.getElementById('edit_entryPrice').value);
            const stopLoss = parseFloat(document.getElementById('edit_stopLoss').value);
            const exitPrice = parseFloat(document.getElementById('edit_exitPrice').value);
            const riskPercent = parseFloat(document.getElementById('edit_riskPercent').value);
            const notes = document.getElementById('edit_notes').value;

            // Recalculate values
            const oldTransaction = this.db.getTransaction(this.currentTransactionId);
            const oldPnl = oldTransaction.pnl;

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

            // Update transaction in database
            this.db.updateTransaction(this.currentTransactionId, {
                instrument,
                strategy,
                direction,
                entry_price: entryPrice,
                stop_loss: stopLoss,
                exit_price: exitPrice,
                risk_percent: riskPercent,
                risk_amount: riskAmount,
                position_size: positionSize,
                rr_ratio: rrRatio,
                pnl,
                roi,
                created_at: transactionDate,
                notes
            });

            // Update tag values
            const tagsWithValues = this.db.getTransactionTagsWithValues(this.currentTransactionId);
            tagsWithValues.forEach(tag => {
                tag.values.forEach(value => {
                    const fieldId = `edit_tag_${tag.id}_field_${value.tag_field_id}`;
                    const element = document.getElementById(fieldId);

                    let newValue = '';
                    if (element) {
                        if (element.type === 'checkbox') {
                            const checkboxes = document.querySelectorAll(`input[name="${fieldId}"]:checked`);
                            newValue = Array.from(checkboxes).map(cb => cb.value).join(', ');
                        } else {
                            newValue = element.value;
                        }
                    }

                    // Update value in database
                    this.db.updateTransactionTagValue(value.id, newValue);
                });
            });

            // Update account balance
            const pnlDifference = pnl - oldPnl;
            const newBalance = this.currentAccount.current_balance + pnlDifference;
            this.db.updateAccountBalance(this.currentAccount.id, newBalance);
            this.currentAccount.current_balance = newBalance;

            this.closeTransactionEditModal();
            this.updateDashboard();
            this.loadTransactionHistory();
            this.updateStatistics();
            this.loadAccounts();

            alert('Transaction updated successfully!');
        } catch (error) {
            console.error('Error saving transaction:', error);
            alert('Error saving transaction!');
        }
    }

    // Trading Rules Modal Methods
    openTradingRulesModal() {
        const modal = document.getElementById('tradingRulesModal');
        const textarea = document.getElementById('tradingRulesText');

        // Load existing rules from database
        const rules = this.db.getSetting('trading_rules') || '';
        textarea.value = rules;

        modal.classList.remove('hidden');
    }

    closeTradingRulesModal() {
        document.getElementById('tradingRulesModal').classList.add('hidden');
    }

    saveTradingRules() {
        const rules = document.getElementById('tradingRulesText').value;
        this.db.setSetting('trading_rules', rules);
        this.closeTradingRulesModal();
        alert('Trading Rules saved!');
    }

    // Mistakes Log Modal Methods
    openMistakesLogModal() {
        const modal = document.getElementById('mistakesLogModal');
        const textarea = document.getElementById('mistakesLogText');

        // Load existing log from database
        const log = this.db.getSetting('mistakes_log') || '';
        textarea.value = log;

        modal.classList.remove('hidden');
    }

    closeMistakesLogModal() {
        document.getElementById('mistakesLogModal').classList.add('hidden');
    }

    saveMistakesLog() {
        const log = document.getElementById('mistakesLogText').value;
        this.db.setSetting('mistakes_log', log);
        this.closeMistakesLogModal();
        alert('Mistakes Log saved!');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TradingTester();
});
