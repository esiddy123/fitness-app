// ============================================
// FOOD LOGGER — Track daily intake
// ============================================

const Logger = {
  async render(container) {
    const todayStr = CarbCycle.todayStr();
    const dayType = App.getTodayType();
    const targets = CarbCycle.getMacros(dayType);
    const logs = await DB.getFoodLogsByDate(todayStr);

    // Sum macros
    const totals = logs.reduce((acc, l) => ({
      protein: acc.protein + (l.protein || 0),
      carbs: acc.carbs + (l.carbs || 0),
      fat: acc.fat + (l.fat || 0),
      calories: acc.calories + (l.calories || 0),
      spent: acc.spent + (l.price || 0)
    }), { protein: 0, carbs: 0, fat: 0, calories: 0, spent: 0 });

    container.innerHTML = `
      <div class="page-header">
        <h1>Food Log</h1>
        <div class="subtitle">${CarbCycle.getLabel(dayType)} Day — $${totals.spent.toFixed(2)} spent</div>
      </div>

      <div class="logger-summary">
        <div class="total-calories">${totals.calories}</div>
        <div class="calorie-label">of ${targets.calories} calories</div>
        <div class="macro-bars">
          ${this.macroBar('Protein', totals.protein, targets.protein, 'protein')}
          ${this.macroBar('Carbs', totals.carbs, targets.carbs, 'carbs')}
          ${this.macroBar('Fat', totals.fat, targets.fat, 'fat')}
          ${this.macroBar('Calories', totals.calories, targets.calories, 'calories')}
        </div>
      </div>

      <div class="card">
        <div class="card-title">Today's Meals</div>
        ${logs.length === 0 ? '<p style="color:var(--text-muted); font-size:14px;">No meals logged yet. Tap + to add one.</p>' : ''}
        ${logs.map(l => `
          <div class="food-log-item">
            <div>
              <div class="food-name">${sanitize(l.name)}</div>
              <div class="food-time">${sanitize(l.time)} · ${sanitize(l.protein)}P ${sanitize(l.carbs)}C ${sanitize(l.fat)}F</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="food-cals">${sanitize(l.calories)} cal</div>
              <button class="delete-food" data-id="${sanitize(l.id)}" style="background:none;border:none;color:var(--danger);font-size:18px;cursor:pointer;">&times;</button>
            </div>
          </div>
        `).join('')}
      </div>

      <button class="add-food-btn" id="add-food-btn">+</button>

      <div class="modal-overlay" id="food-modal">
        <div class="modal">
          <button class="modal-close" id="modal-close">&times;</button>
          <h2>Log Food</h2>

          <div class="tab-pills mb-16" id="log-tabs">
            <button class="active" data-tab="quick">Quick Add</button>
            <button data-tab="search">Search</button>
            <button data-tab="manual">Manual</button>
          </div>

          <div id="log-tab-content">
            ${this.renderQuickTab()}
          </div>
        </div>
      </div>
    `;

    // Add food button
    document.getElementById('add-food-btn').addEventListener('click', () => {
      document.getElementById('food-modal').classList.add('visible');
    });

    // Close modal
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('food-modal').classList.remove('visible');
    });

    // Click overlay to close
    document.getElementById('food-modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('food-modal')) {
        document.getElementById('food-modal').classList.remove('visible');
      }
    });

    // Tab switching
    document.querySelectorAll('#log-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#log-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tabContent = document.getElementById('log-tab-content');
        switch (btn.dataset.tab) {
          case 'quick': tabContent.innerHTML = this.renderQuickTab(); this.setupQuickTab(container); break;
          case 'search': tabContent.innerHTML = this.renderSearchTab(); this.setupSearchTab(container); break;
          case 'manual': tabContent.innerHTML = this.renderManualTab(); this.setupManualTab(container); break;
        }
      });
    });

    this.setupQuickTab(container);

    // Delete buttons
    container.querySelectorAll('.delete-food').forEach(btn => {
      btn.addEventListener('click', async () => {
        await DB.deleteFoodLog(Number(btn.dataset.id));
        this.render(container);
      });
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

  renderQuickTab() {
    const dayType = App.getTodayType();
    const suggestions = Meals.getSuggestions(dayType, 'all').slice(0, 5);
    if (suggestions.length === 0) {
      return '<p style="color:var(--text-muted)">No quick suggestions available. Use Search or Manual entry.</p>';
    }
    return suggestions.map(m => {
      const data = sanitize(JSON.stringify({
        name: m.name, restaurant: m.restaurant,
        protein: m.protein, carbs: m.carbs, fat: m.fat,
        calories: m.calories, price: m.price
      }));
      return `
        <div class="food-log-item" style="cursor:pointer" data-quick="${data}">
          <div>
            <div class="food-name">${sanitize(m.name)}</div>
            <div class="food-time">${sanitize(m.restaurant)} · $${sanitize(m.price.toFixed(2))}</div>
          </div>
          <div class="food-cals">${sanitize(m.calories)} cal</div>
        </div>
      `;
    }).join('');
  },

  setupQuickTab(container) {
    document.querySelectorAll('[data-quick]').forEach(el => {
      el.addEventListener('click', async () => {
        const data = JSON.parse(el.dataset.quick);
        await DB.addFoodLog({
          date: CarbCycle.todayStr(),
          time: new Date().toTimeString().slice(0, 5),
          name: `${data.name} — ${data.restaurant}`,
          protein: data.protein, carbs: data.carbs,
          fat: data.fat, calories: data.calories,
          price: data.price, source: 'suggestion'
        });
        document.getElementById('food-modal').classList.remove('visible');
        this.render(container);
      });
    });
  },

  renderSearchTab() {
    return `
      <input type="text" class="search-input" id="food-search" placeholder="Search common foods...">
      <div id="search-results"></div>
    `;
  },

  setupSearchTab(container) {
    const input = document.getElementById('food-search');
    input.addEventListener('input', async () => {
      const q = input.value.toLowerCase().trim();
      if (q.length < 2) {
        document.getElementById('search-results').innerHTML = '';
        return;
      }
      try {
        const res = await fetch('data/common-foods.json');
        const foods = await res.json();
        const matches = foods.filter(f => f.name.toLowerCase().includes(q)).slice(0, 10);
        document.getElementById('search-results').innerHTML = matches.map(f => `
          <div class="food-log-item" style="cursor:pointer" data-food="${sanitize(JSON.stringify(f))}">
            <div>
              <div class="food-name">${sanitize(f.name)}</div>
              <div class="food-time">${sanitize(f.serving)} · ${sanitize(f.protein)}P ${sanitize(f.carbs)}C ${sanitize(f.fat)}F</div>
            </div>
            <div class="food-cals">${sanitize(f.calories)} cal</div>
          </div>
        `).join('');

        document.querySelectorAll('[data-food]').forEach(el => {
          el.addEventListener('click', async () => {
            const food = JSON.parse(el.dataset.food);
            await DB.addFoodLog({
              date: CarbCycle.todayStr(),
              time: new Date().toTimeString().slice(0, 5),
              name: food.name,
              protein: food.protein, carbs: food.carbs,
              fat: food.fat, calories: food.calories,
              price: 0, source: 'search'
            });
            document.getElementById('food-modal').classList.remove('visible');
            this.render(container);
          });
        });
      } catch (e) {
        document.getElementById('search-results').innerHTML = '<p style="color:var(--text-muted)">Could not load food database.</p>';
      }
    });
  },

  renderManualTab() {
    return `
      <div class="form-group">
        <label>Food Name</label>
        <input type="text" id="manual-name" placeholder="e.g. Chicken over rice">
      </div>
      <div class="form-group">
        <label>Calories</label>
        <input type="number" id="manual-cals" placeholder="0">
      </div>
      <div class="form-group">
        <label>Protein (g)</label>
        <input type="number" id="manual-protein" placeholder="0">
      </div>
      <div class="form-group">
        <label>Carbs (g)</label>
        <input type="number" id="manual-carbs" placeholder="0">
      </div>
      <div class="form-group">
        <label>Fat (g)</label>
        <input type="number" id="manual-fat" placeholder="0">
      </div>
      <div class="form-group">
        <label>Price ($)</label>
        <input type="number" id="manual-price" placeholder="0" step="0.01">
      </div>
      <button class="btn btn-primary" id="manual-save">Log Food</button>
    `;
  },

  setupManualTab(container) {
    document.getElementById('manual-save').addEventListener('click', async () => {
      const name = document.getElementById('manual-name').value.trim();
      if (!name) return;
      await DB.addFoodLog({
        date: CarbCycle.todayStr(),
        time: new Date().toTimeString().slice(0, 5),
        name,
        protein: parseInt(document.getElementById('manual-protein').value) || 0,
        carbs: parseInt(document.getElementById('manual-carbs').value) || 0,
        fat: parseInt(document.getElementById('manual-fat').value) || 0,
        calories: parseInt(document.getElementById('manual-cals').value) || 0,
        price: parseFloat(document.getElementById('manual-price').value) || 0,
        source: 'manual'
      });
      document.getElementById('food-modal').classList.remove('visible');
      this.render(container);
    });
  }
};
