# 🎰 Standup Roulette

A visually spectacular, zero-dependency Vegas-style roulette wheel web application designed to choose team members at random for daily standup meetings.

Hosted directly via **GitHub Pages** with no build steps or external dependencies.

---

## ✨ Features

- **🎰 Vegas-Style Roulette Wheel & Ball Physics**:
  - High-DPI Canvas rendering crisp on Retina / 4K displays.
  - Polished mahogany wood rim, brass rivets, 8 chrome deflectors, and authentic center turret with crossbars.
  - Authentic physics: Wheel spins smoothly with cubic deceleration while the silver ball orbits the outer track in the opposite direction, slows down, bounces dynamically across pocket fret dividers, and settles into the winning pocket.
- **🎨 Pluggable Theme Engine**:
  - **Vibrant Vegas** (Default): Bright, lively multi-color palette with gold trim.
  - **Classic Casino**: Traditional roulette red & black pockets with green zero accents and gold dividers.
  - **Neon Cyberpunk**: Glowing synthwave magenta, cyan, and laser violet palette.
  - **Ocean Breeze**: Deep oceanic blues, aquas, and seafoam serenity.
- **🔊 Zero-Asset Web Audio API**:
  - Real-time synthesized casino sounds without downloading external audio files:
    - Wheel spinning whir.
    - Ball clattering / ticking against pocket dividers (frequency scales with ball speed).
    - Upbeat winning fanfare.
  - Dedicated sound mute toggle with persistence in `localStorage`.
- **🎉 Winner Celebration**:
  - Custom canvas confetti cannon particle burst upon landing on the winning name.
  - Winner announcement modal with quick actions.
- **👥 Team & Standup Session Management**:
  - Initial team seeded in [`data/default-names.json`](./data/default-names.json).
  - Browser modifications automatically persisted in `localStorage`.
  - **Active / PTO Toggle**: Mark team members who are absent or on PTO without deleting them from the roster.
  - **Spoken Status Tracking**: Selected participants are marked as "Spoken" and excluded from remaining spins in the current meeting.
  - **Reset Today's Standup**: Clear spoken statuses with one click to prepare for the next standup meeting.
  - **Bulk Edit**: Paste your entire team roster at once (one name per line).
  - **Reset to Defaults**: Restore initial team configuration at any time.
- **⌨️ Keyboard Shortcuts**:
  - Press `Space` to spin the wheel or advance past the winner modal.
  - Press `Esc` to close any modal.

---

## 🚀 Running Locally

Because Standup Roulette uses pure HTML5, CSS3, and modern vanilla JavaScript, no build process is required:

### Option 1: Python HTTP Server (Recommended)
```bash
python3 -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

### Option 2: Node.js / npx
```bash
npx serve .
```

### Option 3: Direct File
You can also open `index.html` directly in modern web browsers (fallback defaults load automatically if `fetch` is restricted in your browser's `file://` sandbox).

---

## 🌐 Deploying to GitHub Pages

1. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Add Standup Roulette application"
   git push origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
   - Select `main` branch and `/ (root)` folder.
   - Click **Save**.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🧪 Running Automated Tests

Run the built-in test suite verifying storage operations, standup session rules, and theme engines:

```bash
node --test test/roulette.test.js
```

---

## 📁 Project Structure

```
standup-roulete/
├── css/
│   └── style.css            # Casino felt styling, glowing accents, and responsive layout
├── data/
│   └── default-names.json   # Default repository sample team roster
├── js/
│   ├── app.js               # Application coordinator and DOM event handling
│   ├── audio.js             # Web Audio API sound synthesizer (spin hum, ball ticks, fanfare)
│   ├── confetti.js          # Particle physics celebration confetti engine
│   ├── roulette.js          # High-DPI canvas roulette wheel & ball physics engine
│   ├── storage.js           # LocalStorage state management (PTO, spoken, bulk roster)
│   └── themes.js            # Modular color schemes (Vibrant, Classic, Neon, Ocean)
├── test/
│   └── roulette.test.js     # Node.js automated test suite
├── index.html               # Semantic HTML5 single page app
└── README.md                # Project documentation
```
