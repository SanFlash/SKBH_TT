// Standings and Ranking System
class StandingsManager {
    constructor() {
        this.tournamentLogic = new TournamentLogic();
        this.qualificationSpots = 2; // Top 2 from each group qualify
    }
    
    async init() {
        await this.loadStandings();
        await this.loadPlayers();
        await this.loadMatches();
        this.renderStandings();
        this.renderQualificationPredictions();
    }
    
    async loadStandings() {
        try {
            const response = await fetch('tables/standings');
            const data = await response.json();
            window.tournamentManager.standings = data.data || [];
            return window.tournamentManager.standings;
        } catch (error) {
            console.error('Error loading standings:', error);
            window.tournamentManager.showToast('Error loading standings', 'error');
            return [];
        }
    }
    
    async loadPlayers() {
        try {
            const response = await fetch('tables/players');
            const data = await response.json();
            window.tournamentManager.players = data.data || [];
            return window.tournamentManager.players;
        } catch (error) {
            console.error('Error loading players:', error);
            return [];
        }
    }
    
    async loadMatches() {
        try {
            const response = await fetch('tables/matches');
            const data = await response.json();
            window.tournamentManager.matches = data.data || [];
            return window.tournamentManager.matches;
        } catch (error) {
            console.error('Error loading matches:', error);
            return [];
        }
    }
    
