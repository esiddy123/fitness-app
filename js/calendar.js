// ============================================
// CALENDAR — Month view with carb cycle colors
// ============================================

const Calendar = {
  viewDate: new Date(),
  selectedDate: null,

  render(container) {
    const today = new Date();
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();
    const monthName = this.viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const todayType = App.getTodayType();
    const todayMacros = CarbCycle.getMacros(todayType);

    // Build calendar days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let daysHtml = '';
    // Day labels
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
      daysHtml += `<div class="day-label">${d}</div>`;
    });
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      daysHtml += '<div class="calendar-day empty"></div>';
    }
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayType = CarbCycle.getDayType(date, App.settings.cycleStartDate, App.settings.cycleStartDay);
      const isToday = date.toDateString() === today.toDateString();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysHtml += `<div class="calendar-day ${dayType} ${isToday ? 'today' : ''}" data-date="${dateStr}">${d}</div>`;
    }

    // Selected day detail
    let detailHtml = '';
    if (this.selectedDate) {
      const selDate = new Date(this.selectedDate + 'T00:00:00');
      const selType = CarbCycle.getDayType(selDate, App.settings.cycleStartDate, App.settings.cycleStartDay);
      const selMacros = CarbCycle.getMacros(selType);
      const intensity = CarbCycle.getWorkoutIntensity(selType);
      detailHtml = `
        <div class="day-detail visible">
          <div class="card-title">${selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div class="today-banner ${selType}" style="margin: 12px 0; padding: 12px; border-radius: 8px;">
            <div class="day-type" style="font-size: 18px;">${CarbCycle.getLabel(selType)}</div>
          </div>
          <div class="macro-bars" style="margin-bottom: 12px;">
            <div class="macro-row">
              <div class="macro-label">Protein</div>
              <div class="macro-value" style="flex:1; text-align:left;">${selMacros.protein}g</div>
            </div>
            <div class="macro-row">
              <div class="macro-label">Carbs</div>
              <div class="macro-value" style="flex:1; text-align:left;">${selMacros.carbs}g</div>
            </div>
            <div class="macro-row">
              <div class="macro-label">Fat</div>
              <div class="macro-value" style="flex:1; text-align:left;">${selMacros.fat}g</div>
            </div>
            <div class="macro-row">
              <div class="macro-label">Calories</div>
              <div class="macro-value" style="flex:1; text-align:left;">${selMacros.calories}</div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--text-muted);">
            Workout: <strong>${intensity.level}</strong> — ${intensity.groups.join(' or ')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="page-header">
        <h1>Calendar</h1>
        <div class="subtitle">Today is a <strong>${CarbCycle.getLabel(todayType)}</strong> day</div>
      </div>

      <div class="today-banner ${todayType}">
        <div class="day-type">${CarbCycle.getLabel(todayType)}</div>
        <div class="day-macros">${todayMacros.protein}g protein · ${todayMacros.carbs}g carbs · ${todayMacros.fat}g fat · ${todayMacros.calories} cal</div>
      </div>

      <div style="display: flex; justify-content: center; gap: 20px; font-size: 13px; margin-bottom: 16px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:14px;height:14px;border-radius:4px;background:var(--low-carb);border:1px solid var(--border);"></div> Low
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:14px;height:14px;border-radius:4px;background:var(--med-carb);"></div> Medium
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:14px;height:14px;border-radius:4px;background:var(--high-carb);"></div> High
        </div>
      </div>

      <div class="card">
        <div class="calendar-nav">
          <button id="cal-prev">&larr;</button>
          <h2>${monthName}</h2>
          <button id="cal-next">&rarr;</button>
        </div>
        <div class="calendar-grid">
          ${daysHtml}
        </div>
      </div>

      ${detailHtml}
    `;

    // Navigation
    document.getElementById('cal-prev').addEventListener('click', () => {
      this.viewDate.setMonth(this.viewDate.getMonth() - 1);
      this.render(container);
    });
    document.getElementById('cal-next').addEventListener('click', () => {
      this.viewDate.setMonth(this.viewDate.getMonth() + 1);
      this.render(container);
    });

    // Day click
    container.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
      el.addEventListener('click', () => {
        this.selectedDate = el.dataset.date;
        this.render(container);
      });
    });
  }
};
