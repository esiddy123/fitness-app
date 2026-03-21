// ============================================
// APP — Init, routing, service worker
// ============================================

const App = {
  currentPage: 'calendar',
  settings: null,
  mealData: null,
  exerciseData: null,

  async init() {
    // Initialize database
    await DB.init();

    // Load settings
    this.settings = await DB.getAllSettings();

    // Check if onboarded
    if (!this.settings.cycleStartDate) {
      this.showOnboarding();
      return;
    }

    // Load static data
    await this.loadData();

    // Set up navigation
    this.setupNav();

    // Show default page
    this.navigate('calendar');

    // Register service worker
    this.registerSW();
  },

  async loadData() {
    try {
      const [mealsRes, exercisesRes] = await Promise.all([
        fetch('data/meals.json'),
        fetch('data/exercises.json')
      ]);
      this.mealData = await mealsRes.json();
      this.exerciseData = await exercisesRes.json();
    } catch (e) {
      console.warn('Could not load data files:', e);
      this.mealData = { restaurants: [] };
      this.exerciseData = { muscleGroups: [] };
    }
  },

  setupNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.navigate(btn.dataset.page);
      });
    });
  },

  navigate(page) {
    this.currentPage = page;

    // Update nav active state
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Render page
    const content = document.getElementById('page-content');
    switch (page) {
      case 'calendar': Calendar.render(content); break;
      case 'meals':    Meals.render(content); break;
      case 'workout':  Workout.render(content); break;
      case 'logger':   Logger.render(content); break;
      case 'dashboard': Dashboard.render(content); break;
    }
  },

  showOnboarding() {
    const content = document.getElementById('page-content');
    document.getElementById('bottom-nav').classList.add('hidden');

    content.innerHTML = `
      <div class="onboarding">
        <h1>Carb Cycle Tracker</h1>
        <p>Let's get your cycle started. Pick the date you want to begin and which day type to start on.</p>
        <div class="form-group">
          <label>Start Date</label>
          <input type="date" id="ob-start-date" value="${CarbCycle.todayStr()}">
        </div>
        <div class="form-group">
          <label>Start Day Type</label>
          <select id="ob-start-day">
            <option value="low">Low Carb</option>
            <option value="med">Medium Carb</option>
            <option value="high">High Carb</option>
          </select>
        </div>
        <div class="form-group">
          <label>Current Weight (lbs)</label>
          <input type="number" id="ob-weight" value="175" step="0.5">
        </div>
        <button class="btn btn-primary" id="ob-start">Start My Cycle</button>
      </div>
    `;

    document.getElementById('ob-start').addEventListener('click', async () => {
      const startDate = document.getElementById('ob-start-date').value;
      const startDay = document.getElementById('ob-start-day').value;
      const weight = parseFloat(document.getElementById('ob-weight').value);

      if (!startDate) return;

      await DB.setSetting('cycleStartDate', startDate);
      await DB.setSetting('cycleStartDay', startDay);
      await DB.setSetting('weight', weight);

      this.settings = await DB.getAllSettings();
      document.getElementById('bottom-nav').classList.remove('hidden');
      await this.loadData();
      this.setupNav();
      this.navigate('calendar');
    });
  },

  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
        console.warn('SW registration failed:', err);
      });
    }
  },

  // Helper: get today's day type
  getTodayType() {
    return CarbCycle.getDayType(new Date(), this.settings.cycleStartDate, this.settings.cycleStartDay);
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
