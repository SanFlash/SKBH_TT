from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
import random
from sqlalchemy import func
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Production configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'table-tennis-tournament-secret')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Database configuration
if os.environ.get('DATABASE_URL'):
    # Use PostgreSQL in production (Render)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL').replace('postgres://', 'postgresql://')
else:
    # Use SQLite in development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///tournament.db'

db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Database Models
class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    group_id = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Match(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player1_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    player2_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    group_id = db.Column(db.String(10), nullable=False)
    stage = db.Column(db.String(20), default='league')  # league, knockout
    round_number = db.Column(db.Integer, default=1)
    status = db.Column(db.String(20), default='pending')  # pending, completed
    winner_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)

class MatchScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    match_id = db.Column(db.Integer, db.ForeignKey('match.id'), nullable=False)
    set_number = db.Column(db.Integer, nullable=False)
    player1_score = db.Column(db.Integer, nullable=False)
    player2_score = db.Column(db.Integer, nullable=False)

class Standing(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    group_id = db.Column(db.String(10), nullable=False)
    matches_played = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    sets_won = db.Column(db.Integer, default=0)
    sets_lost = db.Column(db.Integer, default=0)
    points_for = db.Column(db.Integer, default=0)
    points_against = db.Column(db.Integer, default=0)
    ranking_points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Fixture Generation Service
class FixtureService:
    @staticmethod
    def generate_round_robin_fixtures(players, group_id):
        """Generate round-robin fixtures using circle method"""
        if len(players) < 2:
            return []
        
        # Shuffle players for randomness
        players_copy = players.copy()
        random.shuffle(players_copy)
        
        fixtures = []
        n = len(players_copy)
        
        # If odd number, add a dummy player
        if n % 2 == 1:
            players_copy.append(None)
            n += 1
        
        # Generate rounds
        for round_num in range(n - 1):
            round_fixtures = []
            for i in range(n // 2):
                player1 = players_copy[i]
                player2 = players_copy[n - 1 - i]
                
                if player1 is not None and player2 is not None:
                    match = Match(
                        player1_id=player1.id,
                        player2_id=player2.id,
                        group_id=group_id,
                        round_number=round_num + 1
                    )
                    round_fixtures.append(match)
            
            # Rotate players (except first)
            players_copy = [players_copy[0]] + [players_copy[-1]] + players_copy[1:-1]
            fixtures.extend(round_fixtures)
        
        return fixtures

# Ranking Service
class RankingService:
    @staticmethod
    def calculate_standings(player_id, group_id):
        """Calculate standings for a player"""
        player = Player.query.get(player_id)
        if not player:
            return None
        
        # Get all matches for this player
        matches = Match.query.filter(
            ((Match.player1_id == player_id) | (Match.player2_id == player_id)) &
            (Match.group_id == group_id) &
            (Match.status == 'completed')
        ).all()
        
        stats = {
            'matches_played': 0,
            'wins': 0,
            'losses': 0,
            'sets_won': 0,
            'sets_lost': 0,
            'points_for': 0,
            'points_against': 0,
            'ranking_points': 0
        }
        
        for match in matches:
            stats['matches_played'] += 1
            
            # Get match scores
            scores = MatchScore.query.filter_by(match_id=match.id).all()
            
            player_sets_won = 0
            opponent_sets_won = 0
            
            for score in scores:
                if match.player1_id == player_id:
                    if score.player1_score > score.player2_score:
                        player_sets_won += 1
                    else:
                        opponent_sets_won += 1
                    stats['points_for'] += score.player1_score
                    stats['points_against'] += score.player2_score
                else:
                    if score.player2_score > score.player1_score:
                        player_sets_won += 1
                    else:
                        opponent_sets_won += 1
                    stats['points_for'] += score.player2_score
                    stats['points_against'] += score.player1_score
            
            stats['sets_won'] += player_sets_won
            stats['sets_lost'] += opponent_sets_won
            
            # Determine win/loss
            if match.winner_id == player_id:
                stats['wins'] += 1
                stats['ranking_points'] += 2  # Win = 2 points
            else:
                stats['losses'] += 1
                # Loss = 0 points (no change)
        
        return stats
    
    @staticmethod
    def update_all_standings(group_id):
        """Update standings for all players in a group"""
        players = Player.query.filter_by(group_id=group_id).all()
        
        for player in players:
            stats = RankingService.calculate_standings(player.id, group_id)
            
            if stats:
                standing = Standing.query.filter_by(player_id=player.id, group_id=group_id).first()
                if not standing:
                    standing = Standing(player_id=player.id, group_id=group_id)
                    db.session.add(standing)
                
                # Update standing with new stats
                standing.matches_played = stats['matches_played']
                standing.wins = stats['wins']
                standing.losses = stats['losses']
                standing.sets_won = stats['sets_won']
                standing.sets_lost = stats['sets_lost']
                standing.points_for = stats['points_for']
                standing.points_against = stats['points_against']
                standing.ranking_points = stats['ranking_points']
        
        db.session.commit()

# Qualification Service
class QualificationService:
    @staticmethod
    def predict_qualification(group_id, top_n=2):
        """Predict qualification chances for players in a group"""
        players = Player.query.filter_by(group_id=group_id).all()
        standings = Standing.query.filter_by(group_id=group_id).all()
        
        # Get current standings sorted by ranking points
        standings_sorted = sorted(standings, key=lambda x: x.ranking_points, reverse=True)
        
        predictions = []
        
        for standing in standings:
            player = Player.query.get(standing.player_id)
            
            # Calculate remaining matches
            remaining_matches = Match.query.filter(
                ((Match.player1_id == player.id) | (Match.player2_id == player.id)) &
                (Match.group_id == group_id) &
                (Match.status == 'pending')
            ).count()
            
            # Calculate maximum possible points
            max_possible_points = standing.ranking_points + (remaining_matches * 2)
            
            # Check if currently in qualification position
            current_position = next(i for i, s in enumerate(standings_sorted) if s.player_id == player.id) + 1
            
            # Simple qualification prediction
            if current_position <= top_n:
                status = "Likely Qualified"
                probability = 85
            elif max_possible_points >= standings_sorted[top_n-1].ranking_points:
                status = "Can Still Qualify"
                probability = 60
            else:
                status = "Eliminated"
                probability = 10
            
            predictions.append({
                'player': player,
                'current_position': current_position,
                'ranking_points': standing.ranking_points,
                'remaining_matches': remaining_matches,
                'max_possible_points': max_possible_points,
                'status': status,
                'probability': probability
            })
        
        return predictions

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/fixtures')
def fixtures():
    return render_template('fixtures.html')

@app.route('/standings')
def standings():
    return render_template('standings.html')

@app.route('/match-entry')
def match_entry():
    return render_template('match_entry.html')

# API Routes
@app.route('/api/players', methods=['GET', 'POST'])
def handle_players():
    if request.method == 'POST':
        data = request.json
        player = Player(name=data['name'], group_id=data['group_id'])
        db.session.add(player)
        db.session.commit()
        return jsonify({'id': player.id, 'name': player.name, 'group_id': player.group_id})
    
    players = Player.query.all()
    return jsonify([{'id': p.id, 'name': p.name, 'group_id': p.group_id} for p in players])

@app.route('/api/generate-fixtures', methods=['POST'])
def generate_fixtures():
    data = request.json
    group_id = data.get('group_id', 'A')
    
    # Clear existing fixtures for this group
    Match.query.filter_by(group_id=group_id, stage='league').delete()
    db.session.commit()
    
    players = Player.query.filter_by(group_id=group_id).all()
    
    if len(players) < 2:
        return jsonify({'error': 'Need at least 2 players to generate fixtures'}), 400
    
    fixtures = FixtureService.generate_round_robin_fixtures(players, group_id)
    
    for fixture in fixtures:
        db.session.add(fixture)
    
    db.session.commit()
    
    return jsonify({'message': f'Generated {len(fixtures)} fixtures for group {group_id}'})

@app.route('/api/matches/<group_id>')
def get_matches(group_id):
    matches = Match.query.filter_by(group_id=group_id).all()
    result = []
    
    for match in matches:
        player1 = Player.query.get(match.player1_id)
        player2 = Player.query.get(match.player2_id)
        winner = Player.query.get(match.winner_id) if match.winner_id else None
        
        result.append({
            'id': match.id,
            'player1': {'id': player1.id, 'name': player1.name},
            'player2': {'id': player2.id, 'name': player2.name},
            'round_number': match.round_number,
            'status': match.status,
            'winner': {'id': winner.id, 'name': winner.name} if winner else None,
            'stage': match.stage
        })
    
    return jsonify(result)

@app.route('/api/submit-result', methods=['POST'])
def submit_result():
    data = request.json
    match_id = data['match_id']
    scores = data['scores']  # Array of {set_number, player1_score, player2_score}
    
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'error': 'Match not found'}), 404
    
    # Clear existing scores
    MatchScore.query.filter_by(match_id=match_id).delete()
    
    # Add new scores
    player1_sets_won = 0
    player2_sets_won = 0
    
    for score_data in scores:
        score = MatchScore(
            match_id=match_id,
            set_number=score_data['set_number'],
            player1_score=score_data['player1_score'],
            player2_score=score_data['player2_score']
        )
        db.session.add(score)
        
        # Count sets won
        if score_data['player1_score'] > score_data['player2_score']:
            player1_sets_won += 1
        else:
            player2_sets_won += 1
    
    # Determine winner (best of 5 sets)
    if player1_sets_won >= 3:
        match.winner_id = match.player1_id
    else:
        match.winner_id = match.player2_id
    
    match.status = 'completed'
    match.completed_at = datetime.utcnow()
    
    db.session.commit()
    
    # Update standings
    RankingService.update_all_standings(match.group_id)
    
    # Broadcast update to all connected clients
    socketio.emit('match_updated', {
        'match_id': match_id,
        'group_id': match.group_id,
        'winner_id': match.winner_id
    })
    
    return jsonify({'message': 'Result submitted successfully'})

