/**
 * Participant Storage & State Manager for Standup Roulette
 * Manages participant list, active/PTO status, spoken status, and localStorage sync.
 */

const STORAGE_KEY = 'standup_roulette_roster';

const FALLBACK_DEFAULT_NAMES = [
  'Alice',
  'Bob',
  'Charlie',
  'Dana',
  'Elena',
  'Frank',
  'Grace',
  'Henry'
];

class StorageManager {
  constructor(storageKey = STORAGE_KEY) {
    this.key = storageKey;
    this.participants = [];
  }

  generateId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  /**
   * Initializes participants from localStorage, or fetches data/default-names.json
   */
  async loadParticipants() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(this.key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.participants = parsed;
            return this.participants;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage', e);
    }

    // Attempt to load from data/default-names.json
    let names = FALLBACK_DEFAULT_NAMES;
    if (typeof fetch === 'function') {
      try {
        const res = await fetch('data/default-names.json');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            names = json;
          }
        }
      } catch (err) {
        // file:// or offline fallback
        names = FALLBACK_DEFAULT_NAMES;
      }
    }

    this.participants = names.map(name => ({
      id: this.generateId(),
      name: String(name).trim(),
      active: true,
      spoken: false
    }));

    this.saveParticipants();
    return this.participants;
  }

  getParticipants() {
    return this.participants;
  }

  /**
   * Returns participants who are active and not yet spoken in current meeting
   */
  getEligibleParticipants() {
    return this.participants.filter(p => p.active && !p.spoken);
  }

  /**
   * Returns all active participants (regardless of spoken status)
   */
  getActiveParticipants() {
    return this.participants.filter(p => p.active);
  }

  saveParticipants() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.key, JSON.stringify(this.participants));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  }

  addParticipant(name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const newPerson = {
      id: this.generateId(),
      name: trimmed,
      active: true,
      spoken: false
    };

    this.participants.push(newPerson);
    this.saveParticipants();
    return newPerson;
  }

  removeParticipant(id) {
    const index = this.participants.findIndex(p => p.id === id);
    if (index !== -1) {
      this.participants.splice(index, 1);
      this.saveParticipants();
      return true;
    }
    return false;
  }

  toggleActive(id) {
    const person = this.participants.find(p => p.id === id);
    if (person) {
      person.active = !person.active;
      this.saveParticipants();
      return person.active;
    }
    return null;
  }

  markSpoken(id, spoken = true) {
    const person = this.participants.find(p => p.id === id);
    if (person) {
      person.spoken = spoken;
      this.saveParticipants();
      return true;
    }
    return false;
  }

  /**
   * Resets spoken state for all participants to start a fresh standup session
   */
  resetStandupSession() {
    this.participants.forEach(p => {
      p.spoken = false;
    });
    this.saveParticipants();
  }

  /**
   * Restores roster to original default names
   */
  resetToDefaults(names = FALLBACK_DEFAULT_NAMES) {
    this.participants = names.map(name => ({
      id: this.generateId(),
      name: String(name).trim(),
      active: true,
      spoken: false
    }));
    this.saveParticipants();
    return this.participants;
  }

  /**
   * Imports a bulk list of names (one per line)
   */
  bulkImport(text) {
    if (!text || typeof text !== 'string') return this.participants;

    const rawLines = text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (rawLines.length === 0) return this.participants;

    // Preserve active/spoken state for existing matching names where possible
    const existingMap = new Map();
    this.participants.forEach(p => {
      existingMap.set(p.name.toLowerCase(), p);
    });

    this.participants = rawLines.map(name => {
      const match = existingMap.get(name.toLowerCase());
      if (match) {
        return {
          id: match.id,
          name: name,
          active: match.active,
          spoken: match.spoken
        };
      }
      return {
        id: this.generateId(),
        name: name,
        active: true,
        spoken: false
      };
    });

    this.saveParticipants();
    return this.participants;
  }
}

// Export for browser global & Node test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StorageManager, FALLBACK_DEFAULT_NAMES, STORAGE_KEY };
}
if (typeof window !== 'undefined') {
  window.StorageManager = StorageManager;
}
