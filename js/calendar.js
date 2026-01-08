// Calendar Module
// Handles calendar rendering and slot management

import {
    getScheduleByMonth,
    getScheduleByDate,
    createSlot,
    updateSlot,
    deleteSlot,
    getUserById,
    getUsers,
    addLog
} from './data.js';
import { getCurrentUser, canRegisterAsInstructor, canRegisterAsTrainee } from './auth.js';
import {
    showToast,
    showModal,
    closeModal,
    getHebrewMonthName,
    formatTime
} from './components.js';
import { getLessonName } from './syllabus.js';

// ========================================
// Calendar State
// ========================================

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();
let selectedSlot = null;

// ========================================
// Calendar Rendering
// ========================================

async function renderCalendar() {
    const container = document.getElementById('calendar-days');
    const titleEl = document.getElementById('calendar-month-title');

    if (!container || !titleEl) return;

    // Update title
    titleEl.textContent = `${getHebrewMonthName(currentMonth)} ${currentYear}`;

    // Get schedule for this month
    const schedule = await getScheduleByMonth(currentYear, currentMonth);

    // Calculate calendar grid
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    let html = '';

    // Previous month days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        html += `<div class="calendar-day other-month"><div class="calendar-day-number">${day}</div></div>`;
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDateStr(currentYear, currentMonth, day);
        const daySchedule = schedule.filter(s => s.date === dateStr);

        html += `
      <div class="calendar-day" onclick="openDayView('${dateStr}')">
        <div class="calendar-day-number">${day}</div>
        ${renderDaySlots(daySchedule)}
      </div>
    `;
    }

    // Next month days
    const totalCells = startDayOfWeek + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
        html += `<div class="calendar-day other-month"><div class="calendar-day-number">${i}</div></div>`;
    }

    container.innerHTML = html;
}

function renderDaySlots(slots) {
    if (slots.length === 0) return '';

    // Group slots by status
    return slots.slice(0, 3).map(slot => {
        const status = getSlotStatus(slot);
        const time = slot.timeStart ? slot.timeStart.substring(0, 5) : '';
        return `<div class="calendar-slot status-${status}" onclick="event.stopPropagation(); openSlotModal('${slot.id}')">${time}</div>`;
    }).join('') + (slots.length > 3 ? `<div style="font-size: 0.75rem; color: var(--text-muted);">+${slots.length - 3} נוספים</div>` : '');
}

function getSlotStatus(slot) {
    if (slot.dayType === 'independent') return 'independent';
    if (!slot.leadInstructorId) return 'empty';
    if (!slot.traineeId) return 'partial';
    return 'full';
}

function formatDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ========================================
// Month Navigation
// ========================================

function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// ========================================
// Day View
// ========================================

async function openDayView(dateStr) {
    const slots = await getScheduleByDate(dateStr);
    const user = getCurrentUser();

    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });
    const dateDisplay = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

    let html = `
    <div style="margin-bottom: 1rem;">
      <strong>${dayName}</strong>, ${dateDisplay}
    </div>
  `;

    if (slots.length === 0) {
        html += `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <p>אין משבצות מוגדרות ליום זה</p>
      </div>
    `;
    } else {
        html += `<div style="display: flex; flex-direction: column; gap: 0.75rem;">`;

        for (const slot of slots) {
            const leadInstructor = slot.leadInstructorId ? await getUserById(slot.leadInstructorId) : null;
            const secondInstructor = slot.secondInstructorId ? await getUserById(slot.secondInstructorId) : null;
            const trainee = slot.traineeId ? await getUserById(slot.traineeId) : null;
            const status = getSlotStatus(slot);

            html += `
        <div class="card" style="padding: 1rem; cursor: pointer;" onclick="openSlotModal('${slot.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <strong>${slot.timeStart} - ${slot.timeEnd}</strong>
            <span class="calendar-slot status-${status}" style="position: static;">${getStatusLabel(status)}</span>
          </div>
          ${slot.dayType === 'independent' ? '<div style="color: var(--status-independent); font-size: 0.85rem;">🔵 אימון עצמאי</div>' : ''}
          ${leadInstructor ? `
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
              <span class="lead-badge">מוביל</span>
              <span class="instructor-lead">${leadInstructor.name}</span>
            </div>
          ` : '<div style="color: var(--status-empty);">❌ חסר מדריך מוביל</div>'}
          ${secondInstructor ? `<div style="margin-top: 0.25rem;">👨‍✈️ ${secondInstructor.name}</div>` : ''}
          ${trainee ? `<div style="margin-top: 0.25rem;">🧑‍🎓 ${trainee.name} - ${getLessonName(slot.lessonNumber || 1)}</div>` :
                    (status === 'partial' ? '<div style="color: var(--status-partial);">⚠️ חסר מתאמן</div>' : '')}
        </div>
      `;
        }

        html += `</div>`;
    }

    document.getElementById('slot-modal-title').textContent = 'משבצות היום';
    document.getElementById('slot-modal-content').innerHTML = html;
    showModal('modal-slot');
}

