// Match Entry and Result Management
class MatchManager {
    constructor() {
        this.currentMatch = null;
        this.setsPerMatch = 5;
        this.setsToWin = 3;
    }
    
    async init() {
        await this.loadAvailableMatches();
        this.renderRecentMatches();
    }
    
    async loadAvailableMatches() {
        const groupId = document.getElementById('matchGroup').value;
        const matchSelect = document.getElementById('matchSelect');
        
        if (!groupId) {
            matchSelect.innerHTML = '<option value="">Select Group First</option>';
            return;
        }
        
        try {
            // Load pending matches for the selected group
            const response = await fetch(`tables/matches?group_id=${groupId}&status=pending`);
            const data = await response.json();
            const matches = data.data || [];
            
            if (matches.length === 0) {
                matchSelect.innerHTML = '<option value="">No pending matches</option>';
                return;
            }
            
            // Load players to get names
            await window.tournamentManager.loadPlayers();
            const players = window.tournamentManager.players;
            
            matchSelect.innerHTML = '<option value="">Select Match</option>' + 
                matches.map(match => {
                    const player1 = players.find(p => p.id === match.player1_id);
                    const player2 = players.find(p => p.id === match.player2_id);
                    return `<option value="${match.id}">${player1?.name || 'Unknown'} vs ${player2?.name || 'Unknown'}</option>`;
                }).join('');
            
        } catch (error) {
            console.error('Error loading matches:', error);
            window.tournamentManager.showToast('Error loading matches', 'error');
        }
    }
    
    async loadMatchDetails() {
        const matchId = document.getElementById('matchSelect').value;
        const formContainer = document.getElementById('matchEntryForm');
        
        if (!matchId) {
            formContainer.style.display = 'none';
            return;
        }
        
        try {
            // Load match details
            const response = await fetch(`tables/matches/${matchId}`);
            const match = await response.json();
            
            await window.tournamentManager.loadPlayers();
            const players = window.tournamentManager.players;
            
            const player1 = players.find(p => p.id === match.player1_id);
            const player2 = players.find(p => p.id === match.player2_id);
            
            this.currentMatch = {
                ...match,
                player1_name: player1?.name || 'Unknown',
                player2_name: player2?.name || 'Unknown'
            };
            
            // Update form
            document.getElementById('player1Name').textContent = this.currentMatch.player1_name;
            document.getElementById('player2Name').textContent = this.currentMatch.player2_name;
            
            // Generate set inputs
            this.generateSetInputs();
            
            formContainer.style.display = 'block';
            
        } catch (error) {
            console.error('Error loading match details:', error);
            window.tournamentManager.showToast('Error loading match details', 'error');
        }
    }
    
    generateSetInputs() {
        const player1Container = document.getElementById('player1Sets');
        const player2Container = document.getElementById('player2Sets');
        
        player1Container.innerHTML = '';
        player2Container.innerHTML = '';
        
        for (let i = 1; i <= this.setsPerMatch; i++) {
            player1Container.innerHTML += `
                <div class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-300">
                    <span class="text-sm font-medium text-gray-700">Set ${i}</span>
                    <input type="number" 
                           id="p1_set${i}" 
                           min="0" 
                           max="21" 
                           class="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           onchange="window.matchManager.validateSetScore(${i})">
                </div>
            `;
            
            player2Container.innerHTML += `
                <div class="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-300">
                    <span class="text-sm font-medium text-gray-700">Set ${i}</span>
                    <input type="number" 
                           id="p2_set${i}" 
                           min="0" 
                           max="21" 
                           class="w-20 px-3 py-2 border border-gray-300 rounded-md text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           onchange="window.matchManager.validateSetScore(${i})">
                </div>
            `;
        }
    }
    
    validateSetScore(setNumber) {
        const p1Score = parseInt(document.getElementById(`p1_set${setNumber}`).value) || 0;
        const p2Score = parseInt(document.getElementById(`p2_set${setNumber}`).value) || 0;
        
        // Basic validation - both scores can't be 0
        if (p1Score === 0 && p2Score === 0) {
            return;
        }
        
        // Check for valid set scores
        const maxScore = Math.max(p1Score, p2Score);
        const minScore = Math.min(p1Score, p2Score);
        
        // Set must be won by 2 points (except 21-20)
        if (maxScore === 21 && minScore <= 19) {
            // Valid set
            document.getElementById(`p1_set${setNumber}`).classList.remove('border-red-500');
            document.getElementById(`p2_set${setNumber}`).classList.remove('border-red-500');
        } else if (maxScore > 21 && maxScore - minScore === 2) {
            // Valid extended set (e.g., 22-20, 23-21, etc.)
            document.getElementById(`p1_set${setNumber}`).classList.remove('border-red-500');
            document.getElementById(`p2_set${setNumber}`).classList.remove('border-red-500');
        } else {
            // Invalid set
            document.getElementById(`p1_set${setNumber}`).classList.add('border-red-500');
            document.getElementById(`p2_set${setNumber}`).classList.add('border-red-500');
        }
    }
    
