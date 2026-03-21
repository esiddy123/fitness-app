// ============================================
// MEALS — Suggestion engine + page rendering
// ============================================

const Meals = {
  currentArea: 'selden',

  render(container) {
    const today = new Date();
    const dayType = App.getTodayType();
    const macros = CarbCycle.getMacros(dayType);
    const label = CarbCycle.getLabel(dayType);

    // Get unique areas
    const areas = new Set(['all']);
    (App.mealData?.restaurants || []).forEach(r => areas.add(r.area));

    // Filter meals
    const meals = this.getSuggestions(dayType, this.currentArea);

    container.innerHTML = `
      <div class="page-header">
        <h1>Meal Suggestions</h1>
        <div class="subtitle">${label} Day — ${macros.carbs}g carbs, ${macros.calories} cal target</div>
      </div>

      <div class="today-banner ${dayType}">
        <div class="day-type">${label}</div>
        <div class="day-macros">${macros.protein}g protein · ${macros.carbs}g carbs · ${macros.fat}g fat · ${macros.calories} cal</div>
      </div>

      <div class="area-filter" id="area-filter">
        ${[...areas].map(a => `
          <button class="${a === this.currentArea ? 'active' : ''}" data-area="${a}">
            ${a === 'all' ? 'All Areas' : a.charAt(0).toUpperCase() + a.slice(1)}
          </button>
        `).join('')}
      </div>

      <div id="meal-list">
        ${meals.length === 0 ? '<div class="card text-center"><p style="color:var(--text-muted)">No meals found for this filter. Try a different area.</p></div>' : ''}
        ${meals.map(m => this.renderMealCard(m)).join('')}
      </div>
    `;

    // Area filter clicks
    container.querySelectorAll('#area-filter button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentArea = btn.dataset.area;
        this.render(container);
      });
    });

    // Log buttons
    container.querySelectorAll('.log-meal-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const data = JSON.parse(btn.dataset.meal);
        await DB.addFoodLog({
          date: CarbCycle.todayStr(),
          time: new Date().toTimeString().slice(0, 5),
          name: `${data.name} — ${data.restaurant}`,
          protein: data.protein,
          carbs: data.carbs,
          fat: data.fat,
          calories: data.calories,
          price: data.price,
          source: 'suggestion'
        });
        btn.textContent = 'Logged!';
        btn.disabled = true;
        btn.style.background = 'var(--success)';
      });
    });
  },

  getSuggestions(dayType, area = 'all') {
    const meals = [];
    (App.mealData?.restaurants || []).forEach(restaurant => {
      if (area !== 'all' && restaurant.area !== area) return;
      (restaurant.meals || []).forEach(meal => {
        if (meal.carbCategory.includes(dayType) && meal.price <= 15) {
          meals.push({
            ...meal,
            restaurant: restaurant.name,
            area: restaurant.area
          });
        }
      });
    });
    // Sort by best calorie fit (closest to target without going over)
    const target = CarbCycle.getMacros(dayType).calories;
    meals.sort((a, b) => Math.abs(a.calories - target * 0.4) - Math.abs(b.calories - target * 0.4));
    return meals;
  },

  renderMealCard(meal) {
    const logData = JSON.stringify({
      name: meal.name,
      restaurant: meal.restaurant,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      calories: meal.calories,
      price: meal.price
    }).replace(/"/g, '&quot;');

    return `
      <div class="meal-card">
        <div class="restaurant-name">${sanitize(meal.restaurant)} · ${sanitize(meal.area)}</div>
        <div class="meal-name">${sanitize(meal.name)}</div>
        <div class="meal-macros">
          <span>${sanitize(meal.protein)}g P</span>
          <span>${sanitize(meal.carbs)}g C</span>
          <span>${sanitize(meal.fat)}g F</span>
          <span>${sanitize(meal.calories)} cal</span>
        </div>
        <div class="meal-price">$${sanitize(meal.price.toFixed(2))}</div>
        ${meal.notes ? `<div class="meal-notes">${sanitize(meal.notes)}</div>` : ''}
        <button class="log-btn log-meal-btn" data-meal="${logData}">+ Log This Meal</button>
      </div>
    `;
  }
};
