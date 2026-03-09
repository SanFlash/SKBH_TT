// Standings JavaScript
class StandingsManager {
    constructor() {
        this.socket = null;
        this.currentGroup = 'A';
        this.currentView = 'table';
        this.standings = [];
        this.matches = [];
        this.players = [];
        this.charts = {};
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.bindEvents();
        this.loadInitialData();
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
        document.getElementById('group-select').addEventListener('change', (e) => {
            this.currentGroup = e.target.value;
            this.loadGroupData();
        });

        // View selection
        document.getElementById('view-select').addEventListener('change', (e) => {
            this.currentView = e.target.value;
            this.switchView();
        });

        // Refresh button
        document.getElementById('refresh-standings').addEventListener('click', () => {
            this.refreshData();
        });

        // Export CSV
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Auto-refresh every 30 seconds
        setInterval(() => {
            this.refreshData();
        }, 30000);
    }

    async loadInitialData() {
        try {
            await this.loadGroupData();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async loadGroupData() {
        try {
            await this.loadStandings();
            await this.loadMatches();
            await this.loadPlayers();
            this.renderCurrentView();
        } catch (error) {
            console.error('Error loading group data:', error);
        }
    }

    async refreshData() {
        await this.loadGroupData();
    }

    async loadStandings() {
        try {
            const response = await fetch(`/api/standings/${this.currentGroup}`);
            this.standings = await response.json();
        } catch (error) {
            console.error('Error loading standings:', error);
        }
    }

    async loadMatches() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            this.matches = await response.json();
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }

    async loadPlayers() {
        try {
            const response = await fetch('/api/players');
            const players = await response.json();
            this.players = players.filter(p => p.group_id === this.currentGroup);
        } catch (error) {
            console.error('Error loading players:', error);
        }
    }

    switchView() {
        // Hide all views
        document.getElementById('points-table-view').style.display = 'none';
        document.getElementById('chart-view').style.display = 'none';
        document.getElementById('detailed-view').style.display = 'none';
        
        // Show selected view
        switch (this.currentView) {
            case 'table':
                document.getElementById('points-table-view').style.display = 'block';
                this.renderTableView();
                break;
            case 'chart':
                document.getElementById('chart-view').style.display = 'block';
                this.renderChartView();
                break;
            case 'detailed':
                document.getElementById('detailed-view').style.display = 'block';
                this.renderDetailedView();
                break;
        }
    }

    renderCurrentView() {
        this.switchView();
    }

    renderTableView() {
        if (this.standings.length === 0) {
            document.getElementById('standings-tbody').innerHTML = 
                '<tr><td colspan="13" class="text-center">No standings available</td></tr>';
            return;
        }

        const tbody = document.getElementById('standings-tbody');
        tbody.innerHTML = '';

        this.standings.forEach((standing, index) => {
            const row = document.createElement('tr');
            
            // Add ranking colors for top 3
            if (index < 3) {
                row.classList.add(`rank-${index + 1}`);
            }

            // Get recent form (last 5 matches)
            const form = this.getPlayerForm(standing.player.id);

            row.innerHTML = `
                <td><strong>${standing.rank}</strong></td>
                <td class="player-name">${standing.player.name}</td>
                <td>${standing.matches_played}</td>
                <td>${standing.wins}</td>
                <td>${standing.losses}</td>
                <td>${standing.sets_won}</td>
                <td>${standing.sets_lost}</td>
                <td class="${standing.set_difference >= 0 ? 'positive' : 'negative'}">
                    ${standing.set_difference > 0 ? '+' : ''}${standing.set_difference}
                </td>
                <td>${standing.points_for}</td>
                <td>${standing.points_against}</td>
                <td class="${standing.point_difference >= 0 ? 'positive' : 'negative'}">
                    ${standing.point_difference > 0 ? '+' : ''}${standing.point_difference}
                </td>
                <td><strong>${standing.ranking_points}</strong></td>
                <td class="form-indicator">${form}</td>
            `;

            tbody.appendChild(row);
        });

        // Update title
        document.querySelector('.points-table-view h3').textContent = `Points Table - Group ${this.currentGroup}`;

        // Load qualification predictions
        this.renderQualificationPredictions();
    }

    getPlayerForm(playerId) {
        // Get player's recent matches (last 5)
        const playerMatches = this.matches
            .filter(m => 
                (m.player1.id === playerId || m.player2.id === playerId) && 
                m.status === 'completed'
            )
            .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
            .slice(0, 5);

        // Convert to form string (W for win, L for loss)
        return playerMatches.map(match => {
            const isPlayer1 = match.player1.id === playerId;
            const won = (isPlayer1 && match.winner.id === playerId) || 
                       (!isPlayer1 && match.winner.id === playerId);
            return won ? 'W' : 'L';
        }).join('');
    }

    async renderQualificationPredictions() {
        try {
            const response = await fetch(`/api/qualification/${this.currentGroup}`);
            const predictions = await response.json();

            const container = document.getElementById('qualification-grid');
            container.innerHTML = '';

            predictions.forEach(pred => {
                const card = document.createElement('div');
                card.className = 'qualification-card';
                
                if (pred.probability >= 80) {
                    card.classList.add('qualified');
                } else if (pred.probability >= 40) {
                    card.classList.add('possible');
                } else {
                    card.classList.add('eliminated');
                }

                card.innerHTML = `
                    <div class="qualification-header">
                        <h5>${pred.player.name}</h5>
                        <div class="qualification-probability">${pred.probability}%</div>
                    </div>
                    <div class="qualification-details">
                        <div>Position: ${pred.current_position}</div>
                        <div>Points: ${pred.ranking_points}</div>
                        <div>Remaining: ${pred.remaining_matches}</div>
                        <div class="qualification-status">${pred.status}</div>
                    </div>
                `;

                container.appendChild(card);
            });

        } catch (error) {
            console.error('Error loading qualification predictions:', error);
        }
    }

    renderChartView() {
        document.querySelector('.chart-view h3').textContent = `Standings Charts - Group ${this.currentGroup}`;
        this.initCharts();
    }

    initCharts() {
        if (this.standings.length === 0) return;

        // Points Distribution Chart
        const pointsCtx = document.getElementById('pointsChart').getContext('2d');
        if (this.charts.points) {
            this.charts.points.destroy();
        }
        this.charts.points = new Chart(pointsCtx, {
            type: 'doughnut',
            data: {
                labels: this.standings.map(s => s.player.name),
                datasets: [{
                    data: this.standings.map(s => s.ranking_points),
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

        // Win/Loss Ratio Chart
        const winLossCtx = document.getElementById('winLossChart').getContext('2d');
        if (this.charts.winLoss) {
            this.charts.winLoss.destroy();
        }
        this.charts.winLoss = new Chart(winLossCtx, {
            type: 'bar',
            data: {
                labels: this.standings.map(s => s.player.name),
                datasets: [
                    {
                        label: 'Wins',
                        data: this.standings.map(s => s.wins),
                        backgroundColor: '#2ecc71'
                    },
                    {
                        label: 'Losses',
                        data: this.standings.map(s => s.losses),
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
                }
            }
        });

        // Set Difference Chart
        const setDiffCtx = document.getElementById('setDiffChart').getContext('2d');
        if (this.charts.setDiff) {
            this.charts.setDiff.destroy();
        }
        this.charts.setDiff = new Chart(setDiffCtx, {
            type: 'horizontalBar',
            data: {
                labels: this.standings.map(s => s.player.name),
                datasets: [{
                    label: 'Set Difference',
                    data: this.standings.map(s => s.set_difference),
                    backgroundColor: this.standings.map(s => s.set_difference >= 0 ? '#2ecc71' : '#e74c3c')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y'
            }
        });

        // Points Difference Chart
        const pointDiffCtx = document.getElementById('pointDiffChart').getContext('2d');
        if (this.charts.pointDiff) {
            this.charts.pointDiff.destroy();
        }
        this.charts.pointDiff = new Chart(pointDiffCtx, {
            type: 'line',
            data: {
                labels: this.standings.map(s => s.player.name),
                datasets: [{
                    label: 'Points Difference',
                    data: this.standings.map(s => s.point_difference),
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderDetailedView() {
        document.querySelector('.detailed-view h3').textContent = `Detailed Statistics - Group ${this.currentGroup}`;
        
        this.renderPerformanceMetrics();
        this.renderHeadToHeadRecords();
        this.renderTrendsAnalysis();
    }

    renderPerformanceMetrics() {
        const container = document.getElementById('metrics-grid');
        container.innerHTML = '';

        if (this.standings.length === 0) return;

        // Calculate metrics
        const totalMatches = this.standings.reduce((sum, s) => sum + s.matches_played, 0);
        const totalSets = this.standings.reduce((sum, s) => sum + s.sets_won + s.sets_lost, 0);
        const avgPoints = Math.round(this.standings.reduce((sum, s) => sum + s.ranking_points, 0) / this.standings.length);
        const highestPoints = Math.max(...this.standings.map(s => s.ranking_points));
        const lowestPoints = Math.min(...this.standings.map(s => s.ranking_points));

        const metrics = [
            { label: 'Total Matches', value: totalMatches, icon: '🏓' },
            { label: 'Total Sets Played', value: totalSets, icon: '📊' },
            { label: 'Average Points', value: avgPoints, icon: '📈' },
            { label: 'Highest Points', value: highestPoints, icon: '👑' },
            { label: 'Lowest Points', value: lowestPoints, icon: '📉' },
            { label: 'Competition Level', value: this.getCompetitionLevel(), icon: '⚡' }
        ];

        metrics.forEach(metric => {
            const card = document.createElement('div');
            card.className = 'metric-card';
            card.innerHTML = `
                <div class="metric-icon">${metric.icon}</div>
                <div class="metric-value">${metric.value}</div>
                <div class="metric-label">${metric.label}</div>
            `;
            container.appendChild(card);
        });
    }

    getCompetitionLevel() {
        if (this.standings.length < 2) return 'Low';
        
        const points = this.standings.map(s => s.ranking_points);
        const maxDiff = Math.max(...points) - Math.min(...points);
        
        if (maxDiff <= 2) return 'Very High';
        if (maxDiff <= 4) return 'High';
        if (maxDiff <= 6) return 'Medium';
        return 'Low';
    }

    renderHeadToHeadRecords() {
        const container = document.getElementById('h2h-container');
        container.innerHTML = '<p class="text-center">Head-to-head records will be displayed here</p>';
    }

    renderTrendsAnalysis() {
        const container = document.getElementById('trends-container');
        container.innerHTML = '';

        if (this.standings.length === 0) return;

        // Find trends
        const topPerformer = this.standings[0];
        const mostImproved = this.getMostImprovedPlayer();
        const biggestUpset = this.getBiggestUpset();
        const closestRivalry = this.getClosestRivalry();

        const trends = [
            {
                title: 'Top Performer',
                description: `${topPerformer.player.name} leads with ${topPerformer.ranking_points} points`,
                icon: '⭐'
            },
            {
                title: 'Most Dominant',
                description: `${this.getMostDominantPlayer()} has the highest set difference`,
                icon: '💪'
            },
            {
                title: 'Closest Battle',
                description: closestRivalry,
                icon: '⚔️'
            },
            {
                title: 'Tournament Pace',
                description: this.getTournamentPace(),
                icon: '🏃'
            }
        ];

        trends.forEach(trend => {
            const card = document.createElement('div');
            card.className = 'trend-card';
            card.innerHTML = `
                <div class="trend-icon">${trend.icon}</div>
                <div class="trend-content">
                    <h5>${trend.title}</h5>
                    <p>${trend.description}</p>
                </div>
            `;
            container.appendChild(card);
        });
    }

    getMostDominantPlayer() {
        if (this.standings.length === 0) return 'N/A';
        const dominant = this.standings.reduce((prev, current) => 
            prev.set_difference > current.set_difference ? prev : current
        );
        return dominant.player.name;
    }

    getMostImprovedPlayer() {
        // This would require historical data - simplified version
        return this.standings.length > 0 ? this.standings[0].player.name : 'N/A';
    }

    getBiggestUpset() {
        return 'Not enough data for analysis';
    }

    getClosestRivalry() {
        if (this.standings.length < 2) return 'Not enough players';
        
        const diff = Math.abs(this.standings[0].ranking_points - this.standings[1].ranking_points);
        return `${this.standings[0].player.name} vs ${this.standings[1].player.name} (Gap: ${diff} points)`;
    }

    getTournamentPace() {
        const completedMatches = this.matches.filter(m => m.status === 'completed').length;
        const totalMatches = this.matches.length;
        
        if (totalMatches === 0) return 'No matches played';
        
        const progress = Math.round((completedMatches / totalMatches) * 100);
        return `${progress}% of matches completed`;
    }

    exportToCSV() {
        if (this.standings.length === 0) {
            alert('No data to export');
            return;
        }

        const headers = ['Rank', 'Player', 'Matches Played', 'Wins', 'Losses', 'Sets Won', 'Sets Lost', 'Set Difference', 'Points For', 'Points Against', 'Point Difference', 'Points'];
        const csvContent = [
            headers.join(','),
            ...this.standings.map(s => [
                s.rank,
                `"${s.player.name}"`,
                s.matches_played,
                s.wins,
                s.losses,
                s.sets_won,
                s.sets_lost,
                s.set_difference,
                s.points_for,
                s.points_against,
                s.point_difference,
                s.ranking_points
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `standings-group-${this.currentGroup}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Initialize standings manager
document.addEventListener('DOMContentLoaded', () => {
    new StandingsManager();
});