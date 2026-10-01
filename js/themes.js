/**
 * Theme Engine for Standup Roulette
 * Supports modular themes for wheel colors, text styling, and casino table background.
 */

const THEMES = {
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant Vegas',
    description: 'Dynamic multi-color palette with gold casino trim',
    palette: [
      '#e63946', // Crimson Coral
      '#f4a261', // Warm Sandy Amber
      '#2a9d8f', // Persian Green
      '#7209b7', // Royal Violet
      '#e76f51', // Burnt Sienna
      '#457b9d', // Steel Blue
      '#f72585', // Neon Pink
      '#3a86ff', // Electric Blue
      '#10b981', // Emerald
      '#f59e0b', // Golden Sun
      '#8b5cf6', // Bright Purple
      '#06b6d4', // Vivid Cyan
    ],
    tableBg: 'radial-gradient(ellipse at center, #1b4d2e 0%, #0d2818 70%, #05140b 100%)',
    tableBorder: '#b38728',
    rimColorOuter: '#2b1408',
    rimColorInner: '#4a2511',
    brassAccent: '#f5c518',
    turretColor: '#d4af37',
    fretColor: '#f3c64c',
    textColor: '#ffffff',
    textShadow: 'rgba(0, 0, 0, 0.8)',
    ballColor: '#f8f9fa',
    ballShadow: 'rgba(255, 255, 255, 0.8)'
  },
  classic: {
    id: 'classic',
    name: 'Classic Casino',
    description: 'Traditional roulette red and black with emerald and gold',
    palette: ['#b71234', '#1a1a1a'], // Alternating red & black
    tableBg: 'radial-gradient(ellipse at center, #1e4d2b 0%, #0d2d17 75%, #05170b 100%)',
    tableBorder: '#d4af37',
    rimColorOuter: '#261108',
    rimColorInner: '#3d1b0d',
    brassAccent: '#f1c40f',
    turretColor: '#d4af37',
    fretColor: '#d4af37',
    textColor: '#ffffff',
    textShadow: 'rgba(0, 0, 0, 0.9)',
    ballColor: '#ffffff',
    ballShadow: 'rgba(255, 255, 255, 0.9)'
  },
  neon: {
    id: 'neon',
    name: 'Neon Cyberpunk',
    description: 'Electrifying neon hues with dark synthwave accents',
    palette: [
      '#ff007f', // Cyber Pink
      '#00f0ff', // Cyan Glow
      '#7928ca', // Neon Purple
      '#00ff66', // Matrix Green
      '#ffe600', // Laser Yellow
      '#ff5500', // Blaze Orange
      '#9d00ff', // Deep Neon Violet
      '#00b4d8'  // Deep Electric Cyan
    ],
    tableBg: 'radial-gradient(ellipse at center, #1a0b2e 0%, #0d0417 70%, #05010a 100%)',
    tableBorder: '#00f0ff',
    rimColorOuter: '#120726',
    rimColorInner: '#240f47',
    brassAccent: '#ff007f',
    turretColor: '#00f0ff',
    fretColor: '#00f0ff',
    textColor: '#ffffff',
    textShadow: '0 0 8px rgba(0, 240, 255, 0.8)',
    ballColor: '#ffffff',
    ballShadow: 'rgba(0, 240, 255, 0.9)'
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Deep oceanic blues, aquas, and seafoam serenity',
    palette: [
      '#0077b6',
      '#0096c7',
      '#00b4d8',
      '#48cae4',
      '#023e8a',
      '#03045e',
      '#1a759f',
      '#168aad'
    ],
    tableBg: 'radial-gradient(ellipse at center, #0a2540 0%, #061626 70%, #020810 100%)',
    tableBorder: '#48cae4',
    rimColorOuter: '#041527',
    rimColorInner: '#0b294a',
    brassAccent: '#48cae4',
    turretColor: '#90e0ef',
    fretColor: '#caf0f8',
    textColor: '#ffffff',
    textShadow: 'rgba(0, 0, 0, 0.75)',
    ballColor: '#ffffff',
    ballShadow: 'rgba(72, 202, 228, 0.8)'
  }
};

const DEFAULT_THEME_ID = 'vibrant';

/**
 * Returns available themes list for UI selectors
 */
function getThemesList() {
  return Object.values(THEMES).map(t => ({
    id: t.id,
    name: t.name,
    description: t.description
  }));
}

/**
 * Get theme by ID (defaults to 'vibrant')
 */
function getTheme(themeId) {
  return THEMES[themeId] || THEMES[DEFAULT_THEME_ID];
}

/**
 * Calculates slice background color for index among total slices
 */
function getSliceColor(theme, index, total) {
  if (!theme || !theme.palette || theme.palette.length === 0) {
    return '#e63946';
  }

  // Classic roulette alternating red & black
  if (theme.id === 'classic') {
    if (total % 2 !== 0 && index === total - 1) {
      // For odd counts in classic, the last pocket is green (like 0 in roulette!)
      return '#0f8a43';
    }
    return theme.palette[index % 2];
  }

  // Ensure adjacent colors in cyclical palette don't clash at wrap-around if count is a multiple
  const pLen = theme.palette.length;
  if (total > 1 && index === total - 1 && (index % pLen) === 0) {
    return theme.palette[1 % pLen];
  }

  return theme.palette[index % pLen];
}

/**
 * Apply theme styles to HTML document
 */
function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--table-bg', theme.tableBg);
  root.style.setProperty('--table-border', theme.tableBorder);
  root.style.setProperty('--accent-glow', theme.brassAccent);
  root.style.setProperty('--fret-color', theme.fretColor);
  root.style.setProperty('--turret-color', theme.turretColor);
}

// Export for browser global & Node test runner
const ThemeEngine = {
  THEMES,
  DEFAULT_THEME_ID,
  getThemesList,
  getTheme,
  getSliceColor,
  applyThemeToDocument
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeEngine;
}
if (typeof window !== 'undefined') {
  window.ThemeEngine = ThemeEngine;
}
