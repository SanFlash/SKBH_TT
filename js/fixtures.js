// Fixtures Management Module
class FixturesManager {
    constructor() {
        this.tournamentLogic = new TournamentLogic();
        this.currentGroup = 'ALL';
    }
    
    async init() {
        await this.loadPlayers();
        await this.loadFixtures();
        this.renderPlayersList();
        this.renderFixtures();
    }
    
    async loadPlayers() {
        try {
            const response = await fetch('tables/players');
            const data = await response.json();
            window.tournamentManager.players = data.data || [];
            return window.tournamentManager.players;
        } catch (error) {
            console.error('Error loading players:', error);
            window.tournamentManager.showToast('Error loading players', 'error');
            return [];
        }
    }
    
    async loadFixtures() {
        try {
            const response = await fetch('tables/matches');
            const data = await response.json();
            window.tournamentManager.matches = data.data || [];
            return window.tournamentManager.matches;
        } catch (error) {
            console.error('Error loading fixtures:', error);
            window.tournamentManager.showToast('Error loading fixtures', 'error');
            return [];
        }
    }
    
    async addPlayer() {
        const name = document.getElementById('newPlayerName').value.trim();
        const groupId = document.getElementById('newPlayerGroup').value;
        
        if (!name) {
            window.tournamentManager.showToast('Please enter player name', 'error');
            return;
        }
        
        try {
            window.tournamentManager.showLoading(true);
            
            const playerData = {
                name: name,
                group_id: groupId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const response = await fetch('tables/players', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(playerData)
            });
            
            if (response.ok) {
                const newPlayer = await response.json();
                window.tournamentManager.players.push(newPlayer);
                
                // Create initial standing
                await this.createInitialStanding(newPlayer.id, groupId);
                
                document.getElementById('newPlayerName').value = '';
                window.tournamentManager.showToast('Player added successfully', 'success');
                
                this.renderPlayersList();
                await this.updateDashboard();
            } else {
                throw new Error('Failed to add player');
            }
        } catch (error) {
            console.error('Error adding player:', error);
            window.tournamentManager.showToast('Error adding player', 'error');
        } finally {
            window.tournamentManager.showLoading(false);
        }
    }
    
    async createInitialStanding(playerId, groupId) {
        try {
            const standingData = {
                player_id: playerId,
                group_id: groupId,
                matches_played: 0,
                wins: 0,
                losses: 0,
                sets_won: 0,
                sets_lost: 0,
                points_for: 0,
                points_against: 0,
                ranking_points: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            await fetch('tables/standings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(standingData)
            });
        } catch (error) {
            console.error('Error creating initial standing:', error);
        }
    }
    
    async generateFixtures() {
        try {
            window.tournamentManager.showLoading(true);
            
            // Group players by group
            const playersByGroup = {};
            window.tournamentManager.players.forEach(player => {
                if (!playersByGroup[player.group_id]) {
                    playersByGroup[player.group_id] = [];
                }
                playersByGroup[player.group_id].push(player);
            });
            
            // Generate fixtures for each group
            const allFixtures = [];
            Object.keys(playersByGroup).forEach(groupId => {
                const groupFixtures = this.tournamentLogic.generateRoundRobinFixtures(
                    playersByGroup[groupId], 
                    groupId
                );
                allFixtures.push(...groupFixtures);
            });
            
            // Save fixtures to database
            for (const fixture of allFixtures) {
                const fixtureData = {
                    player1_id: fixture.player1_id,
                    player2_id: fixture.player2_id,
                    group_id: fixture.group_id,
                    stage: fixture.stage,
                    round_number: fixture.round_number,
                    status: fixture.status,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await fetch('tables/matches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fixtureData)
                });
            }
            
            window.tournamentManager.showToast('Fixtures generated successfully', 'success');
            await this.loadFixtures();
            this.renderFixtures();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error generating fixtures:', error);
            window.tournamentManager.showToast('Error generating fixtures', 'error');
        } finally {
            window.tournamentManager.showLoading(false);
        }
    }
    
