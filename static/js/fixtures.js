// Fixtures Management JavaScript
class FixturesManager {
    constructor() {
        this.socket = null;
        this.currentGroup = 'A';
        this.currentFilter = 'all';
        this.currentRound = 'all';
        this.players = [];
        this.matches = [];
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

        // Generate fixtures
        document.getElementById('generate-fixtures').addEventListener('click', () => {
            this.generateFixtures();
        });

        // Add player
        document.getElementById('add-player').addEventListener('click', () => {
            this.showPlayerModal();
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderFixtures();
            });
        });

        // Round filter
        document.getElementById('round-filter').addEventListener('change', (e) => {
            this.currentRound = e.target.value;
            this.renderFixtures();
        });

        // Modal events
        this.bindModalEvents();

        // Player form
        document.getElementById('player-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addPlayer();
        });
    }

    bindModalEvents() {
        const modal = document.getElementById('player-modal');
        
        document.querySelector('.modal-close').addEventListener('click', () => {
            this.hidePlayerModal();
        });

        document.querySelector('.modal-cancel').addEventListener('click', () => {
            this.hidePlayerModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hidePlayerModal();
            }
        });
    }

    async loadInitialData() {
        try {
            await this.loadPlayers();
            await this.loadMatches();
            this.updateRoundFilter();
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    async refreshData() {
        await this.loadPlayers();
        await this.loadMatches();
        this.updateRoundFilter();
    }

    async loadPlayers() {
        try {
            const response = await fetch('/api/players');
            const players = await response.json();
            
            this.players = players.filter(p => p.group_id === this.currentGroup);
            this.renderPlayers();
            
        } catch (error) {
            console.error('Error loading players:', error);
        }
    }

    async loadMatches() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await response.json();
            
            this.matches = matches;
            this.renderFixtures();
            
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }

    renderPlayers() {
        const container = document.getElementById('players-grid');
        container.innerHTML = '';
        
        if (this.players.length === 0) {
            container.innerHTML = '<p class="text-center">No players in this group yet</p>';
            return;
        }
        
        this.players.forEach(player => {
            const card = document.createElement('div');
            card.className = 'player-card';
            card.innerHTML = `
                <div class="player-info">
                    <h4>${player.name}</h4>
                    <p>Group ${player.group_id}</p>
                </div>
                <button class="btn btn-danger btn-sm" onclick="fixturesManager.removePlayer(${player.id})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(card);
        });
    }

    renderFixtures() {
        const container = document.getElementById('fixtures-container');
        container.innerHTML = '';
        
        let filteredMatches = this.matches;
        
        // Apply status filter
        if (this.currentFilter !== 'all') {
            filteredMatches = filteredMatches.filter(m => m.status === this.currentFilter);
        }
        
        // Apply round filter
        if (this.currentRound !== 'all') {
            filteredMatches = filteredMatches.filter(m => m.round_number === parseInt(this.currentRound));
        }
        
        if (filteredMatches.length === 0) {
            container.innerHTML = '<p class="text-center">No matches found</p>';
            return;
        }
        
        // Group matches by round
        const groupedByRound = {};
        filteredMatches.forEach(match => {
            if (!groupedByRound[match.round_number]) {
                groupedByRound[match.round_number] = [];
            }
            groupedByRound[match.round_number].push(match);
        });
        
        // Sort rounds
        const sortedRounds = Object.keys(groupedByRound).sort((a, b) => a - b);
        
        sortedRounds.forEach(round => {
            const roundSection = document.createElement('div');
            roundSection.className = 'round-section';
            
            const roundTitle = document.createElement('h4');
            roundTitle.className = 'round-title';
            roundTitle.textContent = `Round ${round}`;
            roundSection.appendChild(roundTitle);
            
            const matchesGrid = document.createElement('div');
            matchesGrid.className = 'matches-grid';
            
            groupedByRound[round].forEach(match => {
                const matchCard = this.createMatchCard(match);
                matchesGrid.appendChild(matchCard);
            });
            
            roundSection.appendChild(matchesGrid);
            container.appendChild(roundSection);
        });
    }

    createMatchCard(match) {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        const isCompleted = match.status === 'completed';
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
            <div class="match-actions">
                ${!isCompleted ? 
                    `<button class="btn btn-primary btn-sm" onclick="fixturesManager.enterResult(${match.id})">
                        Enter Result
                    </button>`
                    : `<div class="match-result">Winner: ${winner.name}</div>`
                }
            </div>
        `;
        
        return card;
    }

    updateRoundFilter() {
        const roundFilter = document.getElementById('round-filter');
        const currentValue = roundFilter.value;
        
        // Get unique rounds
        const rounds = [...new Set(this.matches.map(m => m.round_number))].sort((a, b) => a - b);
        
        // Clear existing options except "All Rounds"
        roundFilter.innerHTML = '<option value="all">All Rounds</option>';
        
        rounds.forEach(round => {
            const option = document.createElement('option');
            option.value = round;
            option.textContent = `Round ${round}`;
            roundFilter.appendChild(option);
        });
        
        // Restore previous selection if it still exists
        if ([...roundFilter.options].some(option => option.value === currentValue)) {
            roundFilter.value = currentValue;
        }
    }

    async generateFixtures() {
        try {
            if (this.players.length < 2) {
                alert('Need at least 2 players to generate fixtures');
                return;
            }
            
            const response = await fetch('/api/generate-fixtures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ group_id: this.currentGroup })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message);
                this.loadMatches();
            } else {
                alert('Error: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error generating fixtures:', error);
            alert('Error generating fixtures');
        }
    }

    showPlayerModal() {
        document.getElementById('player-modal').style.display = 'flex';
        document.getElementById('player-name').focus();
    }

    hidePlayerModal() {
        document.getElementById('player-modal').style.display = 'none';
        document.getElementById('player-form').reset();
    }

    async addPlayer() {
        try {
            const name = document.getElementById('player-name').value.trim();
            const groupId = document.getElementById('player-group').value;
            
            if (!name) {
                alert('Please enter a player name');
                return;
            }
            
            const response = await fetch('/api/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: name,
                    group_id: groupId
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.hidePlayerModal();
                this.loadPlayers();
                
                // If adding to current group, refresh matches too
                if (groupId === this.currentGroup) {
                    this.loadMatches();
                }
            } else {
                alert('Error adding player');
            }
            
        } catch (error) {
            console.error('Error adding player:', error);
            alert('Error adding player');
        }
    }

    async removePlayer(playerId) {
        if (!confirm('Are you sure you want to remove this player? This will also remove all associated matches.')) {
            return;
        }
        
        try {
            // For now, we'll just remove from the UI
            // In a real app, you'd implement a DELETE endpoint
            this.players = this.players.filter(p => p.id !== playerId);
            this.renderPlayers();
            
            // Remove associated matches
            this.matches = this.matches.filter(m => 
                m.player1.id !== playerId && m.player2.id !== playerId
            );
            this.renderFixtures();
            
        } catch (error) {
            console.error('Error removing player:', error);
            alert('Error removing player');
        }
    }

    enterResult(matchId) {
        // Navigate to match entry page with the match ID
        window.location.href = `/match-entry?match=${matchId}`;
    }
}

// Initialize fixtures manager
document.addEventListener('DOMContentLoaded', () => {
    window.fixturesManager = new FixturesManager();
});