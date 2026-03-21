// ============================================
// INDEXEDDB WRAPPER
// All persistence flows through this module
// ============================================

const DB = {
  name: 'CarbCycleFitness',
  version: 1,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Settings store (key-value)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }

        // Food logs
        if (!db.objectStoreNames.contains('foodLogs')) {
          const store = db.createObjectStore('foodLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
        }

        // Workout logs
        if (!db.objectStoreNames.contains('workoutLogs')) {
          const store = db.createObjectStore('workoutLogs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
        }

        // Body measurements
        if (!db.objectStoreNames.contains('measurements')) {
          const store = db.createObjectStore('measurements', { keyPath: 'date' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  },

  // ---- Settings ----
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readonly');
      const req = tx.objectStore('settings').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async setSetting(key, value) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllSettings() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const result = {};
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          result[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Food Logs ----
  async addFoodLog(entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('foodLogs', 'readwrite');
      const req = tx.objectStore('foodLogs').add(entry);
      req.onsuccess = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getFoodLogsByDate(date) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('foodLogs', 'readonly');
      const index = tx.objectStore('foodLogs').index('date');
      const req = index.getAll(date);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async deleteFoodLog(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('foodLogs', 'readwrite');
      tx.objectStore('foodLogs').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // ---- Workout Logs ----
  async addWorkoutLog(entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('workoutLogs', 'readwrite');
      const req = tx.objectStore('workoutLogs').add(entry);
      req.onsuccess = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  async getWorkoutLogByDate(date) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('workoutLogs', 'readonly');
      const index = tx.objectStore('workoutLogs').index('date');
      const req = index.getAll(date);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Measurements ----
  async addMeasurement(entry) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('measurements', 'readwrite');
      tx.objectStore('measurements').put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllMeasurements() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('measurements', 'readonly');
      const req = tx.objectStore('measurements').getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  // ---- Utility ----
  async getFoodLogsForWeek(endDate) {
    const dates = [];
    const d = new Date(endDate + 'T00:00:00');
    for (let i = 6; i >= 0; i--) {
      const day = new Date(d);
      day.setDate(d.getDate() - i);
      dates.push(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`);
    }
    const results = {};
    for (const date of dates) {
      results[date] = await this.getFoodLogsByDate(date);
    }
    return results;
  }
};
