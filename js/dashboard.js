// ============================================
// DASHBOARD — Daily progress + weekly overview
// ============================================

const Dashboard = {
  async render(container) {
    const todayStr = CarbCycle.todayStr();
    const dayType = App.getTodayType();
    const targets = CarbCycle.getMacros(dayType);
    const todayLogs = await DB.getFoodLogsByDate(todayStr);
    const weekLogs = await DB.getFoodLogsForWeek(todayStr);
    const workoutLogs = await DB.getWorkoutLogByDate(todayStr);
    const measurements = await DB.getAllMeasurements();

    // Today's totals
    const totals = todayLogs.reduce((acc, l) => ({
      protein: acc.protein + (l.protein || 0),
      carbs: acc.carbs + (l.carbs || 0),
      fat: acc.fat + (l.fat || 0),
      calories: acc.calories + (l.calories || 0)
    }), { protein: 0, carbs: 0, fat: 0, calories: 0 });

    const workedOut = workoutLogs.length > 0;
    const latestWeight = measurements.length > 0 ? measurements[measurements.length - 1].weight : (App.settings.weight || 175);

    container.innerHTML = `
      <div class="page-header">
        <h1>Dashboard</h1>
        <div class="subtitle">${CarbCycle.getLabel(dayType)} Day · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">${totals.calories}</div>
          <div class="stat-label">Calories</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${targets.calories - totals.calories}</div>
          <div class="stat-label">Remaining</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="color: ${workedOut ? 'var(--success)' : 'var(--text-muted)'}">${workedOut ? 'Done' : 'Not Yet'}</div>
          <div class="stat-label">Workout</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${latestWeight}</div>
          <div class="stat-label">Weight (lbs)</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-12">Today's Macros</div>
        <div class="macro-bars">
          ${this.macroBar('Protein', totals.protein, targets.protein, 'protein')}
          ${this.macroBar('Carbs', totals.carbs, targets.carbs, 'carbs')}
          ${this.macroBar('Fat', totals.fat, targets.fat, 'fat')}
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-12">This Week's Calories</div>
        <div class="weekly-chart">
          ${this.renderWeeklyChart(weekLogs)}
        </div>
      </div>

      <div class="card">
        <div class="card-title mb-12">Log Weight</div>
        <div style="display:flex;gap:8px;">
          <input type="number" id="weight-input" value="${latestWeight}" step="0.5" style="flex:1;padding:10px;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:15px;">
          <button class="btn btn-primary" id="log-weight-btn" style="width:auto;padding:10px 20px;">Save</button>
        </div>
        ${measurements.length > 1 ? `
          <div style="margin-top:12px;font-size:13px;color:var(--text-muted);">
            Started: ${measurements[0].weight} lbs · Current: ${measurements[measurements.length - 1].weight} lbs ·
            <span style="color: ${measurements[measurements.length - 1].weight <= measurements[0].weight ? 'var(--success)' : 'var(--danger)'}">
              ${(measurements[measurements.length - 1].weight - measurements[0].weight).toFixed(1)} lbs
            </span>
          </div>
        ` : ''}
      </div>

      <div class="card">
        <div class="card-title mb-12">Settings</div>
        <div class="form-group">
          <label>Cycle Start Date</label>
          <input type="date" id="setting-start-date" value="${App.settings.cycleStartDate}">
        </div>
        <div class="form-group">
          <label>Start Day Type</label>
          <select id="setting-start-day">
            <option value="low" ${App.settings.cycleStartDay === 'low' ? 'selected' : ''}>Low Carb</option>
            <option value="med" ${App.settings.cycleStartDay === 'med' ? 'selected' : ''}>Medium Carb</option>
            <option value="high" ${App.settings.cycleStartDay === 'high' ? 'selected' : ''}>High Carb</option>
          </select>
        </div>
        <button class="btn btn-primary mb-16" id="save-settings-btn">Save Settings</button>
        <button class="btn" id="export-btn" style="background:var(--bg-input);">Export All Data (JSON)</button>
      </div>
    `;

    // Log weight
    document.getElementById('log-weight-btn').addEventListener('click', async () => {
      const weight = parseFloat(document.getElementById('weight-input').value);
      if (!weight) return;
      await DB.addMeasurement({ date: todayStr, weight });
      await DB.setSetting('weight', weight);
      App.settings.weight = weight;
      this.render(container);
    });

    // Save settings
    document.getElementById('save-settings-btn').addEventListener('click', async () => {
      const startDate = document.getElementById('setting-start-date').value;
      const startDay = document.getElementById('setting-start-day').value;
      await DB.setSetting('cycleStartDate', startDate);
      await DB.setSetting('cycleStartDay', startDay);
      App.settings.cycleStartDate = startDate;
      App.settings.cycleStartDay = startDay;
      this.render(container);
    });

    // Export
    document.getElementById('export-btn').addEventListener('click', async () => {
      const data = {
        settings: await DB.getAllSettings(),
        foodLogs: [],
        workoutLogs: [],
        measurements: await DB.getAllMeasurements()
      };
      // Get all food logs (last 90 days)
      const d = new Date();
      for (let i = 0; i < 90; i++) {
        const date = new Date(d);
        date.setDate(d.getDate() - i);
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const logs = await DB.getFoodLogsByDate(dateStr);
        data.foodLogs.push(...logs);
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carb-cycle-export-${todayStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },

  macroBar(label, current, target, cls) {
    const pct = Math.min(100, Math.round((current / target) * 100));
    const over = current > target;
    return `
      <div class="macro-row">
        <div class="macro-label">${label}</div>
        <div class="macro-bar-track">
          <div class="macro-bar-fill ${cls}" style="width: ${pct}%; ${over ? 'background: var(--danger)' : ''}"></div>
        </div>
        <div class="macro-value">${current}/${target}g</div>
      </div>
    `;
  },

  renderWeeklyChart(weekLogs) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dates = Object.keys(weekLogs).sort();
    let maxCal = 1;
    const bars = dates.map(date => {
      const logs = weekLogs[date];
      const cals = logs.reduce((sum, l) => sum + (l.calories || 0), 0);
      if (cals > maxCal) maxCal = cals;
      const d = new Date(date + 'T00:00:00');
      const dayType = CarbCycle.getDayType(d, App.settings.cycleStartDate, App.settings.cycleStartDay);
      return { date, cals, dayLabel: days[d.getDay()], dayType };
    });

    return bars.map(b => {
      const height = b.cals > 0 ? Math.max(4, Math.round((b.cals / maxCal) * 100)) : 4;
      const color = `var(--${b.dayType}-carb)`;
      return `
        <div class="weekly-bar">
          <div class="bar" style="height: ${height}px; background: ${color};"></div>
          <div class="bar-label">${b.dayLabel}</div>
        </div>
      `;
    }).join('');
  }
};
