// Dashboard JavaScript
class TournamentDashboard {
    constructor() {
        this.socket = null;
        this.currentGroup = 'A';
        this.charts = {};
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.bindEvents();
        this.loadInitialData();
        this.initCharts();
    }

    connectWebSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            console.log('Connected to tournament server');
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
            console.log('Disconnected from tournament server');
        });

        this.socket.on('match_updated', (data) => {
            console.log('Match updated:', data);
            this.refreshData();
        });
    }

    updateConnectionStatus(connected) {
        const statusIndicator = document.getElementById('status-indicator');
        const connectionText = document.getElementById('connection-text');
        
        if (connected) {
            statusIndicator.classList.add('connected');
            statusIndicator.classList.remove('disconnected');
            connectionText.textContent = 'Connected';
        } else {
            statusIndicator.classList.add('disconnected');
            statusIndicator.classList.remove('connected');
            connectionText.textContent = 'Disconnected';
        }
    }

    bindEvents() {
        // Group selection
        document.querySelectorAll('.group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentGroup = e.target.dataset.group;
                this.loadGroupData();
            });
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    async loadInitialData() {
        try {
            await this.loadTournamentOverview();
            await this.loadGroupData();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async refreshData() {
        await this.loadTournamentOverview();
        await this.loadGroupData();
    }

    async loadTournamentOverview() {
        try {
            const playersResponse = await fetch('/api/players');
            const players = await playersResponse.json();
            
            const matchesResponse = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await matchesResponse.json();
            
            const completedMatches = matches.filter(m => m.status === 'completed').length;
            const pendingMatches = matches.filter(m => m.status === 'pending').length;
            const liveMatches = matches.filter(m => m.status === 'live').length;
            
            document.getElementById('total-players').textContent = players.length;
            document.getElementById('completed-matches').textContent = completedMatches;
            document.getElementById('pending-matches').textContent = pendingMatches;
            document.getElementById('live-matches').textContent = liveMatches;
            
        } catch (error) {
            console.error('Error loading tournament overview:', error);
        }
    }

    async loadGroupData() {
        try {
            await this.loadStandings();
            await this.loadQualificationPredictions();
            await this.loadRecentMatches();
            await this.loadUpcomingMatches();
            this.updateChartTitles();
        } catch (error) {
            console.error('Error loading group data:', error);
        }
    }

    async loadStandings() {
        try {
            const response = await fetch(`/api/standings/${this.currentGroup}`);
            const standings = await response.json();
            
            const tbody = document.getElementById('standings-tbody');
            tbody.innerHTML = '';
            
            standings.forEach((standing, index) => {
                const row = document.createElement('tr');
                if (index < 3) {
                    row.classList.add(`rank-${index + 1}`);
                }
                
                row.innerHTML = `
                    <td>${standing.rank}</td>
                    <td class="player-name">${standing.player.name}</td>
                    <td>${standing.matches_played}</td>
                    <td>${standing.wins}</td>
                    <td>${standing.losses}</td>
                    <td>${standing.sets_won}</td>
                    <td>${standing.sets_lost}</td>
                    <td>${standing.set_difference > 0 ? '+' : ''}${standing.set_difference}</td>
                    <td>${standing.points_for}</td>
                    <td>${standing.points_against}</td>
                    <td>${standing.point_difference > 0 ? '+' : ''}${standing.point_difference}</td>
                    <td><strong>${standing.ranking_points}</strong></td>
                `;
                
                tbody.appendChild(row);
            });
            
            document.querySelector('.standings-section h2').textContent = `Current Standings - Group ${this.currentGroup}`;
            
        } catch (error) {
            console.error('Error loading standings:', error);
        }
    }

    async loadQualificationPredictions() {
        try {
            const response = await fetch(`/api/qualification/${this.currentGroup}`);
            const predictions = await response.json();
            
            const container = document.getElementById('predictions-grid');
            container.innerHTML = '';
            
            predictions.forEach(pred => {
                const card = document.createElement('div');
                card.className = 'prediction-card';
                
                if (pred.probability >= 80) {
                    card.classList.add('likely');
                } else if (pred.probability >= 40) {
                    card.classList.add('possible');
                } else {
                    card.classList.add('eliminated');
                }
                
                card.innerHTML = `
                    <div class="prediction-header">
                        <div class="prediction-name">${pred.player.name}</div>
                        <div class="prediction-probability">${pred.probability}%</div>
                    </div>
                    <div class="prediction-details">
                        <div>Position: ${pred.current_position} | Points: ${pred.ranking_points}</div>
                        <div>Remaining: ${pred.remaining_matches} matches</div>
                        <div>Max Possible: ${pred.max_possible_points} pts</div>
                        <div><strong>${pred.status}</strong></div>
                    </div>
                `;
                
                container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error loading qualification predictions:', error);
        }
    }

    async loadRecentMatches() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await response.json();
            
            const recentMatches = matches
                .filter(m => m.status === 'completed')
                .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                .slice(0, 5);
            
            const container = document.getElementById('recent-matches');
            container.innerHTML = '';
            
            if (recentMatches.length === 0) {
                container.innerHTML = '<p class="text-center">No completed matches yet</p>';
                return;
            }
            
            recentMatches.forEach(match => {
                const card = this.createMatchCard(match, true);
                container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error loading recent matches:', error);
        }
    }

    async loadUpcomingMatches() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await response.json();
            
            const upcomingMatches = matches
                .filter(m => m.status === 'pending')
                .slice(0, 5);
            
            const container = document.getElementById('upcoming-matches');
            container.innerHTML = '';
            
            if (upcomingMatches.length === 0) {
                container.innerHTML = '<p class="text-center">No upcoming matches</p>';
                return;
            }
            
            upcomingMatches.forEach(match => {
                const card = this.createMatchCard(match, false);
                container.appendChild(card);
            });
            
        } catch (error) {
            console.error('Error loading upcoming matches:', error);
        }
    }

    createMatchCard(match, isCompleted) {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        const winner = match.winner;
        const isPlayer1Winner = winner && winner.id === match.player1.id;
        const isPlayer2Winner = winner && winner.id === match.player2.id;
        
        card.innerHTML = `
            <div class="match-header">
                <span class="match-round">Round ${match.round_number}</span>
                <span class="match-status status-${match.status}">${match.status.toUpperCase()}</span>
            </div>
            <div class="match-players">
                <span class="player-name ${isCompleted ? (isPlayer1Winner ? 'winner' : 'loser') : ''}">${match.player1.name}</span>
                <span class="vs-text">VS</span>
                <span class="player-name ${isCompleted ? (isPlayer2Winner ? 'winner' : 'loser') : ''}">${match.player2.name}</span>
            </div>
            ${isCompleted ? `<div class="match-scores">Winner: ${winner.name}</div>` : ''}
        `;
        
        return card;
    }

    initCharts() {
        // Points distribution chart
        const pointsCtx = document.getElementById('pointsChart').getContext('2d');
        this.charts.points = new Chart(pointsCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
                        '#1abc9c', '#34495e', '#d35400', '#27ae60', '#8e44ad'
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

        // Win/Loss ratio chart
        const winLossCtx = document.getElementById('winLossChart').getContext('2d');
        this.charts.winLoss = new Chart(winLossCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Wins',
                        data: [],
                        backgroundColor: '#2ecc71'
                    },
                    {
                        label: 'Losses',
                        data: [],
                        backgroundColor: '#e74c3c'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    async updateChartTitles() {
        try {
            const response = await fetch(`/api/standings/${this.currentGroup}`);
            const standings = await response.json();
            
            // Update points chart
            const pointsLabels = standings.map(s => s.player.name);
            const pointsData = standings.map(s => s.ranking_points);
            
            this.charts.points.data.labels = pointsLabels;
            this.charts.points.data.datasets[0].data = pointsData;
            this.charts.points.update();
            
            // Update win/loss chart
            const winLossLabels = standings.map(s => s.player.name);
            const winsData = standings.map(s => s.wins);
            const lossesData = standings.map(s => s.losses);
            
            this.charts.winLoss.data.labels = winLossLabels;
            this.charts.winLoss.data.datasets[0].data = winsData;
            this.charts.winLoss.data.datasets[1].data = lossesData;
            this.charts.winLoss.update();
            
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TournamentDashboard();
});