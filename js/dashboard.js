// Dashboard Module
// Role-specific dashboard rendering

import {
    getUsers,
    getSchedule,
    getNotices,
    getCurrentUser,
    getUserById,
    getRoleName,
    getStatusName,
    isInstructor,
    isAdmin,
    isStaff
} from './data.js';
import { showToast, formatDateTime } from './components.js';
import { getLessonName, SYLLABUS } from './syllabus.js';

// ========================================
// Dashboard Initialization
// ========================================

async function initDashboard() {
    const user = getCurrentUser();
    if (!user) return;

    // Update user display
    document.getElementById('user-name-display').textContent = user.name;
    document.getElementById('user-role-display').textContent = getRoleName(user.role);

    // Load notices for all users
    await loadNotices();

    // Load role-specific content
    if (isAdmin(user.role)) {
        await loadAdminDashboard();
    } else if (isInstructor(user.role)) {
        await loadInstructorDashboard();
    } else if (user.role === 'trainee') {
        await loadTraineeDashboard();
    } else if (isStaff(user.role)) {
        await loadStaffDashboard();
    }

    // Show/hide admin nav
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) {
        adminNav.style.display = (isAdmin(user.role) || isStaff(user.role)) ? 'block' : 'none';
    }
}

// ========================================
// Notice Board
// ========================================

async function loadNotices() {
    const notices = await getNotices();
    const container = document.getElementById('notice-list');
    if (!container) return;

    if (notices.length === 0) {
        container.innerHTML = `
      <div class="notice-item">
        <div class="notice-date">אין הודעות חדשות</div>
      </div>
    `;
        return;
    }

    container.innerHTML = notices.slice(0, 5).map(notice => `
    <div class="notice-item">
      <div class="notice-date">${formatDateTime(notice.createdAt)}</div>
      <div class="notice-content">${notice.content}</div>
    </div>
  `).join('');
}

// ========================================
// Admin Dashboard
// ========================================

async function loadAdminDashboard() {
    const users = await getUsers();
    const schedule = await getSchedule();

    // Stats
    const totalTrainees = users.filter(u => u.role === 'trainee').length;
    const totalInstructors = users.filter(u => isInstructor(u.role)).length;
    const atRiskTrainees = users.filter(u => u.noShowCount >= 2).length;
    const upcomingSlots = schedule.filter(s => new Date(s.date) >= new Date()).length;

    document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalTrainees}</div>
      <div class="stat-label">מתאמנים</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${totalInstructors}</div>
      <div class="stat-label">מדריכים</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${atRiskTrainees}</div>
      <div class="stat-label">מתאמנים בסיכון</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${upcomingSlots}</div>
      <div class="stat-label">משבצות קרובות</div>
    </div>
  `;

    // Show at-risk trainees if any
    if (atRiskTrainees > 0) {
        const atRiskUsers = users.filter(u => u.noShowCount >= 2);
        let alertHtml = `
      <div class="card" style="margin-top: 1.5rem; border-color: var(--status-partial);">
        <h3 style="margin-bottom: 1rem;">⚠️ מתאמנים בסיכון (${atRiskTrainees})</h3>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
    `;

        for (const u of atRiskUsers) {
            alertHtml += `
        <div class="profile-card" style="padding: 0.75rem;">
          <div class="profile-avatar" style="width: 40px; height: 40px; font-size: 1rem; background: ${u.noShowCount >= 3 ? 'var(--status-empty)' : 'var(--status-partial)'};">
            ${u.name.charAt(0)}
          </div>
          <div class="profile-info">
            <div class="profile-name" style="font-size: 1rem;">${u.name}</div>
            <div style="font-size: 0.85rem; color: ${u.noShowCount >= 3 ? 'var(--status-empty)' : 'var(--status-partial)'};">
              ${u.noShowCount}/3 אי-הגעות ${u.status === 'frozen' ? '(מוקפא)' : ''}
            </div>
          </div>
          ${u.noShowCount > 0 ? `<button class="btn btn-sm btn-secondary" onclick="openRemoveNoShowModal('${u.id}')">הסר פסילה</button>` : ''}
        </div>
      `;
        }

        alertHtml += '</div></div>';
        document.getElementById('dashboard-stats').insertAdjacentHTML('afterend', alertHtml);
    }
}

// ========================================
// Instructor Dashboard
// ========================================

async function loadInstructorDashboard() {
    const user = getCurrentUser();
    const schedule = await getSchedule();

    // Get upcoming lessons for this instructor
    const today = new Date().toISOString().split('T')[0];
    const myLessons = schedule.filter(s =>
        (s.leadInstructorId === user.id || s.secondInstructorId === user.id) &&
        s.date >= today
    ).sort((a, b) => a.date.localeCompare(b.date) || a.timeStart.localeCompare(b.timeStart));

    // Stats
    const totalHours = user.totalHours || 0;
    const upcomingCount = myLessons.length;

    document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalHours}</div>
      <div class="stat-label">שעות הדרכה</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${upcomingCount}</div>
      <div class="stat-label">שיעורים קרובים</div>
    </div>
  `;

    // Show upcoming lessons
    const upcomingSection = document.getElementById('upcoming-lessons-section');
    if (upcomingSection) {
        upcomingSection.style.display = 'block';
        const list = document.getElementById('upcoming-lessons-list');

        if (myLessons.length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">אין שיעורים קרובים. היכנס ללוח השיבוצים להרשמה.</p>';
        } else {
            let html = '';
            for (const lesson of myLessons.slice(0, 5)) {
                const trainee = lesson.traineeId ? await getUserById(lesson.traineeId) : null;
                const isLead = lesson.leadInstructorId === user.id;

                html += `
          <div class="profile-card" style="padding: 0.75rem; margin-bottom: 0.5rem;">
            <div style="flex: 1;">
              <div style="font-weight: 600;">${new Date(lesson.date).toLocaleDateString('he-IL')} ${lesson.timeStart}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">
                ${isLead ? '<span class="lead-badge">מוביל</span>' : 'מדריך משני'}
                ${trainee ? ` | 🧑‍🎓 ${trainee.name} - ${getLessonName(lesson.lessonNumber || 1)}` : ' | ללא מתאמן'}
              </div>
              ${lesson.notes ? `<div style="font-size: 0.8rem; font-style: italic; margin-top: 0.25rem;">💬 ${lesson.notes}</div>` : ''}
            </div>
          </div>
        `;
            }
            list.innerHTML = html;
        }
    }

    // Show lesson notes section for instructors
    const notesSection = document.getElementById('lesson-notes-section');
    if (notesSection) {
        notesSection.style.display = 'block';
    }
}

