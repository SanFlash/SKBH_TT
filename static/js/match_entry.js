// Match Entry JavaScript
class MatchEntry {
    constructor() {
        this.socket = null;
        this.currentGroup = 'A';
        this.currentMatch = null;
        this.players = [];
        this.matches = [];
        this.currentSet = 1;
        this.maxSets = 5;
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
            this.loadRecentResults();
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
            this.loadMatches();
        });

        // Match selection
        document.getElementById('match-select').addEventListener('change', (e) => {
            const matchId = e.target.value;
            if (matchId) {
                this.selectMatch(parseInt(matchId));
            } else {
                this.hideMatchDetails();
            }
        });

        // Add set
        document.getElementById('add-set').addEventListener('click', () => {
            this.addSetEntry();
        });

        // Remove set
        document.getElementById('remove-set').addEventListener('click', () => {
            this.removeSetEntry();
        });

        // Submit result
        document.getElementById('submit-result').addEventListener('click', () => {
            this.submitResult();
        });

        // Cancel entry
        document.getElementById('cancel-entry').addEventListener('click', () => {
            this.cancelEntry();
        });

        // Auto-update preview
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('score-input')) {
                this.updatePreview();
            }
        });
    }

    async loadInitialData() {
        try {
            await this.loadPlayers();
            await this.loadMatches();
            await this.loadRecentResults();
        } catch (error) {
            console.error('Error loading initial data:', error);
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

    async loadMatches() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await response.json();
            
            // Only show pending matches
            this.matches = matches.filter(m => m.status === 'pending');
            this.populateMatchSelect();
            
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    }

    populateMatchSelect() {
        const select = document.getElementById('match-select');
        select.innerHTML = '<option value="">-- Choose a match --</option>';
        
        this.matches.forEach(match => {
            const option = document.createElement('option');
            option.value = match.id;
            option.textContent = `${match.player1.name} vs ${match.player2.name} (Round ${match.round_number})`;
            select.appendChild(option);
        });
    }

    selectMatch(matchId) {
        this.currentMatch = this.matches.find(m => m.id === matchId);
        
        if (!this.currentMatch) {
            console.error('Match not found');
            return;
        }
        
        this.showMatchDetails();
        this.initializeScoreEntry();
    }

    showMatchDetails() {
        const match = this.currentMatch;
        
        // Update player names
        document.getElementById('player1-name').textContent = match.player1.name;
        document.getElementById('player2-name').textContent = match.player2.name;
        
        // Update match info
        document.getElementById('match-round').textContent = `Round ${match.round_number}`;
        document.getElementById('match-group').textContent = `Group ${match.group_id}`;
        
        // Load player stats
        this.loadPlayerStats(match.player1.id, 'player1-stats');
        this.loadPlayerStats(match.player2.id, 'player2-stats');
        
        document.getElementById('match-details').style.display = 'block';
        document.getElementById('score-entry').style.display = 'block';
    }

    hideMatchDetails() {
        document.getElementById('match-details').style.display = 'none';
        document.getElementById('score-entry').style.display = 'none';
        this.currentMatch = null;
    }

    async loadPlayerStats(playerId, elementId) {
        try {
            const response = await fetch(`/api/standings/${this.currentGroup}`);
            const standings = await response.json();
            
            const standing = standings.find(s => s.player.id === playerId);
            const statsElement = document.getElementById(elementId);
            
            if (standing) {
                statsElement.textContent = `${standing.wins} wins, ${standing.losses} losses`;
            } else {
                statsElement.textContent = '0 wins, 0 losses';
            }
            
        } catch (error) {
            console.error('Error loading player stats:', error);
            document.getElementById(elementId).textContent = 'Stats unavailable';
        }
    }

    initializeScoreEntry() {
        this.currentSet = 1;
        const container = document.getElementById('sets-container');
        container.innerHTML = '';
        
        // Add first 3 sets by default (best of 5)
        for (let i = 1; i <= 3; i++) {
            this.addSetEntry(i);
        }
        
        this.updatePreview();
    }

    addSetEntry(setNumber = null) {
        if (!setNumber) {
            setNumber = this.currentSet + 1;
        }
        
        if (setNumber > this.maxSets) {
            alert('Maximum number of sets reached');
            return;
        }
        
        const container = document.getElementById('sets-container');
        const setEntry = document.createElement('div');
        setEntry.className = 'set-entry';
        setEntry.dataset.setNumber = setNumber;
        
        setEntry.innerHTML = `
            <h4>Set ${setNumber}</h4>
            <div class="score-input-group">
                <div class="player-score">
                    <label>${this.currentMatch.player1.name}</label>
                    <input type="number" 
                           class="score-input player1-score" 
                           min="0" 
                           max="99" 
                           placeholder="0"
                           data-set="${setNumber}"
                           data-player="1">
                </div>
                <div class="score-separator">-</div>
                <div class="player-score">
                    <label>${this.currentMatch.player2.name}</label>
                    <input type="number" 
                           class="score-input player2-score" 
                           min="0" 
                           max="99" 
                           placeholder="0"
                           data-set="${setNumber}"
                           data-player="2">
                </div>
            </div>
        `;
        
        container.appendChild(setEntry);
        this.currentSet = setNumber;
        
        // Show remove button if more than 1 set
        document.getElementById('remove-set').style.display = 
            container.children.length > 1 ? 'block' : 'none';
    }

    removeSetEntry() {
        const container = document.getElementById('sets-container');
        if (container.children.length > 1) {
            container.removeChild(container.lastChild);
            this.currentSet--;
            
            // Hide remove button if only 1 set left
            document.getElementById('remove-set').style.display = 
                container.children.length > 1 ? 'block' : 'none';
            
            this.updatePreview();
        }
    }

    updatePreview() {
        const sets = this.getSetScores();
        const previewContent = document.getElementById('preview-content');
        
        if (sets.length === 0) {
            previewContent.innerHTML = '<p>Enter scores to see match preview</p>';
            return;
        }
        
        let player1Sets = 0;
        let player2Sets = 0;
        let previewHTML = '<div class="preview-sets">';
        
        sets.forEach((set, index) => {
            const p1Score = parseInt(set.player1) || 0;
            const p2Score = parseInt(set.player2) || 0;
            
            if (p1Score > p2Score) {
                player1Sets++;
            } else if (p2Score > p1Score) {
                player2Sets++;
            }
            
            previewHTML += `
                <div class="preview-set">
                    <strong>Set ${index + 1}:</strong> 
                    ${this.currentMatch.player1.name} ${p1Score} - ${p2Score} ${this.currentMatch.player2.name}
                    <span class="set-winner">${p1Score > p2Score ? this.currentMatch.player1.name : this.currentMatch.player2.name}</span>
                </div>
            `;
        });
        
        previewHTML += '</div>';
        previewHTML += `
            <div class="preview-summary">
                <strong>Current Score:</strong> 
                ${this.currentMatch.player1.name} ${player1Sets} - ${player2Sets} ${this.currentMatch.player2.name}
            </div>
        `;
        
        // Check if match is complete
        if (player1Sets >= 3 || player2Sets >= 3) {
            const winner = player1Sets >= 3 ? this.currentMatch.player1.name : this.currentMatch.player2.name;
            previewHTML += `
                <div class="match-complete">
                    <strong>Match Complete!</strong><br>
                    Winner: ${winner}
                </div>
            `;
        }
        
        previewContent.innerHTML = previewHTML;
    }

    getSetScores() {
        const sets = [];
        const setEntries = document.querySelectorAll('.set-entry');
        
        setEntries.forEach(entry => {
            const p1Score = entry.querySelector('.player1-score').value;
            const p2Score = entry.querySelector('.player2-score').value;
            
            if (p1Score !== '' && p2Score !== '') {
                sets.push({
                    player1: p1Score,
                    player2: p2Score
                });
            }
        });
        
        return sets;
    }

    async submitResult() {
        const sets = this.getSetScores();
        
        if (sets.length === 0) {
            alert('Please enter at least one set score');
            return;
        }
        
        // Validate scores
        for (let i = 0; i < sets.length; i++) {
            const set = sets[i];
            const p1Score = parseInt(set.player1);
            const p2Score = parseInt(set.player2);
            
            if (isNaN(p1Score) || isNaN(p2Score)) {
                alert(`Please enter valid scores for Set ${i + 1}`);
                return;
            }
            
            if (p1Score === p2Score) {
                alert(`Set ${i + 1} cannot end in a tie`);
                return;
            }
        }
        
        // Check if match is complete (someone won 3 sets)
        let player1Sets = 0;
        let player2Sets = 0;
        
        sets.forEach(set => {
            const p1Score = parseInt(set.player1);
            const p2Score = parseInt(set.player2);
            
            if (p1Score > p2Score) {
                player1Sets++;
            } else {
                player2Sets++;
            }
        });
        
        if (player1Sets < 3 && player2Sets < 3) {
            if (!confirm('Match is not complete yet. Submit anyway?')) {
                return;
            }
        }
        
        try {
            const response = await fetch('/api/submit-result', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    match_id: this.currentMatch.id,
                    scores: sets.map((set, index) => ({
                        set_number: index + 1,
                        player1_score: parseInt(set.player1),
                        player2_score: parseInt(set.player2)
                    }))
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('Result submitted successfully!');
                this.resetForm();
                this.loadMatches(); // Reload to get new pending matches
                this.loadRecentResults();
            } else {
                alert('Error submitting result: ' + result.error);
            }
            
        } catch (error) {
            console.error('Error submitting result:', error);
            alert('Error submitting result');
        }
    }

    cancelEntry() {
        if (confirm('Are you sure you want to cancel? All entered scores will be lost.')) {
            this.resetForm();
        }
    }

    resetForm() {
        this.currentMatch = null;
        document.getElementById('match-select').value = '';
        this.hideMatchDetails();
        document.getElementById('sets-container').innerHTML = '';
    }

    async loadRecentResults() {
        try {
            const response = await fetch(`/api/matches/${this.currentGroup}`);
            const matches = await response.json();
            
            const completedMatches = matches
                .filter(m => m.status === 'completed')
                .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
                .slice(0, 10);
            
            const container = document.getElementById('recent-results');
            container.innerHTML = '';
            
            if (completedMatches.length === 0) {
                container.innerHTML = '<p class="text-center">No completed matches yet</p>';
                return;
            }
            
            completedMatches.forEach(match => {
                const resultCard = this.createResultCard(match);
                container.appendChild(resultCard);
            });
            
        } catch (error) {
            console.error('Error loading recent results:', error);
        }
    }

    createResultCard(match) {
        const card = document.createElement('div');
        card.className = 'result-card';
        
        const winner = match.winner;
        const isPlayer1Winner = winner && winner.id === match.player1.id;
        
        card.innerHTML = `
            <div class="result-header">
                <span class="result-round">Round ${match.round_number}</span>
                <span class="result-time">${new Date(match.completed_at).toLocaleString()}</span>
            </div>
            <div class="result-players">
                <span class="player-name ${isPlayer1Winner ? 'winner' : 'loser'}">${match.player1.name}</span>
                <span class="vs-text">VS</span>
                <span class="player-name ${!isPlayer1Winner ? 'winner' : 'loser'}">${match.player2.name}</span>
            </div>
            <div class="result-summary">
                Winner: <strong>${winner.name}</strong>
            </div>
        `;
        
        return card;
    }
}

// Initialize match entry
document.addEventListener('DOMContentLoaded', () => {
    new MatchEntry();
});