function getStatusLabel(status) {
    const labels = {
        'full': 'מאויש',
        'partial': 'חלקי',
        'empty': 'פנוי',
        'independent': 'עצמאי'
    };
    return labels[status] || status;
}

// ========================================
// Slot Modal
// ========================================

async function openSlotModal(slotId) {
    const schedule = await getScheduleByMonth(currentYear, currentMonth);
    const slot = schedule.find(s => s.id === slotId);
    if (!slot) return;

    selectedSlot = slot;

    const user = getCurrentUser();
    const leadInstructor = slot.leadInstructorId ? await getUserById(slot.leadInstructorId) : null;
    const secondInstructor = slot.secondInstructorId ? await getUserById(slot.secondInstructorId) : null;
    const trainee = slot.traineeId ? await getUserById(slot.traineeId) : null;

    const date = new Date(slot.date);
    const dateDisplay = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

    let html = `
    <div style="margin-bottom: 1.5rem;">
      <div style="font-size: 0.9rem; color: var(--text-secondary);">${dateDisplay}</div>
      <div style="font-size: 1.25rem; font-weight: 600; margin-top: 0.25rem;">${slot.timeStart} - ${slot.timeEnd}</div>
    </div>
    
    <div style="margin-bottom: 1.5rem;">
      <h4 style="margin-bottom: 0.75rem;">מדריכים</h4>
      ${leadInstructor ? `
        <div class="profile-card" style="margin-bottom: 0.5rem; padding: 0.75rem;">
          <div class="profile-avatar" style="width: 40px; height: 40px; font-size: 1rem;">${leadInstructor.name.charAt(0)}</div>
          <div class="profile-info">
            <div class="profile-name" style="font-size: 1rem;">${leadInstructor.name} <span class="lead-badge">מוביל</span></div>
          </div>
        </div>
      ` : `
        <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); text-align: center; color: var(--text-muted);">
          אין מדריך מוביל
        </div>
      `}
      ${secondInstructor ? `
        <div class="profile-card" style="padding: 0.75rem; margin-top: 0.5rem;">
          <div class="profile-avatar" style="width: 40px; height: 40px; font-size: 1rem;">${secondInstructor.name.charAt(0)}</div>
          <div class="profile-info">
            <div class="profile-name" style="font-size: 1rem;">${secondInstructor.name}</div>
          </div>
        </div>
      ` : ''}
    </div>
    
    ${slot.dayType !== 'instructor_training' ? `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.75rem;">מתאמן</h4>
        ${trainee ? `
          <div class="profile-card" style="padding: 0.75rem;">
            <div class="profile-avatar" style="width: 40px; height: 40px; font-size: 1rem;">${trainee.name.charAt(0)}</div>
            <div class="profile-info">
              <div class="profile-name" style="font-size: 1rem;">${trainee.name}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${getLessonName(slot.lessonNumber || 1)}</div>
            </div>
          </div>
        ` : `
          <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); text-align: center; color: var(--text-muted);">
            ${slot.dayType === 'independent' ? 'אימון עצמאי - ללא מתאמן רשום' : 'אין מתאמן רשום'}
          </div>
        `}
      </div>
    ` : ''}
    
    ${slot.notes ? `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="margin-bottom: 0.5rem;">הערות מהשיעור הקודם</h4>
        <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: var(--radius-md); font-style: italic;">
          ${slot.notes}
        </div>
      </div>
    ` : ''}
  `;

    // Action buttons based on user role
    html += `<div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 1rem;">`;

    if (user) {
        // Instructor registration
        if (canRegisterAsInstructor() && !slot.leadInstructorId) {
            html += `<button class="btn btn-primary" onclick="registerAsLeadInstructor('${slot.id}')">הירשם כמדריך מוביל</button>`;
        }

        if (canRegisterAsInstructor() && slot.leadInstructorId && !slot.secondInstructorId && slot.leadInstructorId !== user.id) {
            html += `<button class="btn btn-secondary" onclick="registerAsSecondInstructor('${slot.id}')">הירשם כמדריך משני</button>`;
        }

        // Trainee registration
        if (canRegisterAsTrainee() && slot.leadInstructorId && !slot.traineeId && slot.dayType !== 'instructor_training') {
            if (slot.dayType === 'independent') {
                // Check if user is solo/graduate
                if (user.status === 'solo' || user.status === 'graduate') {
                    html += `<button class="btn btn-primary" onclick="registerAsTrainee('${slot.id}')">הירשם לאימון עצמאי</button>`;
                } else {
                    html += `<div style="color: var(--text-muted); font-size: 0.9rem;">אימון עצמאי זמין רק לבעלי סטטוס סולו/בוגר</div>`;
                }
            } else {
                html += `<button class="btn btn-primary" onclick="registerAsTrainee('${slot.id}')">הירשם לשיעור</button>`;
            }
        }

        // Cancel registration
        if (slot.leadInstructorId === user.id) {
            html += `<button class="btn btn-danger" onclick="cancelRegistration('${slot.id}', 'lead')">בטל רישום (מדריך מוביל)</button>`;
        }
        if (slot.secondInstructorId === user.id) {
            html += `<button class="btn btn-danger" onclick="cancelRegistration('${slot.id}', 'second')">בטל רישום (מדריך משני)</button>`;
        }
        if (slot.traineeId === user.id) {
            html += `<button class="btn btn-danger" onclick="cancelRegistration('${slot.id}', 'trainee')">בטל רישום</button>`;
        }
    }

    html += `</div>`;

    document.getElementById('slot-modal-title').textContent = 'פרטי משבצת';
    document.getElementById('slot-modal-content').innerHTML = html;
    showModal('modal-slot');
}

