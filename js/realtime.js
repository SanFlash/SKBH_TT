// Real-time Updates Simulation
class RealtimeManager {
    constructor() {
        this.isConnected = false;
        this.updateInterval = null;
        this.connectionCheckInterval = null;
        this.lastUpdateTime = Date.now();
        this.updateFrequency = 5000; // 5 seconds
        this.connectionCheckFrequency = 10000; // 10 seconds
    }
    
    init() {
        this.simulateConnection();
        this.startUpdateSimulation();
        this.startConnectionCheck();
    }
    
    simulateConnection() {
        // Simulate initial connection
        setTimeout(() => {
            this.isConnected = true;
            this.updateConnectionStatus(true);
            this.broadcastConnectionEvent();
        }, 1000);
    }
    
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const indicator = document.getElementById('connectionIndicator');
        const text = document.getElementById('connectionText');
        
        if (indicator && text) {
            if (connected) {
                indicator.className = 'connection-indicator connected';
                text.textContent = 'Connected';
            } else {
                indicator.className = 'connection-indicator disconnected';
                text.textContent = 'Disconnected';
            }
        }
    }
    
    broadcastConnectionEvent() {
        // Simulate WebSocket connection event
        const event = new CustomEvent('tournamentConnected', {
            detail: {
                connected: this.isConnected,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }
    
    broadcastUpdateEvent(data) {
        // Simulate WebSocket update event
        const event = new CustomEvent('tournamentUpdate', {
            detail: {
                type: data.type,
                data: data.payload,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }
    
    startUpdateSimulation() {
        this.updateInterval = setInterval(async () => {
            if (!this.isConnected) return;
            
            try {
                // Simulate random updates
                const updateType = this.getRandomUpdateType();
                await this.simulateUpdate(updateType);
                
                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error('Error in update simulation:', error);
            }
        }, this.updateFrequency);
    }
    
    startConnectionCheck() {
        this.connectionCheckInterval = setInterval(() => {
            // Simulate connection drops (10% chance)
            const shouldDisconnect = Math.random() < 0.1;
            
            if (shouldDisconnect && this.isConnected) {
                this.simulateDisconnection();
            } else if (!this.isConnected && Math.random() < 0.3) {
                // 30% chance to reconnect when disconnected
                this.simulateReconnection();
            }
        }, this.connectionCheckFrequency);
    }
    
    getRandomUpdateType() {
        const types = ['match_completed', 'player_added', 'standing_updated', 'fixture_generated'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    async simulateUpdate(updateType) {
        switch (updateType) {
            case 'match_completed':
                await this.simulateMatchCompletion();
                break;
            case 'player_added':
                await this.simulatePlayerAddition();
                break;
            case 'standing_updated':
                await this.simulateStandingUpdate();
                break;
            case 'fixture_generated':
                await this.simulateFixtureGeneration();
                break;
        }
    }
    
    async simulateMatchCompletion() {
        // Find a pending match and simulate its completion
        const matches = window.tournamentManager.matches;
        const pendingMatches = matches.filter(m => m.status === 'pending');
        
        if (pendingMatches.length === 0) return;
        
        const randomMatch = pendingMatches[Math.floor(Math.random() * pendingMatches.length)];
        
        // Simulate match result
        const result = this.simulateMatchResult(randomMatch);
        
        // Update match in database
        try {
            const matchData = {
                ...randomMatch,
                status: 'completed',
                winner_id: result.winner_id,
                updated_at: new Date().toISOString()
            };
            
            await fetch(`tables/matches/${randomMatch.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(matchData)
            });
            
            // Save scores
            for (const score of result.scores) {
                const scoreData = {
                    match_id: randomMatch.id,
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
            
            // Update local data
            randomMatch.status = 'completed';
            randomMatch.winner_id = result.winner_id;
            
            // Update standings
            if (window.standingsManager) {
                await window.standingsManager.recalculateStandings();
            }
            
            this.broadcastUpdateEvent({
                type: 'match_completed',
                payload: {
                    match: randomMatch,
                    result: result,
                    timestamp: Date.now()
                }
            });
            
            // Show notification
            const players = window.tournamentManager.players;
            const player1 = players.find(p => p.id === randomMatch.player1_id);
            const player2 = players.find(p => p.id === randomMatch.player2_id);
            const winner = players.find(p => p.id === result.winner_id);
            
            window.tournamentManager.showToast(
                `Match completed: ${player1?.name} vs ${player2?.name} - Winner: ${winner?.name}`,
                'success'
            );
            
        } catch (error) {
            console.error('Error simulating match completion:', error);
        }
    }
    
    simulateMatchResult(match) {
        const sets = [];
        let player1Sets = 0;
        let player2Sets = 0;
        
        for (let set = 1; set <= 5; set++) {
            const player1Score = Math.floor(Math.random() * 12) + 8; // 8-19 points
            const player2Score = Math.floor(Math.random() * 12) + 8;
            
            sets.push({
                set_number: set,
                player1_score: Math.max(player1Score, player2Score),
                player2_score: Math.min(player1Score, player2Score)
            });
            
            if (player1Score > player2Score) {
                player1Sets++;
            } else {
                player2Sets++;
            }
            
            // Stop if someone wins 3 sets
            if (player1Sets >= 3 || player2Sets >= 3) break;
        }
        
        return {
            winner_id: player1Sets >= 3 ? match.player1_id : match.player2_id,
            scores: sets
        };
    }
    
    async simulatePlayerAddition() {
        // Simulate adding a new player
        const groups = ['A', 'B', 'C', 'D'];
        const names = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];
        
        const randomGroup = groups[Math.floor(Math.random() * groups.length)];
        const randomName = names[Math.floor(Math.random() * names.length)] + ' ' + Math.floor(Math.random() * 100);
        
        try {
            const playerData = {
                name: randomName,
                group_id: randomGroup,
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
                
                // Add to local data
                window.tournamentManager.players.push(newPlayer);
                
                // Create initial standing
                if (window.fixturesManager) {
                    await window.fixturesManager.createInitialStanding(newPlayer.id, randomGroup);
                }
                
                this.broadcastUpdateEvent({
                    type: 'player_added',
                    payload: {
                        player: newPlayer,
                        timestamp: Date.now()
                    }
                });
                
                window.tournamentManager.showToast(`New player added: ${randomName} to Group ${randomGroup}`, 'info');
            }
            
        } catch (error) {
            console.error('Error simulating player addition:', error);
        }
    }
    
    async simulateStandingUpdate() {
        // Simulate a standings update
        if (window.standingsManager) {
            await window.standingsManager.recalculateStandings();
            
            this.broadcastUpdateEvent({
                type: 'standing_updated',
                payload: {
                    timestamp: Date.now()
                }
            });
            
            window.tournamentManager.showToast('Standings updated', 'info');
        }
    }
    
    async simulateFixtureGeneration() {
        // Simulate fixture generation
        if (window.fixturesManager && Math.random() < 0.3) { // 30% chance
            await window.fixturesManager.generateFixtures();
            
            this.broadcastUpdateEvent({
                type: 'fixture_generated',
                payload: {
                    timestamp: Date.now()
                }
            });
        }
    }
    
    simulateDisconnection() {
        this.isConnected = false;
        this.updateConnectionStatus(false);
        
        // Show disconnection notification
        window.tournamentManager.showToast('Connection lost. Attempting to reconnect...', 'error');
        
        // Simulate reconnection attempt after random delay
        const reconnectDelay = Math.random() * 10000 + 5000; // 5-15 seconds
        setTimeout(() => {
            if (!this.isConnected) {
                this.simulateReconnection();
            }
        }, reconnectDelay);
    }
    
    simulateReconnection() {
        this.isConnected = true;
        this.updateConnectionStatus(true);
        
        // Show reconnection notification
        window.tournamentManager.showToast('Connection restored', 'success');
        
        // Refresh data after reconnection
        this.refreshAllData();
    }
    
    async refreshAllData() {
        try {
            // Refresh all managers
            if (window.tournamentManager) {
                await window.tournamentManager.loadInitialData();
                await window.tournamentManager.updateDashboard();
            }
            
            if (window.fixturesManager) {
                await window.fixturesManager.init();
            }
            
            if (window.standingsManager) {
                await window.standingsManager.init();
            }
            
            if (window.matchManager) {
                await window.matchManager.init();
            }
            
            this.broadcastConnectionEvent();
            
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }
    
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        if (this.connectionCheckInterval) {
            clearInterval(this.connectionCheckInterval);
        }
    }
}

// Initialize real-time manager
window.realtimeManager = new RealtimeManager();

// Listen for custom events
window.addEventListener('tournamentConnected', (event) => {
    console.log('Tournament connected:', event.detail);
});

window.addEventListener('tournamentUpdate', (event) => {
    console.log('Tournament update:', event.detail);
    
    // Handle different update types
    const { type, data } = event.detail;
    
    switch (type) {
        case 'match_completed':
            // Refresh current tab
            if (window.tournamentManager && window.tournamentManager.currentTab) {
                window.tournamentManager.loadTabData(window.tournamentManager.currentTab);
            }
            break;
        case 'player_added':
            // Refresh fixtures if on fixtures tab
            if (window.tournamentManager && window.tournamentManager.currentTab === 'fixtures') {
                window.tournamentManager.loadTabData('fixtures');
            }
            break;
        case 'standing_updated':
            // Refresh standings if on standings tab
            if (window.tournamentManager && window.tournamentManager.currentTab === 'standings') {
                window.tournamentManager.loadTabData('standings');
            }
            break;
    }
});