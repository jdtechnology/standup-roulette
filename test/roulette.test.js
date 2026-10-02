const test = require('node:test');
const assert = require('node:assert/strict');

const ThemeEngine = require('../js/themes.js');
const { StorageManager, FALLBACK_DEFAULT_NAMES } = require('../js/storage.js');

test('ThemeEngine - themes and palette generation', async (t) => {
  await t.test('returns available themes with ids and names', () => {
    const list = ThemeEngine.getThemesList();
    assert.ok(list.length >= 4);
    const ids = list.map(t => t.id);
    assert.ok(ids.includes('vibrant'));
    assert.ok(ids.includes('classic'));
    assert.ok(ids.includes('neon'));
    assert.ok(ids.includes('ocean'));
  });

  await t.test('retrieves theme by ID or falls back to vibrant', () => {
    const vibrant = ThemeEngine.getTheme('vibrant');
    assert.equal(vibrant.id, 'vibrant');
    const unknown = ThemeEngine.getTheme('non-existent');
    assert.equal(unknown.id, 'vibrant');
  });

  await t.test('classic theme alternates red and black and uses green for odd tail', () => {
    const classic = ThemeEngine.getTheme('classic');
    const c0 = ThemeEngine.getSliceColor(classic, 0, 4);
    const c1 = ThemeEngine.getSliceColor(classic, 1, 4);
    assert.equal(c0, '#b71234');
    assert.equal(c1, '#1a1a1a');

    // Odd count, last slice should be green pocket
    const oddTail = ThemeEngine.getSliceColor(classic, 4, 5);
    assert.equal(oddTail, '#0f8a43');
  });

  await t.test('vibrant theme provides distinct colors for slices', () => {
    const vibrant = ThemeEngine.getTheme('vibrant');
    const colors = [];
    for (let i = 0; i < 8; i++) {
      colors.push(ThemeEngine.getSliceColor(vibrant, i, 8));
    }
    // Slices next to each other should not be equal
    for (let i = 0; i < colors.length - 1; i++) {
      assert.notEqual(colors[i], colors[i + 1]);
    }
  });
});

test('StorageManager - participant management and standup flow', async (t) => {
  // Mock localStorage for test environment
  const mockStore = {};
  global.localStorage = {
    getItem: (key) => mockStore[key] || null,
    setItem: (key, val) => { mockStore[key] = String(val); },
    removeItem: (key) => { delete mockStore[key]; },
    clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
  };

  await t.test('loads fallback defaults when empty', async () => {
    global.localStorage.clear();
    const storage = new StorageManager('test_roster');
    const list = await storage.loadParticipants();
    assert.equal(list.length, FALLBACK_DEFAULT_NAMES.length);
    assert.equal(list[0].name, 'Alice');
    assert.equal(list[0].active, true);
    assert.equal(list[0].spoken, false);
  });

  await t.test('adds and removes participants', async () => {
    const storage = new StorageManager('test_roster');
    await storage.loadParticipants();
    const initialCount = storage.getParticipants().length;

    const newPerson = storage.addParticipant('Zoe');
    assert.ok(newPerson);
    assert.equal(newPerson.name, 'Zoe');
    assert.equal(storage.getParticipants().length, initialCount + 1);

    const removed = storage.removeParticipant(newPerson.id);
    assert.equal(removed, true);
    assert.equal(storage.getParticipants().length, initialCount);
  });

  await t.test('toggles active (PTO) and marks spoken', async () => {
    const storage = new StorageManager('test_roster');
    await storage.loadParticipants();

    const first = storage.getParticipants()[0];
    const initialEligible = storage.getEligibleParticipants().length;

    // Mark as spoken
    storage.markSpoken(first.id, true);
    assert.equal(first.spoken, true);
    assert.equal(storage.getEligibleParticipants().length, initialEligible - 1);

    // Toggle PTO
    const second = storage.getParticipants()[1];
    storage.toggleActive(second.id);
    assert.equal(second.active, false);
    assert.equal(storage.getEligibleParticipants().length, initialEligible - 2);

    // Reset standup session keeps PTO but clears spoken
    storage.resetStandupSession();
    assert.equal(first.spoken, false);
    assert.equal(second.active, false); // still on PTO
    assert.equal(storage.getEligibleParticipants().length, initialEligible - 1);
  });

  await t.test('bulk imports list preserving status where appropriate', async () => {
    const storage = new StorageManager('test_roster');
    await storage.loadParticipants();

    const text = 'Alice\nZoe\nKen\n';
    storage.bulkImport(text);
    const updated = storage.getParticipants();
    assert.equal(updated.length, 3);
    assert.equal(updated[0].name, 'Alice');
    assert.equal(updated[1].name, 'Zoe');
    assert.equal(updated[2].name, 'Ken');
  });

  await t.test('resets to defaults cleanly', async () => {
    const storage = new StorageManager('test_roster');
    storage.resetToDefaults();
    const list = storage.getParticipants();
    assert.equal(list.length, FALLBACK_DEFAULT_NAMES.length);
    assert.equal(list[0].name, 'Alice');
  });
});

test('RouletteWheel - ball lands in the winning slice', () => {
  const noop = () => {};
  const ctx = new Proxy({}, {
    get: (_, prop) => (prop.startsWith('create') ? () => ({ addColorStop: noop }) : noop),
    set: () => true
  });
  global.window = { addEventListener: noop, removeEventListener: noop, devicePixelRatio: 1 };
  global.requestAnimationFrame = noop;
  const RouletteWheel = require('../js/roulette.js');
  const canvas = { getContext: () => ctx, getBoundingClientRect: () => ({ width: 600, height: 600 }) };

  const slices = Array.from({ length: 7 }, (_, i) => ({ id: i, name: `P${i}` }));
  const sliceAngle = (Math.PI * 2) / slices.length;

  for (let trial = 0; trial < 200; trial++) {
    const wheel = new RouletteWheel(canvas);
    wheel.setSlices(slices);
    wheel.wheelAngle = Math.random() * 100;
    const winningIndex = trial % slices.length;
    let announced = null;
    wheel.spin(winningIndex, w => { announced = w; });
    wheel.animate(wheel.spinStartTime + wheel.spinDuration);

    const rel = (((wheel.ballAngle - wheel.wheelAngle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    assert.equal(Math.floor(rel / sliceAngle), winningIndex);
    assert.equal(announced, slices[winningIndex]);
  }
});