    renderPlayersList() {
        const container = document.getElementById('playersList');
        const players = window.tournamentManager.players;
        
        if (players.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-8 col-span-full">No players added yet</div>';
            return;
        }
        
        // Group players by group
        const playersByGroup = {};
        players.forEach(player => {
            if (!playersByGroup[player.group_id]) {
                playersByGroup[player.group_id] = [];
            }
            playersByGroup[player.group_id].push(player);
        });
        
        container.innerHTML = Object.keys(playersByGroup).map(groupId => {
            const groupPlayers = playersByGroup[groupId];
            const groupColor = this.getGroupColor(groupId);
            
            return `
                <div class="bg-white rounded-xl shadow-lg p-4 border-l-4 ${groupColor}">
                    <h4 class="text-lg font-semibold text-gray-800 mb-3">Group ${groupId}</h4>
                    <div class="space-y-2">
                        ${groupPlayers.map(player => `
                            <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-300">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                        <i class="fas fa-user text-gray-600 text-sm"></i>
                                    </div>
                                    <span class="font-medium text-gray-800">${player.name}</span>
                                </div>
                                <button onclick="window.fixturesManager.deletePlayer('${player.id}')" class="text-red-500 hover:text-red-700 transition-colors duration-300">
                                    <i class="fas fa-trash text-sm"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderFixtures() {
        const container = document.getElementById('fixturesContainer');
        let matches = window.tournamentManager.matches;
        
        // Filter by group if not ALL
        if (this.currentGroup !== 'ALL') {
            matches = matches.filter(match => match.group_id === this.currentGroup);
        }
        
        if (matches.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-calendar-plus text-gray-300 text-6xl mb-4"></i>
                    <p class="text-gray-500">No fixtures available</p>
                    <p class="text-sm text-gray-400 mt-2">Click "Generate Fixtures" to create tournament schedule</p>
                </div>
            `;
            return;
        }
        
        // Group matches by group and round
        const matchesByGroup = {};
        matches.forEach(match => {
            if (!matchesByGroup[match.group_id]) {
                matchesByGroup[match.group_id] = {};
            }
            if (!matchesByGroup[match.group_id][match.round_number]) {
                matchesByGroup[match.group_id][match.round_number] = [];
            }
            matchesByGroup[match.group_id][match.round_number].push(match);
        });
        
        container.innerHTML = Object.keys(matchesByGroup).sort().map(groupId => {
            const groupColor = this.getGroupColor(groupId);
            const rounds = matchesByGroup[groupId];
            
            return `
                <div class="bg-white rounded-xl shadow-lg p-6 mb-6 border-l-4 ${groupColor}">
                    <h4 class="text-xl font-semibold text-gray-800 mb-4">Group ${groupId}</h4>
                    ${Object.keys(rounds).sort((a, b) => a - b).map(round => `
                        <div class="mb-6">
                            <h5 class="text-lg font-medium text-gray-700 mb-3">Round ${round}</h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                ${rounds[round].map(match => this.renderMatchCard(match)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }
    
    renderMatchCard(match) {
        const player1 = window.tournamentManager.players.find(p => p.id === match.player1_id);
        const player2 = window.tournamentManager.players.find(p => p.id === match.player2_id);
        
        const player1Name = player1?.name || 'Unknown';
        const player2Name = player2?.name || 'Unknown';
        
        const statusColor = match.status === 'completed' ? 'text-green-600' : 'text-yellow-600';
        const statusIcon = match.status === 'completed' ? 'fa-check-circle' : 'fa-clock';
        
        return `
            <div class="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow duration-300">
                <div class="flex justify-between items-center mb-3">
                    <span class="text-sm font-medium text-gray-500">Match ${match.round_number}</span>
                    <span class="text-xs ${statusColor}">
                        <i class="fas ${statusIcon} mr-1"></i>${match.status}
                    </span>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-800">${player1Name}</span>
                        ${match.status === 'completed' && match.winner_id === match.player1_id ? 
                            '<i class="fas fa-crown text-yellow-500"></i>' : ''}
                    </div>
                    <div class="text-center text-gray-500">vs</div>
                    <div class="flex justify-between items-center">
                        <span class="font-medium text-gray-800">${player2Name}</span>
                        ${match.status === 'completed' && match.winner_id === match.player2_id ? 
                            '<i class="fas fa-crown text-yellow-500"></i>' : ''}
                    </div>
                </div>
                ${match.status === 'completed' ? 
                    `<div class="mt-3 pt-3 border-t border-gray-200 text-center">
                        <span class="text-sm font-semibold text-green-600">Winner: ${match.winner_id === match.player1_id ? player1Name : player2Name}</span>
                    </div>` : ''}
            </div>
        `;
    }
    
    filterGroup(group) {
        this.currentGroup = group;
        
        // Update filter buttons
        document.querySelectorAll('.group-filter').forEach(btn => {
            if (btn.dataset.group === group) {
                btn.className = 'group-filter px-4 py-2 rounded-lg bg-blue-500 text-white transition-colors duration-300';
            } else {
                btn.className = 'group-filter px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-blue-500 hover:text-white transition-colors duration-300';
            }
        });
        
        this.renderFixtures();
    }
    
    getGroupColor(groupId) {
        const colors = {
            'A': 'border-blue-500',
            'B': 'border-green-500',
            'C': 'border-yellow-500',
            'D': 'border-red-500'
        };
        return colors[groupId] || 'border-gray-500';
    }
    
    async deletePlayer(playerId) {
        if (!confirm('Are you sure you want to delete this player? This will also delete their matches and standings.')) {
            return;
        }
        
        try {
            window.tournamentManager.showLoading(true);
            
            // Delete player
            await fetch(`tables/players/${playerId}`, {
                method: 'DELETE'
            });
            
            // Delete related matches
            const playerMatches = window.tournamentManager.matches.filter(m => 
                m.player1_id === playerId || m.player2_id === playerId
            );
            
            for (const match of playerMatches) {
                await fetch(`tables/matches/${match.id}`, {
                    method: 'DELETE'
                });
            }
            
            // Delete standing
            const playerStanding = window.tournamentManager.standings.find(s => s.player_id === playerId);
            if (playerStanding) {
                await fetch(`tables/standings/${playerStanding.id}`, {
                    method: 'DELETE'
                });
            }
            
            window.tournamentManager.showToast('Player deleted successfully', 'success');
            await this.loadPlayers();
            await this.loadFixtures();
            this.renderPlayersList();
            this.renderFixtures();
            await this.updateDashboard();
            
        } catch (error) {
            console.error('Error deleting player:', error);
            window.tournamentManager.showToast('Error deleting player', 'error');
        } finally {
            window.tournamentManager.showLoading(false);
        }
    }
    
    async updateDashboard() {
        if (window.tournamentManager) {
            await window.tournamentManager.updateDashboard();
        }
    }
}

// Initialize fixtures manager
window.fixturesManager = new FixturesManager();

// Extend the main tournament manager
if (window.tournamentManager) {
    window.tournamentManager.loadFixtures = () => window.fixturesManager.init();
}