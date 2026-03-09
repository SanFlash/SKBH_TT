# Knockout Bracket Generator
# This module can be extended to generate knockout brackets after league stage

class KnockoutService:
    @staticmethod
    def generate_knockout_bracket(qualified_players):
        """
        Generate knockout bracket from qualified players
        qualified_players: List of player objects (top 2 from each group)
        """
        if len(qualified_players) < 4:
            return None
        
        # Ensure we have power of 2 players
        n = len(qualified_players)
        next_power_of_2 = 2 ** (n - 1).bit_length()
        
        # Add byes if needed (for now, just take top players)
        if n != next_power_of_2:
            qualified_players = qualified_players[:next_power_of_2 // 2]
        
        bracket = []
        
        # Generate quarterfinals
        if len(qualified_players) >= 8:
            for i in range(0, len(qualified_players), 2):
                match = {
                    'player1': qualified_players[i],
                    'player2': qualified_players[i + 1],
                    'round': 'quarterfinal',
                    'match_number': (i // 2) + 1
                }
                bracket.append(match)
        
        return bracket
    
    @staticmethod
    def get_qualified_players():
        """Get top 2 players from each group for knockout stage"""
        # This would be implemented to fetch from database
        # For now, returning empty list
        return []

# Example usage in Flask route:
@app.route('/api/generate-knockout', methods=['POST'])
def generate_knockout():
    """Generate knockout bracket after league stage"""
    try:
        # Get qualified players (top 2 from each group)
        qualified_players = []
        
        for group_id in ['A', 'B', 'C', 'D']:
            standings = Standing.query.filter_by(group_id=group_id)\
                .order_by(Standing.ranking_points.desc())\
                .limit(2).all()
            
            for standing in standings:
                player = Player.query.get(standing.player_id)
                qualified_players.append(player)
        
        # Generate knockout bracket
        knockout_bracket = KnockoutService.generate_knockout_bracket(qualified_players)
        
        if knockout_bracket:
            # Create knockout matches
            for match_data in knockout_bracket:
                match = Match(
                    player1_id=match_data['player1'].id,
                    player2_id=match_data['player2'].id,
                    group_id='knockout',
                    stage='knockout',
                    round_number=1,
                    status='pending'
                )
                db.session.add(match)
            
            db.session.commit()
            
            return jsonify({
                'message': f'Generated knockout bracket with {len(knockout_bracket)} matches',
                'matches': len(knockout_bracket)
            })
        else:
            return jsonify({'error': 'Not enough qualified players for knockout stage'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500