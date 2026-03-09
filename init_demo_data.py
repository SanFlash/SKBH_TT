#!/usr/bin/env python3
"""
Demo data initialization script for Table Tennis Tournament System
Run this script to populate the database with sample data for testing
"""

import requests
import json
import random

def create_demo_players():
    """Create sample players for demonstration"""
    players = [
        # Group A
        {"name": "Alex Chen", "group_id": "A"},
        {"name": "Maria Rodriguez", "group_id": "A"},
        {"name": "John Smith", "group_id": "A"},
        {"name": "Sarah Johnson", "group_id": "A"},
        # Group B
        {"name": "David Kim", "group_id": "B"},
        {"name": "Emma Wilson", "group_id": "B"},
        {"name": "Michael Brown", "group_id": "B"},
        {"name": "Lisa Zhang", "group_id": "B"},
        # Group C
        {"name": "Robert Davis", "group_id": "C"},
        {"name": "Anna Thompson", "group_id": "C"},
        {"name": "James Lee", "group_id": "C"},
        {"name": "Helen Garcia", "group_id": "C"},
        # Group D
        {"name": "Tom Anderson", "group_id": "D"},
        {"name": "Sophie Martin", "group_id": "D"},
        {"name": "Kevin Liu", "group_id": "D"},
        {"name": "Rachel Green", "group_id": "D"}
    ]
    
    base_url = "http://localhost:5000"
    
    print("🎯 Creating demo players...")
    for player in players:
        try:
            response = requests.post(f"{base_url}/api/players", 
                                   json=player,
                                   headers={'Content-Type': 'application/json'})
            if response.status_code == 200:
                print(f"✅ Created player: {player['name']} (Group {player['group_id']})")
            else:
                print(f"❌ Failed to create player: {player['name']}")
        except Exception as e:
            print(f"❌ Error creating player {player['name']}: {e}")
    
    print("\n🎯 Generating fixtures for all groups...")
    for group in ['A', 'B', 'C', 'D']:
        try:
            response = requests.post(f"{base_url}/api/generate-fixtures",
                                   json={'group_id': group},
                                   headers={'Content-Type': 'application/json'})
            if response.status_code == 200:
                result = response.json()
                print(f"✅ {result['message']}")
            else:
                print(f"❌ Failed to generate fixtures for Group {group}")
        except Exception as e:
            print(f"❌ Error generating fixtures for Group {group}: {e}")

def submit_sample_results():
    """Submit some sample match results for demonstration"""
    base_url = "http://localhost:5000"
    
    # Sample match results for Group A
    sample_results = [
        {
            "match_id": 1,
            "scores": [
                {"set_number": 1, "player1_score": 11, "player2_score": 8},
                {"set_number": 2, "player1_score": 11, "player2_score": 9},
                {"set_number": 3, "player1_score": 9, "player2_score": 11},
                {"set_number": 4, "player1_score": 11, "player2_score": 7}
            ]
        },
        {
            "match_id": 2,
            "scores": [
                {"set_number": 1, "player1_score": 8, "player2_score": 11},
                {"set_number": 2, "player1_score": 11, "player2_score": 6},
                {"set_number": 3, "player1_score": 11, "player2_score": 9},
                {"set_number": 4, "player1_score": 11, "player2_score": 8}
            ]
        }
    ]
    
    print("\n🎯 Submitting sample match results...")
    for result in sample_results:
        try:
            response = requests.post(f"{base_url}/api/submit-result",
                                   json=result,
                                   headers={'Content-Type': 'application/json'})
            if response.status_code == 200:
                print(f"✅ Submitted result for match {result['match_id']}")
            else:
                print(f"❌ Failed to submit result for match {result['match_id']}")
        except Exception as e:
            print(f"❌ Error submitting result for match {result['match_id']}: {e}")

def check_application_status():
    """Check if the Flask application is running"""
    try:
        response = requests.get("http://localhost:5000/api/players")
        if response.status_code == 200:
            print("✅ Flask application is running and accessible")
            return True
        else:
            print(f"❌ Flask application returned status code: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Flask application")
        print("Please make sure the Flask app is running on http://localhost:5000")
        return False

def main():
    print("🏓 Table Tennis Tournament - Demo Data Initialization")
    print("=" * 50)
    
    # Check if application is running
    if not check_application_status():
        print("\nPlease start the Flask application first:")
        print("python app.py")
        return
    
    # Create demo players and fixtures
    create_demo_players()
    
    # Submit sample results (optional - uncomment if you want sample data)
    # submit_sample_results()
    
    print("\n" + "=" * 50)
    print("✅ Demo data initialization complete!")
    print("\nYou can now access the application at:")
    print("📊 Dashboard: http://localhost:5000/")
    print("🏓 Fixtures: http://localhost:5000/fixtures")
    print("📈 Standings: http://localhost:5000/standings")
    print("🎯 Match Entry: http://localhost:5000/match-entry")
    print("\nFeatures to try:")
    print("1. Add more players to groups")
    print("2. Generate fixtures")
    print("3. Enter match results")
    print("4. Watch real-time updates across multiple browser tabs")

if __name__ == "__main__":
    main()