// ========================================
// Trainee Dashboard
// ========================================

async function loadTraineeDashboard() {
    const user = getCurrentUser();
    const currentLesson = user.currentLesson || 1;

    // Stats
    document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${currentLesson}/10</div>
      <div class="stat-label">שיעורים הושלמו</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${getStatusName(user.status)}</div>
      <div class="stat-label">סטטוס</div>
    </div>
  `;

    // Show progress section
    const progressSection = document.getElementById('syllabus-progress-section');
    if (progressSection) {
        progressSection.style.display = 'block';

        const percent = ((currentLesson - 1) / 10) * 100;
        document.getElementById('progress-fill').style.width = `${percent}%`;
        document.getElementById('progress-percent').textContent = `${Math.round(percent)}%`;
        document.getElementById('current-lesson-name').textContent = getLessonName(currentLesson);
        document.getElementById('next-lesson-display').textContent = getLessonName(currentLesson);
    }

    // Show no-show warning if applicable
    if (user.noShowCount > 0) {
        const warningHtml = `
      <div class="card" style="margin-top: 1.5rem; border-color: var(--status-partial);">
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span style="font-size: 1.5rem;">⚠️</span>
          <div>
            <strong>שים לב:</strong> יש לך ${user.noShowCount}/3 אי-הגעות.
            ${user.noShowCount >= 2 ? 'אי-הגעה נוספת תקפיא את החשבון שלך.' : ''}
          </div>
        </div>
      </div>
    `;
        document.getElementById('syllabus-progress-section').insertAdjacentHTML('afterend', warningHtml);
    }
}

// ========================================
// Staff Dashboard
// ========================================

async function loadStaffDashboard() {
    const users = await getUsers();

    const totalTrainees = users.filter(u => u.role === 'trainee').length;
    const activeTrainees = users.filter(u => u.role === 'trainee' && u.status !== 'frozen').length;

    document.getElementById('dashboard-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${totalTrainees}</div>
      <div class="stat-label">סה"כ מתאמנים</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${activeTrainees}</div>
      <div class="stat-label">מתאמנים פעילים</div>
    </div>
  `;
}

// ========================================
// Profile Page
// ========================================

async function loadProfile() {
    const user = getCurrentUser();
    if (!user) return;

    // Update profile display
    document.getElementById('profile-avatar').textContent = user.name.charAt(0);
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-role').textContent = getRoleName(user.role);

    // Fill form
    document.getElementById('profile-input-name').value = user.name || '';
    document.getElementById('profile-input-email').value = user.email || '';
    document.getElementById('profile-input-phone').value = user.phone || '';
    document.getElementById('profile-input-background').value = user.background || '';
}

export {
    initDashboard,
    loadNotices,
    loadProfile,
    loadAdminDashboard,
    loadInstructorDashboard,
    loadTraineeDashboard,
    loadStaffDashboard
};
