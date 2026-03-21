// ============================================
// WORKOUT — Planner + page rendering
// ============================================

const Workout = {
  async render(container) {
    const dayType = App.getTodayType();
    const intensity = CarbCycle.getWorkoutIntensity(dayType);
    const todayStr = CarbCycle.todayStr();

    // Check if there's already a workout logged today
    const todayLogs = await DB.getWorkoutLogByDate(todayStr);
    const todayLog = todayLogs.length > 0 ? todayLogs[0] : null;

    // Get exercises for recommended muscle groups
    const exercises = this.getExercises(intensity.groups[0]);

    container.innerHTML = `
      <div class="page-header">
        <h1>Workout</h1>
        <div class="subtitle">${CarbCycle.getLabel(dayType)} Day</div>
      </div>

      <div class="today-banner ${dayType}">
        <div class="day-type">${intensity.level}</div>
        <div class="day-macros">${intensity.description}</div>
      </div>

      <div class="tab-pills" id="muscle-tabs">
        ${intensity.groups.map((g, i) => `
          <button class="${i === 0 ? 'active' : ''}" data-group="${g}">${g}</button>
        `).join('')}
      </div>

      <div class="card">
        <div class="card-title" id="workout-group-title">${intensity.groups[0]} Workout</div>
        <div id="exercise-list">
          ${exercises.map((ex, i) => this.renderExercise(ex, i, todayLog)).join('')}
        </div>
      </div>

      ${!todayLog ? `
        <button class="btn btn-primary mb-16" id="complete-workout">Complete Workout</button>
      ` : `
        <div class="card text-center" style="color: var(--success); font-weight: 600;">
          Workout completed today!
        </div>
      `}
    `;

    // Tab switching
    container.querySelectorAll('#muscle-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('#muscle-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const group = btn.dataset.group;
        const exs = this.getExercises(group);
        document.getElementById('workout-group-title').textContent = `${group} Workout`;
        document.getElementById('exercise-list').innerHTML =
          exs.map((ex, i) => this.renderExercise(ex, i, todayLog)).join('');
        this.setupCheckboxes();
      });
    });

    this.setupCheckboxes();

    // Complete workout
    const completeBtn = document.getElementById('complete-workout');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        const activeGroup = container.querySelector('#muscle-tabs button.active')?.dataset.group || intensity.groups[0];
        await DB.addWorkoutLog({
          date: todayStr,
          muscleGroup: activeGroup,
          exercises: this.getExercises(activeGroup).map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps
          })),
          completed: true,
          notes: ''
        });
        this.render(container);
      });
    }
  },

  getExercises(muscleGroup) {
    if (!App.exerciseData?.muscleGroups) return [];
    const group = App.exerciseData.muscleGroups.find(
      g => g.name.toLowerCase() === muscleGroup.toLowerCase()
    );
    return group ? group.exercises : [];
  },

  renderExercise(ex, index, todayLog) {
    const isDone = todayLog?.completed || false;
    return `
      <div class="exercise-item">
        <div class="exercise-check ${isDone ? 'done' : ''}" data-index="${index}"></div>
        <div class="exercise-info">
          <div class="exercise-name">${ex.name}</div>
          <div class="exercise-detail">${ex.sets} sets × ${ex.reps} reps${ex.notes ? ' · ' + ex.notes : ''}</div>
        </div>
      </div>
    `;
  },

  setupCheckboxes() {
    document.querySelectorAll('.exercise-check:not(.done)').forEach(cb => {
      cb.addEventListener('click', () => {
        cb.classList.toggle('done');
      });
    });
  }
};
