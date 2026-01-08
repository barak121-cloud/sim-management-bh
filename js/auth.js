// Authentication Module
// Handles login, signup, and session management

import { getUserByEmail, createUser, getCurrentUser, setCurrentUser } from './data.js';

// ========================================
// Authentication Functions
// ========================================

async function login(email, password) {
    const user = await getUserByEmail(email);

    if (!user) {
        return { success: false, error: 'משתמש לא נמצא' };
    }

    if (user.password !== password) {
        return { success: false, error: 'סיסמה שגויה' };
    }

    if (user.status === 'frozen') {
        return { success: false, error: 'החשבון שלך מוקפא. פנה לאדמין.' };
    }

    setCurrentUser(user);
    return { success: true, user };
}

async function signup(userData) {
    // Check if email already exists
    const existing = await getUserByEmail(userData.email);
    if (existing) {
        return { success: false, error: 'כתובת האימייל כבר קיימת במערכת' };
    }

    // Create new user
    const user = await createUser(userData);
    setCurrentUser(user);
    return { success: true, user };
}

function logout() {
    setCurrentUser(null);
    window.location.reload();
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function requireAuth() {
    if (!isLoggedIn()) {
        showPage('page-login');
        return false;
    }
    return true;
}

function requireRole(...roles) {
    const user = getCurrentUser();
    if (!user) return false;
    return roles.includes(user.role);
}

// ========================================
// Role Checks
// ========================================

function canManageUsers() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'staff');
}

function canManageSchedule() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function canPostNotices() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

function canViewAdminPanel() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'staff');
}

function canMarkAttendance() {
    const user = getCurrentUser();
    return user && (user.role === 'admin' || user.role === 'instructor_senior' || user.role === 'instructor_junior');
}

function canRegisterAsInstructor() {
    const user = getCurrentUser();
    return user && (user.role === 'instructor_senior' || user.role === 'instructor_junior');
}

function canRegisterAsTrainee() {
    const user = getCurrentUser();
    return user && user.role === 'trainee';
}

function isLeadInstructor() {
    const user = getCurrentUser();
    return user && user.role === 'instructor_senior';
}

export {
    login,
    signup,
    logout,
    isLoggedIn,
    requireAuth,
    requireRole,
    canManageUsers,
    canManageSchedule,
    canPostNotices,
    canViewAdminPanel,
    canMarkAttendance,
    canRegisterAsInstructor,
    canRegisterAsTrainee,
    isLeadInstructor,
    getCurrentUser
};