@app.route('/api/standings/<group_id>')
def get_standings(group_id):
    standings = Standing.query.filter_by(group_id=group_id).all()
    result = []
    
    # Sort by ranking points (descending)
    standings_sorted = sorted(standings, key=lambda x: x.ranking_points, reverse=True)
    
    for i, standing in enumerate(standings_sorted):
        player = Player.query.get(standing.player_id)
        
        # Calculate set difference and point difference
        set_diff = standing.sets_won - standing.sets_lost
        point_diff = standing.points_for - standing.points_against
        
        result.append({
            'rank': i + 1,
            'player': {'id': player.id, 'name': player.name},
            'matches_played': standing.matches_played,
            'wins': standing.wins,
            'losses': standing.losses,
            'sets_won': standing.sets_won,
            'sets_lost': standing.sets_lost,
            'set_difference': set_diff,
            'points_for': standing.points_for,
            'points_against': standing.points_against,
            'point_difference': point_diff,
            'ranking_points': standing.ranking_points
        })
    
    return jsonify(result)

@app.route('/api/qualification/<group_id>')
def get_qualification(group_id):
    predictions = QualificationService.predict_qualification(group_id)
    result = []
    
    for pred in predictions:
        result.append({
            'player': {'id': pred['player'].id, 'name': pred['player'].name},
            'current_position': pred['current_position'],
            'ranking_points': pred['ranking_points'],
            'remaining_matches': pred['remaining_matches'],
            'max_possible_points': pred['max_possible_points'],
            'status': pred['status'],
            'probability': pred['probability']
        })
    
    return jsonify(result)

# WebSocket events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connected', {'data': 'Connected to tournament server'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    # Production deployment configuration
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)