// ============================================
// SANITIZATION — prevent XSS in innerHTML
// ============================================

function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// CARB CYCLE ENGINE
// Pure date math — no stored state needed
// ============================================

const CarbCycle = {
  DAYS: ['low', 'med', 'high'],

  TARGETS: {
    protein: 175,
    fat: 65,
    low:  { carbs: 50,  calories: 1485 },
    med:  { carbs: 150, calories: 1885 },
    high: { carbs: 275, calories: 2385 }
  },

  /**
   * Get the carb day type for a given date.
   * @param {Date} date - The date to check
   * @param {string} startDate - Cycle start date (YYYY-MM-DD)
   * @param {string} startDay - What day type the cycle started on ('low', 'med', 'high')
   * @returns {'low' | 'med' | 'high'}
   */
  getDayType(date, startDate, startDay = 'low') {
    const start = new Date(startDate + 'T00:00:00');
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const startIndex = this.DAYS.indexOf(startDay);
    // Handle negative days (dates before cycle start) correctly
    const index = ((diffDays % 3) + 3 + startIndex) % 3;
    return this.DAYS[index];
  },

  /**
   * Get macro targets for a given day type.
   * @param {'low' | 'med' | 'high'} dayType
   * @returns {{ protein: number, carbs: number, fat: number, calories: number }}
   */
  getMacros(dayType) {
    const dayTargets = this.TARGETS[dayType];
    return {
      protein: this.TARGETS.protein,
      carbs: dayTargets.carbs,
      fat: this.TARGETS.fat,
      calories: dayTargets.calories
    };
  },

  /**
   * Get display label for day type.
   */
  getLabel(dayType) {
    const labels = { low: 'Low Carb', med: 'Medium Carb', high: 'High Carb' };
    return labels[dayType] || dayType;
  },

  /**
   * Get today's date as YYYY-MM-DD.
   */
  todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * Get the recommended workout intensity for a day type.
   */
  getWorkoutIntensity(dayType) {
    const map = {
      high: { level: 'Heavy', groups: ['Legs', 'Back'], description: 'Heavy compounds — squats, deadlifts, rows. Fuel those big lifts.' },
      med:  { level: 'Moderate', groups: ['Chest', 'Shoulders'], description: 'Moderate intensity — bench press, overhead press, accessory work.' },
      low:  { level: 'Light / Rest', groups: ['Arms', 'Core'], description: 'Light isolation work or rest day. Low fuel = low intensity.' }
    };
    return map[dayType];
  }
};
