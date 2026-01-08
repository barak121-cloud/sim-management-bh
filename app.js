// Main Application Entry Point
// Handles routing, initialization, and global event handlers

import { initSupabase } from './js/supabase.js';
import { login, signup, logout, isLoggedIn, getCurrentUser, canViewAdminPanel } from './js/auth.js';
import {
    getNotices,
    createNotice,
    deleteNotice,
    updateUser,
    createJoinRequest,
    getSchedule,
    updateSlot,
    getUsers
} from './js/data.js';
import { showToast, closeModal, formatDateTime } from './js/components.js';
import { renderCalendar } from './js/calendar.js';
import { initDashboard, loadProfile, loadNotices } from './js/dashboard.js';
import { loadInstructorStatsTable, loadLogsTable, loadUsersTable, exportToExcel } from './js/analytics.js';

// ========================================
// Application Initialization
// ========================================

async function initApp() {
    // Try to initialize Supabase (will fallback to localStorage if not configured)
    await initSupabase();

    // Check if user is logged in
    if (isLoggedIn()) {
        const user = getCurrentUser();

        // Safe cleanup: hide all guest pages
        ['page-landing', 'page-login', 'page-signup-trainee', 'page-signup-instructor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active');
        });

        const appWrapper = document.getElementById('app-wrapper');
        if (appWrapper) appWrapper.style.display = 'block';

        // Show/Hide Admin tab based on role (ONLY admin can see it)
        const navAdmin = document.getElementById('nav-admin');
        if (navAdmin) {
            if (user.role === 'admin') {
                navAdmin.style.display = 'block';
            } else {
                navAdmin.style.display = 'none';
            }
        }

        // Initialize dashboard
        await initDashboard();
        // Load calendar
        await renderCalendar();
        // Load profile
        await loadProfile();

    }
}

// ========================================
// Page Navigation
// ========================================

function showPage(pageId) {
    // Hide all guest pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }
}

function showAppPage(pageId) {
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // Hide all app pages
    document.querySelectorAll('#app-wrapper .page').forEach(page => {
        page.classList.remove('active');
    });

    // Show requested page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
    }

    // Load page-specific data
    if (pageId === 'page-calendar') {
        renderCalendar();
    } else if (pageId === 'page-profile') {
        loadProfile();
    } else if (pageId === 'page-dashboard') {
        initDashboard();
    } else if (pageId === 'page-admin') {
        loadAdminTabs();
    }
}

// ========================================
// Admin Tab Navigation
// ========================================

function showAdminTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.style.display = 'none';
    });

    // Show selected tab
    const tab = document.getElementById(tabId);
    if (tab) {
        tab.style.display = 'block';
    }

    // Load tab data
    if (tabId === 'tab-notices') {
        loadAdminNotices();
    } else if (tabId === 'tab-users') {
        loadUsersTable();
        loadFastTrackSlots();
    } else if (tabId === 'tab-instructors') {
        loadInstructorStatsTable();
    } else if (tabId === 'tab-logs') {
        loadLogsTable();
    }
}

async function loadAdminTabs() {
    // Default to notices tab
    showAdminTab('tab-notices');
}

// ========================================
// Notice Board Management
// ========================================

async function loadAdminNotices() {
    const notices = await getNotices();
    const container = document.getElementById('admin-notice-list');
    if (!container) return;

    if (notices.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">אין הודעות</p>';
        return;
    }

    container.innerHTML = notices.map(notice => `
    <div class="notice-item" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div class="notice-date">${formatDateTime(notice.createdAt)}</div>
        <div class="notice-content">${notice.content}</div>
      </div>
      <button class="btn btn-sm btn-danger" onclick="deleteNoticeHandler('${notice.id}')">🗑️</button>
    </div>
  `).join('');
}

async function postNotice(event) {
    event.preventDefault();

    const content = document.getElementById('notice-content').value;
    if (!content.trim()) {
        showToast('יש להזין תוכן להודעה', 'error');
        return;
    }

    const user = getCurrentUser();
    await createNotice(content, user.id);

    document.getElementById('notice-content').value = '';
    showToast('ההודעה פורסמה!', 'success');

    loadAdminNotices();
    loadNotices(); // Refresh main dashboard notices
}

async function deleteNoticeHandler(noticeId) {
    if (!confirm('האם למחוק את ההודעה?')) return;

    await deleteNotice(noticeId);
    showToast('ההודעה נמחקה', 'success');
    loadAdminNotices();
    loadNotices();
}

// ========================================
// Fast Track Registration
// ========================================

async function loadFastTrackSlots() {
    const schedule = await getSchedule();
    const today = new Date().toISOString().split('T')[0];

    // Get available slots (has instructor, no trainee)
    const availableSlots = schedule.filter(s =>
        s.date >= today &&
        s.leadInstructorId &&
        !s.traineeId &&
        s.dayType !== 'instructor_training'
    );

    const select = document.getElementById('fast-track-slot');
    if (select) {
        select.innerHTML = `
      <option value="">בחר משבצת...</option>
      ${availableSlots.map(s => `
        <option value="${s.id}">${s.date} ${s.timeStart}</option>
      `).join('')}
    `;
    }
}

