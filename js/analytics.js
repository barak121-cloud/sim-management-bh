// Analytics Module
// Instructor statistics, reporting, and Excel export

import {
    getUsers,
    getSchedule,
    getLogs,
    getInstructorStats,
    getInstructorStatsByUser,
    isInstructor
} from './data.js';
import { showToast, showModal, formatDateTime } from './components.js';
import { SYLLABUS, getLessonName } from './syllabus.js';

// ========================================
// Instructor Hours Dashboard
// ========================================

async function loadInstructorStatsTable() {
    const users = await getUsers();
    const schedule = await getSchedule();
    const instructors = users.filter(u => isInstructor(u.role));

    const tbody = document.getElementById('instructors-stats-body');
    if (!tbody) return;

    // Calculate last activity for each instructor
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

    let inactiveInstructors = [];
    let html = '';

    for (const instructor of instructors) {
        // Get instructor's completed lessons
        const instructorLessons = schedule.filter(s =>
            (s.leadInstructorId === instructor.id || s.secondInstructorId === instructor.id)
        );

        // Find last activity
        const lastLesson = instructorLessons
            .filter(s => new Date(s.date) <= now)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        const lastActivity = lastLesson ? new Date(lastLesson.date) : null;
        const isInactive = !lastActivity || lastActivity < fourteenDaysAgo;

        // Check if junior instructor is inactive
        if (instructor.role === 'instructor_junior' && isInactive) {
            inactiveInstructors.push(instructor);
        }

        html += `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${instructor.name}
            ${instructor.role === 'instructor_senior' ? '<span class="lead-badge">ותיק</span>' : ''}
          </div>
        </td>
        <td>${instructor.role === 'instructor_senior' ? 'ותיק' : 'חדש'}</td>
        <td>${instructor.totalHours || 0} שעות</td>
        <td style="color: ${isInactive ? 'var(--status-empty)' : 'var(--text-secondary)'};">
          ${lastActivity ? formatDateTime(lastActivity.toISOString()) : 'לא פעיל'}
          ${isInactive ? ' ⚠️' : ''}
        </td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="showInstructorStats('${instructor.id}')">
            📊 פירוט
          </button>
        </td>
      </tr>
    `;
    }

    tbody.innerHTML = html || '<tr><td colspan="5" style="text-align: center;">אין מדריכים</td></tr>';

    // Show inactive instructors alert
    const alertContainer = document.getElementById('inactive-instructors-alert');
    const alertList = document.getElementById('inactive-instructors-list');

    if (inactiveInstructors.length > 0 && alertContainer && alertList) {
        alertContainer.style.display = 'block';
        alertList.innerHTML = inactiveInstructors.map(i => `
      <div class="notice-item">
        <strong>${i.name}</strong> - לא נרשם לשיבוץ מעל 14 ימים
      </div>
    `).join('');
    } else if (alertContainer) {
        alertContainer.style.display = 'none';
    }
}

// ========================================
// Instructor Stats Detail Modal
// ========================================

async function showInstructorStats(instructorId) {
    const instructor = (await getUsers()).find(u => u.id === instructorId);
    if (!instructor) return;

    const schedule = await getSchedule();

    // Count lessons by type
    const lessonCounts = {};
    SYLLABUS.forEach(lesson => {
        lessonCounts[lesson.number] = 0;
    });

    const instructorLessons = schedule.filter(s =>
        (s.leadInstructorId === instructorId || s.secondInstructorId === instructorId) &&
        s.completed
    );

    instructorLessons.forEach(lesson => {
        if (lesson.lessonNumber && lessonCounts[lesson.lessonNumber] !== undefined) {
            lessonCounts[lesson.lessonNumber]++;
        }
    });

    let html = `
    <div style="margin-bottom: 1.5rem;">
      <div class="profile-card" style="padding: 1rem;">
        <div class="profile-avatar">${instructor.name.charAt(0)}</div>
        <div class="profile-info">
          <div class="profile-name">${instructor.name}</div>
          <div class="profile-role">${instructor.role === 'instructor_senior' ? 'מדריך ותיק' : 'מדריך חדש'}</div>
        </div>
      </div>
    </div>
    
    <h4 style="margin-bottom: 1rem;">פירוט שעות לפי סילבוס</h4>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th>שיעור</th>
            <th>מספר הדרכות</th>
          </tr>
        </thead>
        <tbody>
  `;

    SYLLABUS.forEach(lesson => {
        html += `
      <tr>
        <td>${getLessonName(lesson.number)}</td>
        <td>${lessonCounts[lesson.number]}</td>
      </tr>
    `;
    });

    html += `
        </tbody>
      </table>
    </div>
    <div style="margin-top: 1rem; text-align: center;">
      <strong>סה"כ שעות הדרכה: ${instructor.totalHours || 0}</strong>
    </div>
  `;

    document.getElementById('instructor-stats-title').textContent = `פירוט שעות - ${instructor.name}`;
    document.getElementById('instructor-stats-content').innerHTML = html;
    showModal('modal-instructor-stats');
}