// ========================================
// Registration Functions
// ========================================

async function registerAsLeadInstructor(slotId) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        await updateSlot(slotId, { leadInstructorId: user.id });
        showToast('נרשמת בהצלחה כמדריך מוביל!', 'success');
        closeModal('modal-slot');
        renderCalendar();
    } catch (error) {
        showToast('שגיאה ברישום', 'error');
    }
}

async function registerAsSecondInstructor(slotId) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        await updateSlot(slotId, { secondInstructorId: user.id });
        showToast('נרשמת בהצלחה כמדריך משני!', 'success');
        closeModal('modal-slot');
        renderCalendar();
    } catch (error) {
        showToast('שגיאה ברישום', 'error');
    }
}

async function registerAsTrainee(slotId) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        await updateSlot(slotId, {
            traineeId: user.id,
            lessonNumber: user.currentLesson || 1
        });
        showToast('נרשמת בהצלחה לשיעור!', 'success');
        closeModal('modal-slot');
        renderCalendar();
    } catch (error) {
        showToast('שגיאה ברישום', 'error');
    }
}

async function cancelRegistration(slotId, type) {
    const user = getCurrentUser();
    if (!user) return;

    const confirmMsg = 'האם אתה בטוח שברצונך לבטל את הרישום?';
    if (!confirm(confirmMsg)) return;

    try {
        const updates = {};
        if (type === 'lead') updates.leadInstructorId = null;
        if (type === 'second') updates.secondInstructorId = null;
        if (type === 'trainee') updates.traineeId = null;

        await updateSlot(slotId, updates);
        await addLog({
            userId: user.id,
            action: 'registration_cancelled',
            details: `ביטול רישום (${type}) למשבצת ${slotId}`
        });

        showToast('הרישום בוטל', 'success');
        closeModal('modal-slot');
        renderCalendar();
    } catch (error) {
        showToast('שגיאה בביטול', 'error');
    }
}

