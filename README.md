# Table Tennis Tournament Manager

A modern, responsive web application for managing table tennis tournaments with hybrid league + knockout format. Built as a static website that can be hosted on Render or any static hosting service.

## 🏆 Features

### Tournament Management
- **Hybrid Format**: League stage followed by knockout stage
- **Multiple Groups**: Support for groups A, B, C, D with configurable sizes
- **Automatic Fixture Generation**: Round-robin scheduling using circle method
- **Real-time Updates**: Simulated WebSocket updates across all devices
- **Mobile Responsive**: Professional design optimized for smartphones

### 📊 League Stage
- **Round-robin format**: Every player plays every other player once
- **Points System**: Win = 2 points, Loss = 0 points
- **Comprehensive Statistics**: Matches played, wins, losses, sets, points difference
- **Tie-breakers**: Points → Set Difference → Points Difference → Head-to-Head
- **Live Standings**: Dynamic rankings with movement indicators

### 🎮 Match Management
- **Result Entry**: Professional interface for entering match results
- **Set-by-set Scoring**: Support for best-of-5 sets format
- **Score Validation**: Real-time validation of set scores
- **Match Preview**: Live preview of match results
- **Recent Results**: Display of recently completed matches

### 📈 Advanced Analytics
- **Qualification Predictions**: AI-powered qualification probability calculations
- **Ranking Gap Analysis**: Displays gaps between players
- **Performance Charts**: Visual statistics using Chart.js
- **Movement Indicators**: Shows ranking movements (↑/↓)
- **Connection Status**: Real-time connection indicator

### 🎨 Professional UI/UX
- **Modern Design**: Gradient backgrounds, card shadows, animations
- **Dark Mode**: Toggle between light and dark themes
- **Loading States**: Professional loading spinners and skeletons
- **Toast Notifications**: Beautiful notification system
- **Mobile-First**: Optimized for smartphone screens

## 🚀 Technology Stack

### Frontend
- **HTML5, CSS3, JavaScript** (Vanilla JS - no frameworks)
- **Tailwind CSS** for responsive styling
- **Chart.js** for data visualization
- **Font Awesome** for icons
- **Google Fonts** (Inter) for typography

### Backend & Data
- **RESTful Table API** for data persistence
- **No Database Required** - uses built-in table storage
- **Static Hosting Compatible** - works on Render, Netlify, Vercel
- **Real-time Simulation** - WebSocket-like behavior without server

## 📦 Installation & Deployment

### 🚀 One-Click Deploy to Render
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/username/table-tennis-tournament-manager)

**Click the button above for instant deployment to Render!**