    renderStandings() {
        const container = document.getElementById('standingsContainer');
        const standings = window.tournamentManager.standings;
        const players = window.tournamentManager.players;
        
        if (standings.length === 0) {
            container.innerHTML = '<div class="text-gray-500 text-center py-8">No standings available</div>';
            return;
        }
        
        // Group standings by group
        const standingsByGroup = {};
        standings.forEach(standing => {
            if (!standingsByGroup[standing.group_id]) {
                standingsByGroup[standing.group_id] = [];
            }
            standingsByGroup[standing.group_id].push(standing);
        });
        
        container.innerHTML = Object.keys(standingsByGroup).sort().map(groupId => {
            const groupStandings = standingsByGroup[groupId];
            const sortedStandings = this.tournamentLogic.sortStandings(groupStandings);
            const groupColor = this.getGroupColor(groupId);
            
            return `
                <div class="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 ${groupColor}">
                    <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                        <h3 class="text-xl font-semibold text-gray-800 flex items-center">
                            <i class="fas fa-trophy mr-3 text-yellow-500"></i>
                            Group ${groupId} Standings
                        </h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">MP</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">W</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">L</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SW</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SL</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SD</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PF</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PA</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PD</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                    <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qualification</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${sortedStandings.map((standing, index) => {
                                    const player = players.find(p => p.id === standing.player_id);
                                    const isQualified = index < this.qualificationSpots;
                                    const movement = this.getMovementIndicator(standing, index);
                                    
                                    return `
                                        <tr class="${isQualified ? 'bg-green-50' : ''} hover:bg-gray-50 transition-colors duration-200">
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="flex items-center">
                                                    <span class="text-lg font-bold text-gray-800">${index + 1}</span>
                                                    ${movement}
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap">
                                                <div class="flex items-center">
                                                    <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                                                        <i class="fas fa-user text-gray-600 text-sm"></i>
                                                    </div>
                                                    <div>
                                                        <div class="text-sm font-medium text-gray-900">${player?.name || 'Unknown'}</div>
                                                        <div class="text-xs text-gray-500">${standing.group_id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${standing.matches_played}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-green-600">${standing.wins}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-red-600">${standing.losses}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${standing.sets_won}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${standing.sets_lost}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium ${standing.sets_won - standing.sets_lost >= 0 ? 'text-green-600' : 'text-red-600'}">
                                                ${standing.sets_won - standing.sets_lost >= 0 ? '+' : ''}${standing.sets_won - standing.sets_lost}
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${standing.points_for}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">${standing.points_against}</td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium ${standing.points_for - standing.points_against >= 0 ? 'text-green-600' : 'text-red-600'}">
                                                ${standing.points_for - standing.points_against >= 0 ? '+' : ''}${standing.points_for - standing.points_against}
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center">
                                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    ${standing.ranking_points}
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 whitespace-nowrap text-center">
                                                ${isQualified ? 
                                                    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><i class="fas fa-check-circle mr-1"></i>Qualified</span>' :
                                                    '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><i class="fas fa-question-circle mr-1"></i>Pending</span>'
                                                }
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    renderQualificationPredictions() {
        const container = document.getElementById('qualificationPredictions');
        const standings = window.tournamentManager.standings;
        const players = window.tournamentManager.players;
        
        if (standings.length === 0) {
            container.innerHTML = '';
            return;
        }
        
        // Group standings by group
        const standingsByGroup = {};
        standings.forEach(standing => {
            if (!standingsByGroup[standing.group_id]) {
                standingsByGroup[standing.group_id] = [];
            }
            standingsByGroup[standing.group_id].push(standing);
        });
        
        const predictions = [];
        Object.keys(standingsByGroup).forEach(groupId => {
            const groupStandings = standingsByGroup[groupId];
            const sortedStandings = this.tournamentLogic.sortStandings(groupStandings);
            const probabilities = this.tournamentLogic.calculateQualificationProbabilities(
                sortedStandings, 
                sortedStandings.length, 
                this.qualificationSpots
            );
            
            sortedStandings.forEach((standing, index) => {
                const player = players.find(p => p.id === standing.player_id);
                const probability = probabilities[standing.id] || 0;
                
                predictions.push({
                    player: player?.name || 'Unknown',
                    group: groupId,
                    rank: index + 1,
                    probability: probability,
                    points: standing.ranking_points,
                    isQualified: index < this.qualificationSpots
                });
            });
        });
        
        // Sort by probability
        predictions.sort((a, b) => b.probability - a.probability);
        
        container.innerHTML = `
            <div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg p-6 mb-6 text-white">
                <h3 class="text-xl font-semibold mb-4 flex items-center">
                    <i class="fas fa-crystal-ball mr-3"></i>Qualification Predictions
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${predictions.slice(0, 6).map(prediction => `
                        <div class="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-medium">${prediction.player}</span>
                                <span class="text-sm opacity-80">Group ${prediction.group}</span>
                            </div>
                            <div class="flex justify-between items-center">
                                <span class="text-sm opacity-80">Rank ${prediction.rank}</span>
                                <span class="font-bold text-lg">
                                    ${prediction.probability.toFixed(0)}%
                                </span>
                            </div>
                            <div class="mt-2 bg-white bg-opacity-30 rounded-full h-2">
                                <div class="bg-white h-2 rounded-full transition-all duration-500" style="width: ${prediction.probability}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    getMovementIndicator(standing, currentIndex) {
        // This is a simplified version - in a real app, you'd track historical positions
        const previousIndex = currentIndex; // For now, assume no movement
        
        if (currentIndex < previousIndex) {
            return '<i class="fas fa-arrow-up text-green-500 ml-2"></i>';
        } else if (currentIndex > previousIndex) {
            return '<i class="fas fa-arrow-down text-red-500 ml-2"></i>';
        } else {
            return '<i class="fas fa-minus text-gray-400 ml-2"></i>';
        }
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
    
    async recalculateStandings() {
        try {
            window.tournamentManager.showLoading(true);
            
            const standings = window.tournamentManager.standings;
            const matches = window.tournamentManager.matches.filter(m => m.status === 'completed');
            const players = window.tournamentManager.players;
            
            // Recalculate all standings
            const newStandings = this.tournamentLogic.calculateStandings(matches, players);
            
            // Update each standing in database
            for (const standing of newStandings) {
                const existingStanding = standings.find(s => s.player_id === standing.id);
                if (existingStanding) {
                    await fetch(`tables/standings/${existingStanding.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            ...existingStanding,
                            matches_played: standing.matches_played,
                            wins: standing.wins,
                            losses: standing.losses,
                            sets_won: standing.sets_won,
                            sets_lost: standing.sets_lost,
                            points_for: standing.points_for,
                            points_against: standing.points_against,
                            ranking_points: standing.ranking_points,
                            updated_at: new Date().toISOString()
                        })
                    });
                }
            }
            
            window.tournamentManager.showToast('Standings recalculated', 'success');
            await this.loadStandings();
            this.renderStandings();
            this.renderQualificationPredictions();
            
        } catch (error) {
            console.error('Error recalculating standings:', error);
            window.tournamentManager.showToast('Error recalculating standings', 'error');
        } finally {
            window.tournamentManager.showLoading(false);
        }
    }
}

// Initialize standings manager
window.standingsManager = new StandingsManager();

// Extend the main tournament manager
if (window.tournamentManager) {
    window.tournamentManager.loadStandings = () => window.standingsManager.init();
}