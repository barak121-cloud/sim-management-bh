// Attendance Module
// Handles no-show tracking, lesson completion, and attendance management

import {
    getScheduleByDate,
    updateSlot,
    getUserById,
    updateUser,
    incrementNoShow,
    removeNoShowStrike,
    addLog
} from './data.js';
import { getCurrentUser } from './auth.js';
import { showToast, closeModal } from './components.js';
import { getLessonName } from './syllabus.js';

// ========================================
// Attendance Marking
// ========================================

async function markAttendance(slotId, traineeId, attended) {
    const user = getCurrentUser();
    if (!user) return;

    try {
        if (attended) {
            // Mark as attended - complete the lesson
            await completeLesson(slotId, traineeId);
            showToast('נוכחות אושרה והשיעור הושלם!', 'success');
        } else {
            // Mark as no-show
            const result = await incrementNoShow(traineeId);

            if (result.status === 'frozen') {
                showToast(`המתאמן הוקפא לאחר ${result.noShowCount} אי-הגעות!`, 'warning');
                // Admin notification would be sent here
                await notifyAdminOfFreeze(result);
            } else {
                showToast(`אי-הגעה נרשמה (${result.noShowCount}/3)`, 'warning');
            }
        }

        // Update slot as completed
        await updateSlot(slotId, { completed: true, attendanceMarked: true });

    } catch (error) {
        console.error('Error marking attendance:', error);
        showToast('שגיאה בסימון נוכחות', 'error');
    }
}

// ========================================
// Lesson Completion
// ========================================

async function completeLesson(slotId, traineeId) {
    const trainee = await getUserById(traineeId);
    if (!trainee) return;

    const currentLesson = trainee.currentLesson || 1;
    const nextLesson = Math.min(currentLesson + 1, 10);

    // Update trainee's lesson progress
    const updates = {
        currentLesson: nextLesson
    };

    // Update status if completed lesson 10
    if (currentLesson >= 10) {
        updates.status = 'graduate';
    } else if (currentLesson >= 7) {
        // After lesson 7 (solo operation), update to solo status
        updates.status = 'solo';
    }

    await updateUser(traineeId, updates);

    // Log completion
    await addLog({
        userId: traineeId,
        action: 'lesson_completed',
        details: `השלים ${getLessonName(currentLesson)}`
    });
}

// ========================================
// No-Show Exception Handling
// ========================================

async function handleRemoveNoShow(event) {
    event.preventDefault();

    const userId = document.getElementById('noshow-user-id').value;
    const reason = document.getElementById('noshow-reason').value;
    const notes = document.getElementById('noshow-notes').value;

    if (!userId || !reason) {
        showToast('יש לבחור סיבה', 'error');
        return;
    }

    try {
        const reasonLabels = {
            'reserves': 'מילואים',
            'medical': 'מצב רפואי',
            'other': 'אחר'
        };

        await removeNoShowStrike(userId, reasonLabels[reason], notes);
        showToast('הפסילה הוסרה בהצלחה', 'success');
        closeModal('modal-remove-noshow');

        // Refresh the users table if visible
        if (typeof refreshUsersTable === 'function') {
            refreshUsersTable();
        }
    } catch (error) {
        console.error('Error removing no-show:', error);
        showToast('שגיאה בהסרת הפסילה', 'error');
    }
}

function openRemoveNoShowModal(userId) {
    document.getElementById('noshow-user-id').value = userId;
    document.getElementById('noshow-reason').value = '';
    document.getElementById('noshow-notes').value = '';
    showModal('modal-remove-noshow');
}

// ========================================
// Admin Notifications
// ========================================

async function notifyAdminOfFreeze(trainee) {
    // In a real app, this would send an email or push notification
    // For now, we'll add it to logs which admins can see
    await addLog({
        userId: trainee.id,
        action: 'account_frozen',
        details: `חשבון ${trainee.name} הוקפא לאחר 3 אי-הגעות`
    });
}

// ========================================
// Get Trainee's Next Lesson
// ========================================

async function getTraineeNextLesson(traineeId) {
    const trainee = await getUserById(traineeId);
    if (!trainee) return null;

    const currentLesson = trainee.currentLesson || 1;
    return {
        number: currentLesson,
        name: getLessonName(currentLesson),
        isComplete: currentLesson > 10
    };
}

// ========================================
// Lesson Notes
// ========================================

async function saveLessonNotesForSlot(slotId, notes) {
    try {
        await updateSlot(slotId, { notes });
        showToast('הערות נשמרו', 'success');
    } catch (error) {
        showToast('שגיאה בשמירת הערות', 'error');
    }
}

// ========================================
// Global Functions
// ========================================

window.markAttendance = markAttendance;
window.openRemoveNoShowModal = openRemoveNoShowModal;
window.removeNoShow = handleRemoveNoShow;

export {
    markAttendance,
    completeLesson,
    handleRemoveNoShow,
    openRemoveNoShowModal,
    getTraineeNextLesson,
    saveLessonNotesForSlot
};
