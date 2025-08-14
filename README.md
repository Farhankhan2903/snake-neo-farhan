# Snake Neo — Powered by Farhan Khan 🐍⚡

A modern, polished take on the classic Snake game — built in **HTML5, CSS3, and JavaScript**, designed to run smoothly on both desktop and mobile.  
Includes themes, power-ups, achievements, local leaderboard, shop, and PWA (offline play).

## 🎮 Live Demo
Once deployed with GitHub Pages, play here:  
```
[https://farhankhan2903.github.io/snake-neo-farhan/]
```

## ✨ Features
- **Core Gameplay:** Smooth snake movement, food eating, growth, collision detection.
- **Themes & Skins:** Neon, Emerald, Sunset.
- **Power-Ups:** Slow-mo, Shrink, Shield.
- **Golden Fruit:** Bonus points & coins.
- **Achievements:** Unlockable with rewards.
- **Local Leaderboard:** Tracks top scores on your device.
- **Shop:** Buy skins with coins earned in-game.
- **Settings:** Difficulty, board size, wrap walls, vibration.
- **PWA Support:** Install to home screen & play offline.
- **Mobile Controls:** On-screen D-pad + swipe gestures.

## 🛠 Installation & Running Locally
1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/snake-neo-farhan.git
   cd snake-neo-farhan
   ```
2. **Run locally:**
   - Option 1: Open `index.html` directly in a browser (limited features without server).
   - Option 2 (recommended): Use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code:
     - Right-click `index.html` → "Open with Live Server".
     - Game will open in your browser.

## 🚀 Deploy to GitHub Pages
1. Go to **Settings** → **Pages** in your repository.
2. Under **Source**, select:
   - Branch: `main`
   - Folder: `/ (root)`
3. Click **Save**.
4. Wait 1–2 minutes — your game will be live at:
   ```
   https://YOUR_USERNAME.github.io/snake-neo-farhan/
   ```

## 🎯 Controls
**Desktop:**
- Arrow keys / WASD → Move
- P → Pause

**Mobile:**
- On-screen D-pad
- Swipe gestures

## 📂 Project Structure
```
.
├── index.html          # Main HTML file
├── styles.css          # Game styling & themes
├── main.js             # Game logic & features
├── manifest.json       # PWA manifest
├── service-worker.js   # Offline caching
└── assets/
    ├── eat.wav         # Eating sound
    ├── die.wav         # Death sound
    ├── icon-192.png    # PWA icon
    └── icon-512.png    # PWA icon
```

## 📝 Credits
- **Developer:** Farhan Khan
- Built with ❤️ using HTML5 Canvas & Vanilla JS.

## 📜 License
This project is licensed under the MIT License — feel free to use, modify, and share.
.
