// Tournament Logic - Fixtures and Round-Robin Generation
class TournamentLogic {
    constructor() {
        this.groups = ['A', 'B', 'C', 'D'];
        this.pointsPerWin = 2;
        this.pointsPerLoss = 0;
        this.setsPerMatch = 5;
    }
    
    // Generate round-robin fixtures using the circle method
    generateRoundRobinFixtures(players, groupId) {
        if (players.length < 2) return [];
        
        const fixtures = [];
        const playerCount = players.length;
        const rounds = playerCount - 1;
        const matchesPerRound = Math.floor(playerCount / 2);
        
        // Create a copy of players array
        const participants = [...players];
        
        // If odd number of players, add a dummy player
        if (playerCount % 2 !== 0) {
            participants.push({ id: 'dummy', name: 'Bye' });
        }
        
        // Generate fixtures using circle method
        for (let round = 0; round < rounds; round++) {
            for (let match = 0; match < matchesPerRound; match++) {
                const player1 = participants[match];
                const player2 = participants[participants.length - 1 - match];
                
                // Skip if one player is the dummy
                if (player1.id === 'dummy' || player2.id === 'dummy') continue;
                
                fixtures.push({
                    id: this.generateMatchId(groupId, round, match),
                    player1_id: player1.id,
                    player2_id: player2.id,
                    group_id: groupId,
                    stage: 'league',
                    round_number: round + 1,
                    status: 'pending',
                    player1_name: player1.name,
                    player2_name: player2.name
                });
            }
            
            // Rotate players (except the first one)
            const firstPlayer = participants[0];
            const lastPlayer = participants.pop();
            participants.splice(1, 0, lastPlayer);
            participants[0] = firstPlayer;
        }
        
        return fixtures;
    }
    
    // Generate match ID
    generateMatchId(groupId, round, match) {
        return `G${groupId}_R${round + 1}_M${match + 1}_${Date.now()}`;
    }
    
    // Calculate standings with tie-breakers
    calculateStandings(matches, players) {
        const standings = {};
        
        // Initialize standings for each player
        players.forEach(player => {
            standings[player.id] = {
                id: player.id,
                name: player.name,
                group_id: player.group_id,
                matches_played: 0,
                wins: 0,
                losses: 0,
                sets_won: 0,
                sets_lost: 0,
                points_for: 0,
                points_against: 0,
                ranking_points: 0
            };
        });
        
        // Process each match
        matches.forEach(match => {
            if (match.status !== 'completed' || !match.winner_id) return;
            
            const player1Standing = standings[match.player1_id];
            const player2Standing = standings[match.player2_id];
            
            if (!player1Standing || !player2Standing) return;
            
            // Update match statistics
            player1Standing.matches_played++;
            player2Standing.matches_played++;
            
            if (match.winner_id === match.player1_id) {
                player1Standing.wins++;
                player1Standing.ranking_points += this.pointsPerWin;
                player2Standing.losses++;
                player2Standing.ranking_points += this.pointsPerLoss;
            } else {
                player2Standing.wins++;
                player2Standing.ranking_points += this.pointsPerWin;
                player1Standing.losses++;
                player1Standing.ranking_points += this.pointsPerLoss;
            }
            
            // Update set statistics if available
            if (match.scores) {
                match.scores.forEach(set => {
                    player1Standing.sets_won += set.player1_score > set.player2_score ? 1 : 0;
                    player1Standing.sets_lost += set.player1_score < set.player2_score ? 1 : 0;
                    player2Standing.sets_won += set.player2_score > set.player1_score ? 1 : 0;
                    player2Standing.sets_lost += set.player2_score < set.player1_score ? 1 : 0;
                    
                    player1Standing.points_for += set.player1_score;
                    player1Standing.points_against += set.player2_score;
                    player2Standing.points_for += set.player2_score;
                    player2Standing.points_against += set.player1_score;
                });
            }
        });
        
        return Object.values(standings);
    }
    
    // Sort standings with tie-breakers
    sortStandings(standings) {
        return standings.sort((a, b) => {
            // 1. Ranking points
            if (b.ranking_points !== a.ranking_points) {
                return b.ranking_points - a.ranking_points;
            }
            
            // 2. Set difference
            const aSetDiff = a.sets_won - a.sets_lost;
            const bSetDiff = b.sets_won - b.sets_lost;
            if (bSetDiff !== aSetDiff) {
                return bSetDiff - aSetDiff;
            }
            
            // 3. Points difference
            const aPointDiff = a.points_for - a.points_against;
            const bPointDiff = b.points_for - b.points_against;
            if (bPointDiff !== aPointDiff) {
                return bPointDiff - aPointDiff;
            }
            
            // 4. Head-to-head (if applicable)
            // This would require checking if they've played each other
            
            // 5. Random draw (for now, alphabetical)
            return a.name.localeCompare(b.name);
        });
    }
    