// ========================================
// Logs Table
// ========================================

async function loadLogsTable() {
    const logs = await getLogs();
    const users = await getUsers();

    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">אין רשומות</td></tr>';
        return;
    }

    tbody.innerHTML = logs.slice(0, 50).map(log => {
        const user = users.find(u => u.id === log.userId);
        return `
      <tr>
        <td>${formatDateTime(log.timestamp)}</td>
        <td>${user ? user.name : 'לא ידוע'}</td>
        <td>${getActionLabel(log.action)}</td>
        <td>${log.details || '-'}</td>
      </tr>
    `;
    }).join('');
}

function getActionLabel(action) {
    const labels = {
        'no_show': '❌ אי-הגעה',
        'noshow_removed': '✅ הסרת פסילה',
        'slot_cancelled': '🚫 ביטול משבצת',
        'registration_cancelled': '🚫 ביטול רישום',
        'lesson_completed': '✅ השלמת שיעור',
        'account_frozen': '🔒 הקפאת חשבון'
    };
    return labels[action] || action;
}

// ========================================
// Users Table
// ========================================

async function loadUsersTable() {
    const users = await getUsers();
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    const getRoleName = (role) => {
        const names = {
            'admin': 'אדמין',
            'staff': 'גורם ניהולי',
            'instructor_senior': 'מדריך ותיק',
            'instructor_junior': 'מדריך חדש',
            'trainee': 'מתאמן'
        };
        return names[role] || role;
    };

    const getStatusName = (status) => {
        const names = {
            'active': '🟢 פעיל',
            'in_training': '📚 בהכשרה',
            'solo': '✈️ סולו',
            'graduate': '🎓 בוגר',
            'frozen': '🔒 מוקפא'
        };
        return names[status] || status;
    };

    tbody.innerHTML = users.map(user => `
    <tr>
      <td>${user.name}</td>
      <td>${getRoleName(user.role)}</td>
      <td>${getStatusName(user.status)}</td>
      <td style="color: ${user.noShowCount >= 2 ? 'var(--status-empty)' : 'inherit'};">
        ${user.noShowCount || 0}/3
      </td>
      <td>
        ${user.noShowCount > 0 ? `
          <button class="btn btn-sm btn-secondary" onclick="openRemoveNoShowModal('${user.id}')">
            הסר פסילה
          </button>
        ` : ''}
        ${user.status === 'frozen' ? `
          <button class="btn btn-sm btn-success" onclick="unfreezeUser('${user.id}')">
            בטל הקפאה
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');

    // Populate fast-track dropdown
    const fastTrackSelect = document.getElementById('fast-track-user');
    if (fastTrackSelect) {
        const trainees = users.filter(u => u.role === 'trainee' && u.status !== 'frozen');
        fastTrackSelect.innerHTML = `
      <option value="">בחר מתאמן...</option>
      ${trainees.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
    `;
    }
}

// ========================================
// Excel Export
// ========================================

async function exportToExcel() {
    try {
        const users = await getUsers();
        const schedule = await getSchedule();
        const logs = await getLogs();

        // Create CSV content
        let csvContent = '\ufeff'; // BOM for Excel Hebrew support

        // Users sheet
        csvContent += '=== משתמשים ===\n';
        csvContent += 'שם,אימייל,טלפון,תפקיד,סטטוס,פסילות,שעות\n';
        users.forEach(u => {
            csvContent += `"${u.name}","${u.email}","${u.phone}","${u.role}","${u.status}",${u.noShowCount || 0},${u.totalHours || 0}\n`;
        });

        csvContent += '\n=== לוח שיבוצים ===\n';
        csvContent += 'תאריך,שעת התחלה,שעת סיום,סוג,מדריך מוביל,מדריך משני,מתאמן,שיעור\n';
        for (const s of schedule) {
            const lead = s.leadInstructorId ? users.find(u => u.id === s.leadInstructorId)?.name : '';
            const second = s.secondInstructorId ? users.find(u => u.id === s.secondInstructorId)?.name : '';
            const trainee = s.traineeId ? users.find(u => u.id === s.traineeId)?.name : '';
            csvContent += `"${s.date}","${s.timeStart}","${s.timeEnd}","${s.dayType}","${lead}","${second}","${trainee}",${s.lessonNumber || ''}\n`;
        }

        csvContent += '\n=== לוג פעילות ===\n';
        csvContent += 'תאריך,משתמש,פעולה,פרטים\n';
        logs.forEach(l => {
            const user = users.find(u => u.id === l.userId)?.name || 'לא ידוע';
            csvContent += `"${l.timestamp}","${user}","${l.action}","${l.details || ''}"\n`;
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `beit_halohem_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        showToast('הקובץ יורד בהצלחה!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('שגיאה בייצוא', 'error');
    }
}

// ========================================
// Global Functions
// ========================================

window.showInstructorStats = showInstructorStats;
window.exportToExcel = exportToExcel;

export {
    loadInstructorStatsTable,
    showInstructorStats,
    loadLogsTable,
    loadUsersTable,
    exportToExcel
};