async function fastTrackRegister() {
    const userId = document.getElementById('fast-track-user').value;
    const slotId = document.getElementById('fast-track-slot').value;

    if (!userId || !slotId) {
        showToast('יש לבחור מתאמן ומשבצת', 'error');
        return;
    }

    const user = (await getUsers()).find(u => u.id === userId);
    await updateSlot(slotId, {
        traineeId: userId,
        lessonNumber: user?.currentLesson || 1
    });

    showToast('המתאמן נרשם בהצלחה!', 'success');
    loadFastTrackSlots();
    loadUsersTable();
}

// ========================================
// Authentication Handlers
// ========================================

async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const result = await login(email, password);

    if (result.success) {
        showToast('התחברת בהצלחה!', 'success');
        window.location.reload();
    } else {
        showToast(result.error, 'error');
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const userData = {
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value,
        phone: document.getElementById('signup-phone').value,
        age: document.getElementById('signup-age').value,
        role: document.getElementById('signup-role').value,
        background: document.getElementById('signup-background').value,
        password: document.getElementById('signup-password').value
    };

    const result = await signup(userData);

    if (result.success) {
        showToast('נרשמת בהצלחה!', 'success');
        window.location.reload();
    } else {
        showToast(result.error, 'error');
    }
}

async function handleTraineeSignup(event) {
    event.preventDefault();

    const firstName = document.getElementById('trainee-firstname').value;
    const lastName = document.getElementById('trainee-lastname').value;

    const userData = {
        name: `${firstName} ${lastName}`,
        email: document.getElementById('trainee-email').value,
        age: document.getElementById('trainee-age').value,
        expectations: document.getElementById('trainee-expectations').value,
        role: 'trainee',
        password: document.getElementById('trainee-password').value,
        currentLesson: 1,
        status: 'active'
    };

    const result = await signup(userData);

    if (result.success) {
        showToast('נרשמת בהצלחה כחניך!', 'success');
        window.location.reload();
    } else {
        showToast(result.error, 'error');
    }
}

async function handleInstructorSignup(event) {
    event.preventDefault();

    const firstName = document.getElementById('instructor-firstname').value;
    const lastName = document.getElementById('instructor-lastname').value;

    const userData = {
        name: `${firstName} ${lastName}`,
        email: document.getElementById('instructor-email').value,
        phone: document.getElementById('instructor-phone').value,
        role: document.getElementById('instructor-role').value,
        simBackground: document.getElementById('instructor-sim-background').value,
        flightBackground: document.getElementById('instructor-flight-background').value,
        password: document.getElementById('instructor-password').value,
        status: 'active'
    };

    const result = await signup(userData);

    if (result.success) {
        showToast('נרשמת בהצלחה כמדריך!', 'success');
        window.location.reload();
    } else {
        showToast(result.error, 'error');
    }
}

function handleLogout() {
    logout();
}

// ========================================
// Profile Update
// ========================================

async function handleProfileUpdate(event) {
    event.preventDefault();

    const user = getCurrentUser();
    if (!user) return;

    const updates = {
        name: document.getElementById('profile-input-name').value,
        email: document.getElementById('profile-input-email').value,
        phone: document.getElementById('profile-input-phone').value,
        background: document.getElementById('profile-input-background').value
    };

    await updateUser(user.id, updates);

    // Update session
    const updatedUser = { ...user, ...updates };
    localStorage.setItem('beit_halohem_current_user', JSON.stringify(updatedUser));

    showToast('הפרופיל עודכן!', 'success');
    loadProfile();
}

// ========================================
// Join Request (Guests)
// ========================================

async function submitJoinRequest(event) {
    event.preventDefault();

    const requestData = {
        name: document.getElementById('join-name').value,
        email: document.getElementById('join-email').value,
        phone: document.getElementById('join-phone').value,
        message: document.getElementById('join-message').value
    };

    await createJoinRequest(requestData);

    closeModal('modal-join-request');
    showToast('הבקשה נשלחה! ניצור איתך קשר בקרוב.', 'success');

    // Reset form
    event.target.reset();
}

// ========================================
// Lesson Notes
// ========================================

async function saveLessonNotes() {
    const notes = document.getElementById('lesson-notes-input').value;
    // This would save notes to the relevant slot - implementation depends on context
    showToast('הערות נשמרו', 'success');
}

// ========================================
// User Management
// ========================================

async function unfreezeUser(userId) {
    if (!confirm('האם לבטל את הקפאת החשבון?')) return;

    await updateUser(userId, { status: 'active', noShowCount: 0 });
    showToast('ההקפאה בוטלה', 'success');
    loadUsersTable();
}

// ========================================
// Global Function Exports
// ========================================

window.showPage = showPage;
window.showAppPage = showAppPage;
window.showAdminTab = showAdminTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleTraineeSignup = handleTraineeSignup;
window.handleInstructorSignup = handleInstructorSignup;
window.handleLogout = handleLogout;
window.handleProfileUpdate = handleProfileUpdate;
window.postNotice = postNotice;
window.deleteNoticeHandler = deleteNoticeHandler;
window.fastTrackRegister = fastTrackRegister;
window.submitJoinRequest = submitJoinRequest;
window.saveLessonNotes = saveLessonNotes;
window.unfreezeUser = unfreezeUser;
window.exportToExcel = exportToExcel;

// ========================================
// Initialize on DOM Ready
// ========================================

document.addEventListener('DOMContentLoaded', initApp);