// ========================================
// Training Day Creation (Admin)
// ========================================

async function createTrainingDay(event) {
    event.preventDefault();

    const date = document.getElementById('training-date').value;
    const dayType = document.getElementById('training-day-type').value;
    const recurring = document.getElementById('training-recurring').value;

    // Get time slots
    const timeInputs = document.querySelectorAll('.slot-time');
    const timeSlots = [];
    for (let i = 0; i < timeInputs.length; i += 2) {
        if (timeInputs[i] && timeInputs[i + 1]) {
            timeSlots.push({
                start: timeInputs[i].value,
                end: timeInputs[i + 1].value
            });
        }
    }

    if (timeSlots.length === 0) {
        showToast('יש להוסיף לפחות משבצת זמן אחת', 'error');
        return;
    }

    try {
        // Create slots for the date
        for (const timeSlot of timeSlots) {
            await createSlot({
                date,
                timeStart: timeSlot.start,
                timeEnd: timeSlot.end,
                dayType,
                leadInstructorId: null,
                secondInstructorId: null,
                traineeId: null,
                lessonNumber: null,
                notes: null
            });
        }

        // Handle recurring
        if (recurring !== 'none') {
            const weeks = recurring === 'weekly' ? 4 : 2;
            const interval = recurring === 'weekly' ? 7 : 14;

            for (let w = 1; w <= weeks; w++) {
                const recurDate = new Date(date);
                recurDate.setDate(recurDate.getDate() + (interval * w));
                const recurDateStr = recurDate.toISOString().split('T')[0];

                for (const timeSlot of timeSlots) {
                    await createSlot({
                        date: recurDateStr,
                        timeStart: timeSlot.start,
                        timeEnd: timeSlot.end,
                        dayType,
                        leadInstructorId: null,
                        secondInstructorId: null,
                        traineeId: null,
                        lessonNumber: null,
                        notes: null
                    });
                }
            }
        }

        showToast('יום האימון נוצר בהצלחה!', 'success');
        event.target.reset();
        renderCalendar();
    } catch (error) {
        showToast('שגיאה ביצירת יום האימון', 'error');
    }
}

function addTimeSlot() {
    const container = document.getElementById('time-slots-container');
    const newRow = document.createElement('div');
    newRow.className = 'time-slot-row';
    newRow.style.cssText = 'display: flex; gap: 1rem; margin-bottom: 0.5rem;';
    newRow.innerHTML = `
    <input type="time" class="form-input slot-time" value="10:00" style="flex: 1;">
    <input type="time" class="form-input slot-time" value="11:30" style="flex: 1;">
    <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
  `;
    container.appendChild(newRow);
}

// ========================================
// Export and Global Functions
// ========================================

window.openDayView = openDayView;
window.openSlotModal = openSlotModal;
window.changeMonth = changeMonth;
window.registerAsLeadInstructor = registerAsLeadInstructor;
window.registerAsSecondInstructor = registerAsSecondInstructor;
window.registerAsTrainee = registerAsTrainee;
window.cancelRegistration = cancelRegistration;
window.createTrainingDay = createTrainingDay;
window.addTimeSlot = addTimeSlot;

export { renderCalendar, changeMonth, createTrainingDay };
