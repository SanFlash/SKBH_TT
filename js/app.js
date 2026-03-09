// Table Tennis Tournament Manager - Main Application
class TournamentManager {
    constructor() {
        this.currentTab = 'dashboard';
        this.currentGroup = 'ALL';
        this.players = [];
        this.matches = [];
        this.standings = [];
        this.charts = {};
        this.isConnected = false;
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        
        this.init();
    }
    
    async init() {
        this.applyDarkMode();
        this.setupEventListeners();
        this.initializeCharts();
        await this.loadInitialData();
        this.startRealTimeUpdates();
        this.updateConnectionStatus(true);
    }
    
    setupEventListeners() {
        // Tab navigation
        window.showTab = (tabName) => this.showTab(tabName);
        window.toggleDarkMode = () => this.toggleDarkMode();
        window.toggleMobileMenu = () => this.toggleMobileMenu();
        
        // Tournament functions
        window.addPlayer = () => this.addPlayer();
        window.generateFixtures = () => this.generateFixtures();
        window.filterGroup = (group) => this.filterGroup(group);
        window.loadAvailableMatches = () => this.loadAvailableMatches();
        window.loadMatchDetails = () => this.loadMatchDetails();
        window.submitMatchResult = () => this.submitMatchResult();
        window.clearMatchForm = () => this.clearMatchForm();
    }
    
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        this.currentTab = tabName;
        
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'bg-opacity-20');
        });
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }
    
    async loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                await this.updateDashboard();
                break;
            case 'fixtures':
                await this.loadFixtures();
                break;
            case 'standings':
                await this.loadStandings();
                break;
            case 'matches':
                await this.loadMatchEntry();
                break;
        }
    }
    
    async loadInitialData() {
        try {
            await Promise.all([
                this.loadPlayers(),
                this.loadMatches(),
                this.loadStandings()
            ]);
            this.updateDashboard();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Error loading data', 'error');
        }
    }
    
    async loadPlayers() {
        try {
            const response = await fetch('tables/players');
            const data = await response.json();
            this.players = data.data || [];
            return this.players;
        } catch (error) {
            console.error('Error loading players:', error);
            return [];
        }
    }
    
    async loadMatches() {
        try {
            const response = await fetch('tables/matches');
            const data = await response.json();
            this.matches = data.data || [];
            return this.matches;
        } catch (error) {
            console.error('Error loading matches:', error);
            return [];
        }
    }
    
    async loadStandings() {
        try {
            const response = await fetch('tables/standings');
            const data = await response.json();
            this.standings = data.data || [];
            return this.standings;
        } catch (error) {
            console.error('Error loading standings:', error);
            return [];
        }
    }
    
    async updateDashboard() {
        await this.loadPlayers();
        await this.loadMatches();
        
        // Update statistics
        document.getElementById('totalPlayers').textContent = this.players.length;
        document.getElementById('totalMatches').textContent = this.matches.length;
        document.getElementById('completedMatches').textContent = this.matches.filter(m => m.status === 'completed').length;
        
        const activeGroups = new Set(this.players.map(p => p.group_id)).size;
        document.getElementById('activeGroups').textContent = activeGroups;
        
        // Update charts
        this.updateCharts();
        
        // Update recent activity
        this.updateRecentActivity();
    }
    
    initializeCharts() {
        // Group statistics chart
        const groupCtx = document.getElementById('groupChart').getContext('2d');
        this.charts.groupChart = new Chart(groupCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#3B82F6', '#10B981', '#F59E0B', '#EF4444'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        // Progress chart
        const progressCtx = document.getElementById('progressChart').getContext('2d');
        this.charts.progressChart = new Chart(progressCtx, {
            type: 'bar',
            data: {
                labels: ['Completed', 'Pending'],
                datasets: [{
                    label: 'Matches',
                    data: [0, 0],
                    backgroundColor: ['#10B981', '#F59E0B']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    updateCharts() {
        if (!this.charts.groupChart || !this.charts.progressChart) return;
        
        // Update group chart
        const groupCounts = {};
        this.players.forEach(player => {
            groupCounts[player.group_id] = (groupCounts[player.group_id] || 0) + 1;
        });
        
        this.charts.groupChart.data.labels = Object.keys(groupCounts);
        this.charts.groupChart.data.datasets[0].data = Object.values(groupCounts);
        this.charts.groupChart.update();
        
        // Update progress chart
        const completed = this.matches.filter(m => m.status === 'completed').length;
        const pending = this.matches.filter(m => m.status === 'pending').length;
        
        this.charts.progressChart.data.datasets[0].data = [completed, pending];
        this.charts.progressChart.update();
    }
    
    updateRecentActivity() {
        const container = document.getElementById('recentActivity');
        const recentMatches = this.matches
            .filter(m => m.status === 'completed')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 5);
        
        if (recentMatches.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-8">No recent activity</div>';
            return;
        }
        
        container.innerHTML = recentMatches.map(match => {
            const player1 = this.players.find(p => p.id === match.player1_id);
            const player2 = this.players.find(p => p.id === match.player2_id);
            const winner = this.players.find(p => p.id === match.winner_id);
            
            return `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-300">
                    <div class="flex items-center">
                        <div class="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <div>
                            <div class="font-medium text-gray-800">${player1?.name || 'Unknown'} vs ${player2?.name || 'Unknown'}</div>
                            <div class="text-sm text-gray-500">Group ${match.group_id} • ${match.stage}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-green-600">${winner?.name || 'TBD'} Won</div>
                        <div class="text-xs text-gray-500">${new Date(match.updated_at).toLocaleTimeString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        this.applyDarkMode();
    }
    
    applyDarkMode() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }
    
    toggleMobileMenu() {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('active');
    }
    
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        
        if (connected) {
            indicator.className = 'connection-indicator connected';
            text.textContent = 'Connected';
        } else {
            indicator.className = 'connection-indicator disconnected';
            text.textContent = 'Disconnected';
        }
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-blue-500';
        const icon = type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        
        toast.className = `slide-in bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3`;
        toast.innerHTML = `
            <div class="w-6 h-6 rounded-full ${bgColor} flex items-center justify-center">
                <i class="fas ${icon} text-white text-sm"></i>
            </div>
            <div class="text-gray-800">${message}</div>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
    }
    
    showLoading(show = true) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('hidden', !show);
    }
    
    startRealTimeUpdates() {
        // Simulate real-time updates with periodic data refresh
        setInterval(async () => {
            if (this.isConnected) {
                await this.loadTabData(this.currentTab);
            }
        }, 5000);
        
        // Update connection status periodically
        setInterval(() => {
            this.updateConnectionStatus(Math.random() > 0.1); // 90% connection rate simulation
        }, 10000);
    }
    
    // Tournament-specific methods to be implemented in other files
    async loadFixtures() {
        // To be implemented in fixtures.js
        console.log('Loading fixtures...');
    }
    
    async loadStandings() {
        // To be implemented in standings.js
        console.log('Loading standings...');
    }
    
    async loadMatchEntry() {
        // To be implemented in matches.js
        console.log('Loading match entry...');
    }
    
    async addPlayer() {
        // To be implemented in fixtures.js
        console.log('Adding player...');
    }
    
    async generateFixtures() {
        // To be implemented in fixtures.js
        console.log('Generating fixtures...');
    }
    
    async filterGroup(group) {
        // To be implemented in fixtures.js
        console.log('Filtering group:', group);
    }
    
    async loadAvailableMatches() {
        // To be implemented in matches.js
        console.log('Loading available matches...');
    }
    
    async loadMatchDetails() {
        // To be implemented in matches.js
        console.log('Loading match details...');
    }
    
    async submitMatchResult() {
        // To be implemented in matches.js
        console.log('Submitting match result...');
    }
    
    async clearMatchForm() {
        // To be implemented in matches.js
        console.log('Clearing match form...');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tournamentManager = new TournamentManager();
});

// Global functions for HTML onclick handlers
window.showTab = (tabName) => window.tournamentManager?.showTab(tabName);
window.toggleDarkMode = () => window.tournamentManager?.toggleDarkMode();
window.toggleMobileMenu = () => window.tournamentManager?.toggleMobileMenu();