    async submitMatchResult() {
        if (!this.currentMatch) {
            window.tournamentManager.showToast('No match selected', 'error');
            return;
        }
        
        const scores = [];
        let player1Sets = 0;
        let player2Sets = 0;
        
        // Collect and validate scores
        for (let i = 1; i <= this.setsPerMatch; i++) {
            const p1Score = parseInt(document.getElementById(`p1_set${i}`).value) || 0;
            const p2Score = parseInt(document.getElementById(`p2_set${i}`).value) || 0;
            
            if (p1Score === 0 && p2Score === 0) {
                continue; // Skip empty sets
            }
            
            scores.push({
                set_number: i,
                player1_score: p1Score,
                player2_score: p2Score
            });
            
            if (p1Score > p2Score) {
                player1Sets++;
            } else {
                player2Sets++;
            }
            
            // Stop if someone has won enough sets
            if (player1Sets >= this.setsToWin || player2Sets >= this.setsToWin) {
                break;
            }
        }
        
        if (scores.length === 0) {
            window.tournamentManager.showToast('Please enter at least one set score', 'error');
            return;
        }
        
        if (player1Sets < this.setsToWin && player2Sets < this.setsToWin) {
            window.tournamentManager.showToast('Match must be completed', 'error');
            return;
        }
        
        try {
            window.tournamentManager.showLoading(true);
            
            const winnerId = player1Sets >= this.setsToWin ? this.currentMatch.player1_id : this.currentMatch.player2_id;
            
            // Update match
            const matchData = {
                ...this.currentMatch,
                status: 'completed',
                winner_id: winnerId,
                updated_at: new Date().toISOString()
            };
            
            await fetch(`tables/matches/${this.currentMatch.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(matchData)
            });
            
            // Save scores
            for (const score of scores) {
                const scoreData = {
                    match_id: this.currentMatch.id,
                    set_number: score.set_number,
                    player1_score: score.player1_score,
                    player2_score: score.player2_score,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await fetch('tables/match_scores', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(scoreData)
                });
            }
            
            // Update standings
            await this.updateStandings();
            
            window.tournamentManager.showToast('Match result submitted successfully', 'success');
            this.clearMatchForm();
            await this.loadAvailableMatches();
            this.renderRecentMatches();
            
            // Update other tabs
            if (window.standingsManager) {
                await window.standingsManager.init();
            }
            
        } catch (error) {
            console.error('Error submitting match result:', error);
            window.tournamentManager.showToast('Error submitting match result', 'error');
        } finally {
            window.tournamentManager.showLoading(false);
        }
    }
    
    async updateStandings() {
        if (!window.standingsManager) return;
        
        try {
            await window.standingsManager.recalculateStandings();
        } catch (error) {
            console.error('Error updating standings:', error);
        }
    }
    
    clearMatchForm() {
        document.getElementById('matchSelect').value = '';
        document.getElementById('matchEntryForm').style.display = 'none';
        this.currentMatch = null;
        
        // Clear set inputs
        for (let i = 1; i <= this.setsPerMatch; i++) {
            document.getElementById(`p1_set${i}`).value = '';
            document.getElementById(`p2_set${i}`).value = '';
            document.getElementById(`p1_set${i}`).classList.remove('border-red-500');
            document.getElementById(`p2_set${i}`).classList.remove('border-red-500');
        }
    }
    
    renderRecentMatches() {
        const container = document.getElementById('recentMatches');
        const matches = window.tournamentManager.matches;
        const players = window.tournamentManager.players;
        
        const recentMatches = matches
            .filter(m => m.status === 'completed')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
            .slice(0, 5);
        
        if (recentMatches.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-8">No recent matches</div>';
            return;
        }
        
        container.innerHTML = recentMatches.map(match => {
            const player1 = players.find(p => p.id === match.player1_id);
            const player2 = players.find(p => p.id === match.player2_id);
            const winner = players.find(p => p.id === match.winner_id);
            
            const player1Name = player1?.name || 'Unknown';
            const player2Name = player2?.name || 'Unknown';
            const winnerName = winner?.name || 'Unknown';
            
            return `
                <div class="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-300">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-medium text-gray-600">Group ${match.group_id} • Round ${match.round_number}</span>
                        <span class="text-xs text-gray-500">${new Date(match.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="space-y-1">
                            <div class="flex items-center">
                                <span class="font-medium text-gray-800">${player1Name}</span>
                                ${match.winner_id === match.player1_id ? '<i class="fas fa-crown text-yellow-500 ml-2"></i>' : ''}
                            </div>
                            <div class="flex items-center">
                                <span class="font-medium text-gray-800">${player2Name}</span>
                                ${match.winner_id === match.player2_id ? '<i class="fas fa-crown text-yellow-500 ml-2"></i>' : ''}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-semibold text-green-600">Winner</div>
                            <div class="text-sm text-gray-700">${winnerName}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize match manager
window.matchManager = new MatchManager();

// Extend the main tournament manager
if (window.tournamentManager) {
    window.tournamentManager.loadMatchEntry = () => window.matchManager.init();
}