### Manual Deploy to Render
1. **Fork this repository** or create a new GitHub repository with these files
2. **Go to [Render](https://render.com)** and create a new Static Site
3. **Connect your GitHub repository**
4. **Set the following settings:**
   - Build Command: `echo "Static site - no build needed"`
   - Publish Directory: `./`
   - Environment: None required
5. **Click Deploy** - your tournament manager will be live in seconds!

### 🔧 Render Configuration Files Included
- `Procfile` - Render compatibility file
- `package.json` - Node.js configuration
- `DEPLOY.md` - Detailed deployment guide
- `RENDER_DEPLOY.md` - Render-specific instructions

### Alternative Hosting Options

#### Netlify
1. **Go to [Netlify](https://netlify.com)**
2. **Drag and drop** the project folder
3. **Click Deploy** - instant deployment!

#### Vercel
1. **Go to [Vercel](https://vercel.com)**
2. **Import from GitHub**
3. **Leave default settings** (no build needed)
4. **Deploy**

#### GitHub Pages
1. **Create a new GitHub repository**
2. **Upload all files**
3. **Go to Settings > Pages**
4. **Select source: Deploy from a branch**
5. **Choose main branch and root directory**
6. **Save and your site will be live at `username.github.io/repository-name`**

### Local Development
1. **Clone the repository**
2. **No build process required** - it's pure HTML/CSS/JS
3. **Open `index.html` in a browser** or use a local server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js (install http-server globally first)
   npx http-server
   ```
4. **Visit `http://localhost:8000`**

## 🎯 Usage Guide

### 1. Getting Started
- **Open the application** in your browser
- **Check the connection status** (green dot = connected)
- **Navigate using the tabs** at the top

### 2. Setting Up a Tournament
1. **Go to Fixtures tab**
2. **Add players** to groups (A, B, C, D)
3. **Click "Generate Fixtures"** to create the schedule
4. **View the fixtures** by group and round

### 3. Entering Match Results
1. **Go to Matches tab**
2. **Select a group** from the dropdown
3. **Choose a match** from the available matches
4. **Enter set scores** (best of 5 sets)
5. **Click "Submit Result"**

### 4. Viewing Standings
1. **Go to Standings tab**
2. **View live points table** for each group
3. **Check qualification predictions** at the top
4. **See movement indicators** showing ranking changes

### 5. Monitoring Progress
1. **Dashboard shows** real-time statistics
2. **Charts display** group statistics and match progress
3. **Recent activity** shows latest match completions

## 📱 Mobile Experience

The application is fully optimized for mobile devices:

- **Responsive navigation** that collapses on small screens
- **Touch-friendly buttons** and form inputs
- **Swipe gestures** for tab navigation
- **Optimized layouts** for vertical viewing
- **Large, readable text** and buttons
- **Professional animations** and transitions

## 🎨 Customization

### Colors and Themes
The application uses CSS custom properties for easy theming:

```css
/* Modify these variables in the HTML <style> section */
.gradient-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Group colors */
.group-a { border-left-color: #3B82F6; }
.group-b { border-left-color: #10B981; }
.group-c { border-left-color: #F59E0B; }
.group-d { border-left-color: #EF4444; }
```

### Tournament Settings
Modify these values in `js/tournament.js`:

```javascript
this.pointsPerWin = 2;        // Points for a win
this.pointsPerLoss = 0;       // Points for a loss
this.setsPerMatch = 5;        // Best of 5 sets
this.setsToWin = 3;           // Sets needed to win
this.qualificationSpots = 2;  // Top 2 qualify from each group
```

## 📊 Data Models

### Players
```javascript
{
  id: "player_1",
  name: "John Smith",
  group_id: "A",
  created_at: "2024-03-09T10:00:00Z",
  updated_at: "2024-03-09T10:00:00Z"
}
```

### Matches
```javascript
{
  id: "match_1",
  player1_id: "player_1",
  player2_id: "player_2",
  group_id: "A",
  stage: "league",
  round_number: 1,
  status: "pending", // or "completed"
  winner_id: "player_1",
  created_at: "2024-03-09T10:00:00Z",
  updated_at: "2024-03-09T10:00:00Z"
}
```

### Standings
```javascript
{
  id: "standing_1",
  player_id: "player_1",
  group_id: "A",
  matches_played: 3,
  wins: 2,
  losses: 1,
  sets_won: 6,
  sets_lost: 3,
  points_for: 126,
  points_against: 108,
  ranking_points: 4,
  created_at: "2024-03-09T10:00:00Z",
  updated_at: "2024-03-09T10:00:00Z"
}
```

## 🔧 API Endpoints

The application uses the RESTful Table API:

### Players
- `GET tables/players` - List all players
- `POST tables/players` - Create new player
- `DELETE tables/players/{id}` - Delete player

### Matches
- `GET tables/matches` - List all matches
- `GET tables/matches?group_id=A&status=pending` - Filter matches
- `POST tables/matches` - Create new match
- `PUT tables/matches/{id}` - Update match

### Standings
- `GET tables/standings` - List all standings
- `PUT tables/standings/{id}` - Update standing

## 🎮 Demo Data

The application comes pre-loaded with demo data:

**Group A**: John Smith, Sarah Johnson, Mike Chen, Emma Davis
**Group B**: David Wilson, Lisa Brown, Tom Garcia, Anna Martinez

You can immediately:
1. Generate fixtures
2. Enter match results
3. View standings and qualification predictions

## 🚀 Performance

The application is optimized for:
- **50+ players** per tournament
- **Multiple groups** (A, B, C, D)
- **Hundreds of matches** with real-time updates
- **Cross-device synchronization** via simulated WebSockets
- **Mobile-first** responsive design

## 🛠️ Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📄 License

This project is licensed under the MIT License - feel free to use it for personal or commercial purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple devices
5. Submit a pull request

## 🆘 Support

For support:
1. Check this README for common issues
2. Review the browser console for error messages
3. Ensure your hosting service supports static files
4. Test with the demo data first

---

**Ready to host your table tennis tournament?** This application is production-ready and can be deployed to Render in under 2 minutes!