    // Calculate qualification probabilities
    calculateQualificationProbabilities(standings, groupSize, qualificationSpots) {
        const probabilities = {};
        const sortedStandings = this.sortStandings([...standings]);
        
        sortedStandings.forEach((player, index) => {
            if (index < qualificationSpots) {
                // Currently in qualification position
                const pointsAbove = player.ranking_points - (sortedStandings[qualificationSpots]?.ranking_points || 0);
                const pointsBelow = (sortedStandings[qualificationSpots - 1]?.ranking_points || 0) - player.ranking_points;
                
                if (pointsAbove > 0) {
                    probabilities[player.id] = Math.min(100, 80 + (pointsAbove * 5));
                } else {
                    probabilities[player.id] = Math.max(20, 60 + (pointsAbove * 3));
                }
            } else {
                // Outside qualification position
                const pointsNeeded = sortedStandings[qualificationSpots - 1]?.ranking_points - player.ranking_points;
                const matchesRemaining = groupSize - 1 - player.matches_played;
                
                if (matchesRemaining === 0) {
                    probabilities[player.id] = 0;
                } else {
                    const maxPossible = matchesRemaining * this.pointsPerWin;
                    probabilities[player.id] = Math.max(0, Math.min(100, ((maxPossible - pointsNeeded) / maxPossible) * 50));
                }
            }
        });
        
        return probabilities;
    }
    
    // Generate knockout bracket
    generateKnockoutBracket(qualifiedPlayers) {
        const bracket = [];
        const totalPlayers = qualifiedPlayers.length;
        
        if (totalPlayers < 2) return bracket;
        
        // Determine bracket size (power of 2)
        let bracketSize = 2;
        while (bracketSize < totalPlayers) {
            bracketSize *= 2;
        }
        
        // Create bracket rounds
        const rounds = Math.log2(bracketSize);
        
        for (let round = 0; round < rounds; round++) {
            const matchesInRound = Math.pow(2, rounds - round - 1);
            const roundMatches = [];
            
            for (let match = 0; match < matchesInRound; match++) {
                let player1, player2;
                
                if (round === 0) {
                    // First round - assign qualified players
                    const index1 = match * 2;
                    const index2 = match * 2 + 1;
                    
                    player1 = qualifiedPlayers[index1] || null;
                    player2 = qualifiedPlayers[index2] || null;
                } else {
                    // Subsequent rounds - winners from previous round
                    const prevRoundMatch1 = match * 2;
                    const prevRoundMatch2 = match * 2 + 1;
                    
                    player1 = { id: `winner_R${round-1}_M${prevRoundMatch1}`, name: 'TBD' };
                    player2 = { id: `winner_R${round-1}_M${prevRoundMatch2}`, name: 'TBD' };
                }
                
                roundMatches.push({
                    id: `R${round}_M${match}`,
                    player1_id: player1?.id,
                    player2_id: player2?.id,
                    player1_name: player1?.name,
                    player2_name: player2?.name,
                    round: round,
                    match: match,
                    stage: 'knockout'
                });
            }
            
            bracket.push({
                round: round,
                roundName: this.getRoundName(round, rounds),
                matches: roundMatches
            });
        }
        
        return bracket;
    }
    
    getRoundName(round, totalRounds) {
        const roundNames = ['Final', 'Semi-Finals', 'Quarter-Finals', 'Round of 16', 'Round of 32'];
        return roundNames[totalRounds - round - 1] || `Round ${round + 1}`;
    }
    
    // Simulate match result for testing
    simulateMatchResult(player1Id, player2Id) {
        const sets = [];
        let player1Sets = 0;
        let player2Sets = 0;
        
        for (let set = 1; set <= this.setsPerMatch; set++) {
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
            if (player1Sets === 3 || player2Sets === 3) break;
        }
        
        return {
            winner_id: player1Sets > player2Sets ? player1Id : player2Id,
            scores: sets
        };
    }
}

// Export for use in other modules
window.TournamentLogic = TournamentLogic;