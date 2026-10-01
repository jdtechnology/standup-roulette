/**
 * Standup Roulette - Application Orchestrator
 * Connects UI, storage, sound engine, confetti, and canvas roulette wheel.
 */

(function () {
  'use strict';

  // Core components
  let soundEngine;
  let confetti;
  let storage;
  let wheel;
  let currentTheme;
  let lastWinner = null;

  // DOM Elements
  const canvasEl = document.getElementById('roulette-canvas');
  const confettiCanvasEl = document.getElementById('confetti-canvas');
  const btnSpin = document.getElementById('btn-spin');
  const statusMsg = document.getElementById('status-message');
  const themeSelector = document.getElementById('theme-selector');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const soundText = document.getElementById('sound-text');

  // Roster DOM Elements
  const formAddMember = document.getElementById('form-add-member');
  const inputNewName = document.getElementById('input-new-name');
  const rosterListEl = document.getElementById('roster-list');
  const rosterCountEl = document.getElementById('roster-count');
  const btnResetStandup = document.getElementById('btn-reset-standup');
  const btnResetDefaults = document.getElementById('btn-reset-defaults');
  const btnBulkModal = document.getElementById('btn-bulk-modal');

  // Winner Modal Elements
  const winnerModal = document.getElementById('winner-modal');
  const winnerNameDisplay = document.getElementById('winner-name-display');
  const btnWinnerMarkSpoken = document.getElementById('btn-winner-mark-spoken');
  const btnWinnerSpinAgain = document.getElementById('btn-winner-spin-again');
  const btnWinnerDismiss = document.getElementById('btn-winner-dismiss');

  // Bulk Modal Elements
  const bulkModal = document.getElementById('bulk-modal');
  const bulkNamesInput = document.getElementById('bulk-names-input');
  const btnBulkSave = document.getElementById('btn-bulk-save');
  const btnBulkCancel = document.getElementById('btn-bulk-cancel');

  /**
   * Initializes all modules and event bindings
   */
  async function init() {
    // 1. Audio and visual effects
    soundEngine = new SoundEngine();
    confetti = new ConfettiCannon(confettiCanvasEl);

    // 2. Theme engine initialization
    initThemes();

    // 3. Wheel initialization
    wheel = new RouletteWheel(canvasEl, {
      soundEngine: soundEngine,
      theme: currentTheme
    });

    // 4. Data Storage
    storage = new StorageManager();
    await storage.loadParticipants();

    // 5. Update UI
    updateSoundButtonUI();
    updateRosterUI();
    updateWheelFromStorage();

    // 6. Bind Event Listeners
    setupEventListeners();
  }

  /**
   * Populates and sets up theme switcher
   */
  function initThemes() {
    const themesList = ThemeEngine.getThemesList();
    themeSelector.innerHTML = '';

    themesList.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      themeSelector.appendChild(opt);
    });

    // Load saved theme or vibrant default
    let savedThemeId = ThemeEngine.DEFAULT_THEME_ID;
    try {
      savedThemeId = localStorage.getItem('standup_roulette_theme') || ThemeEngine.DEFAULT_THEME_ID;
    } catch (e) {
      // ignore
    }

    setTheme(savedThemeId);

    themeSelector.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }

  /**
   * Applies the chosen theme to document and wheel
   */
  function setTheme(themeId) {
    currentTheme = ThemeEngine.getTheme(themeId);
    themeSelector.value = currentTheme.id;

    try {
      localStorage.setItem('standup_roulette_theme', currentTheme.id);
    } catch (e) {
      // ignore
    }

    ThemeEngine.applyThemeToDocument(currentTheme);
    if (wheel) {
      wheel.setTheme(currentTheme);
    }
  }

  /**
   * Updates audio toggle button text and icon
   */
  function updateSoundButtonUI() {
    const isMuted = soundEngine.isMuted();
    soundIcon.textContent = isMuted ? '🔇' : '🔊';
    soundText.textContent = isMuted ? 'Muted' : 'Sound ON';
    btnSoundToggle.title = isMuted ? 'Click to Unmute' : 'Click to Mute';
  }

  /**
   * Re-renders the roster sidebar list and participant badge
   */
  function updateRosterUI() {
    const participants = storage.getParticipants();
    const eligible = storage.getEligibleParticipants();
    const active = storage.getActiveParticipants();

    rosterCountEl.textContent = `${eligible.length} / ${active.length} To Spin`;

    rosterListEl.innerHTML = '';

    if (participants.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'roster-item';
      emptyItem.style.justifyContent = 'center';
      emptyItem.style.color = 'var(--text-muted)';
      emptyItem.textContent = 'No team members added.';
      rosterListEl.appendChild(emptyItem);
      return;
    }

    participants.forEach(p => {
      const item = document.createElement('div');
      item.className = 'roster-item';
      if (!p.active) item.classList.add('inactive');
      if (p.spoken) item.classList.add('spoken');

      // Left: PTO toggle + name + status tags
      const info = document.createElement('div');
      info.className = 'roster-item-info';

      const chkActive = document.createElement('input');
      chkActive.type = 'checkbox';
      chkActive.className = 'toggle-pto';
      chkActive.checked = p.active;
      chkActive.title = p.active ? 'Present (uncheck for PTO)' : 'Absent / On PTO';
      chkActive.addEventListener('change', () => {
        storage.toggleActive(p.id);
        updateRosterUI();
        updateWheelFromStorage();
      });

      const nameSpan = document.createElement('span');
      nameSpan.className = 'member-name';
      nameSpan.textContent = p.name;

      info.appendChild(chkActive);
      info.appendChild(nameSpan);

      if (p.spoken) {
        const spokenTag = document.createElement('span');
        spokenTag.className = 'member-status-tag tag-spoken';
        spokenTag.textContent = 'Spoke';
        info.appendChild(spokenTag);
      } else if (!p.active) {
        const ptoTag = document.createElement('span');
        ptoTag.className = 'member-status-tag tag-pto';
        ptoTag.textContent = 'PTO';
        info.appendChild(ptoTag);
      }

      // Right: delete button
      const actions = document.createElement('div');
      actions.className = 'roster-item-actions';

      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-icon';
      btnDelete.innerHTML = '✕';
      btnDelete.title = `Remove ${p.name}`;
      btnDelete.addEventListener('click', () => {
        storage.removeParticipant(p.id);
        updateRosterUI();
        updateWheelFromStorage();
      });

      actions.appendChild(btnDelete);

      item.appendChild(info);
      item.appendChild(actions);

      rosterListEl.appendChild(item);
    });
  }

  /**
   * Synchronizes wheel slices with eligible participants from storage
   */
  function updateWheelFromStorage() {
    const eligible = storage.getEligibleParticipants();
    wheel.setSlices(eligible);

    if (wheel.isSpinning) return;

    if (eligible.length === 0) {
      const allActive = storage.getActiveParticipants();
      if (allActive.length > 0) {
        statusMsg.textContent = '🎉 All active members have spoken today!';
      } else {
        statusMsg.textContent = 'Add participants to start spinning';
      }
      btnSpin.disabled = true;
    } else {
      statusMsg.textContent = `${eligible.length} participant${eligible.length === 1 ? '' : 's'} ready to roll`;
      btnSpin.disabled = false;
    }
  }

  /**
   * Executes the spin
   */
  function triggerSpin() {
    if (wheel.isSpinning) return;

    const eligible = storage.getEligibleParticipants();
    if (eligible.length === 0) return;

    btnSpin.disabled = true;
    statusMsg.textContent = 'Spinning... Who will take the floor?';

    // Fair random pick
    const winningIndex = Math.floor(Math.random() * eligible.length);
    const chosen = eligible[winningIndex];
    lastWinner = chosen;

    wheel.spin(winningIndex, (winner) => {
      onSpinFinished(winner);
    });
  }

  /**
   * Handler when ball lands and wheel stops
   */
  function onSpinFinished(winner) {
    if (!winner) return;

    soundEngine.playWinFanfare();
    confetti.burst(140);

    statusMsg.textContent = `🎯 ${winner.name} has the floor!`;
    winnerNameDisplay.textContent = winner.name;

    // Show winner modal
    openModal(winnerModal);
  }

  function openModal(modalEl) {
    modalEl.classList.add('open');
    modalEl.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  /**
   * Sets up UI event bindings
   */
  function setupEventListeners() {
    // Spin button click
    btnSpin.addEventListener('click', () => {
      triggerSpin();
    });

    // Spacebar keyboard shortcut
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        // Prevent triggering if typing in an input or textarea
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea') {
          return;
        }
        e.preventDefault();

        // If winner modal is open, Spacebar closes it and marks as spoken
        if (winnerModal.classList.contains('open')) {
          markWinnerSpokenAndClose();
          return;
        }

        triggerSpin();
      } else if (e.key === 'Escape') {
        if (winnerModal.classList.contains('open')) closeModal(winnerModal);
        if (bulkModal.classList.contains('open')) closeModal(bulkModal);
      }
    });

    // Audio mute toggle
    btnSoundToggle.addEventListener('click', () => {
      soundEngine.toggleMute();
      updateSoundButtonUI();
    });

    // Add member form submit
    formAddMember.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = inputNewName.value.trim();
      if (val) {
        storage.addParticipant(val);
        inputNewName.value = '';
        updateRosterUI();
        updateWheelFromStorage();
      }
    });

    // Reset meeting (clear spoken status)
    btnResetStandup.addEventListener('click', () => {
      storage.resetStandupSession();
      updateRosterUI();
      updateWheelFromStorage();
    });

    // Reset defaults
    btnResetDefaults.addEventListener('click', () => {
      if (confirm('Reset team roster back to default sample names?')) {
        storage.resetToDefaults();
        updateRosterUI();
        updateWheelFromStorage();
      }
    });

    // Bulk Edit modal open
    btnBulkModal.addEventListener('click', () => {
      const names = storage.getParticipants().map(p => p.name).join('\n');
      bulkNamesInput.value = names;
      openModal(bulkModal);
      bulkNamesInput.focus();
    });

    // Bulk Edit save
    btnBulkSave.addEventListener('click', () => {
      const text = bulkNamesInput.value;
      storage.bulkImport(text);
      closeModal(bulkModal);
      updateRosterUI();
      updateWheelFromStorage();
    });

    // Bulk Edit cancel
    btnBulkCancel.addEventListener('click', () => {
      closeModal(bulkModal);
    });

    // Winner Modal actions
    function markWinnerSpokenAndClose() {
      if (lastWinner) {
        storage.markSpoken(lastWinner.id, true);
        lastWinner = null;
      }
      closeModal(winnerModal);
      updateRosterUI();
      updateWheelFromStorage();
    }

    btnWinnerMarkSpoken.addEventListener('click', markWinnerSpokenAndClose);

    btnWinnerSpinAgain.addEventListener('click', () => {
      if (lastWinner) {
        storage.markSpoken(lastWinner.id, true);
        lastWinner = null;
      }
      closeModal(winnerModal);
      updateRosterUI();
      updateWheelFromStorage();

      // Trigger next spin if participants remain
      setTimeout(() => {
        triggerSpin();
      }, 300);
    });

    btnWinnerDismiss.addEventListener('click', () => {
      closeModal(winnerModal);
      updateRosterUI();
      updateWheelFromStorage();
    });
  }

  // Kickoff on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
