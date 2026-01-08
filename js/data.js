// Data Layer - Database Operations
// Correctly maps to Supabase snake_case column names
// Falls back to localStorage if Supabase is not configured

import { getSupabase, initSupabase } from './supabase.js';

// ========================================
// Data Store (localStorage fallback)
// ========================================

const STORAGE_KEYS = {
    USERS: 'beit_halohem_users',
    SCHEDULE: 'beit_halohem_schedule',
    LOGS: 'beit_halohem_logs',
    NOTICES: 'beit_halohem_notices',
    INSTRUCTOR_STATS: 'beit_halohem_instructor_stats',
    JOIN_REQUESTS: 'beit_halohem_join_requests',
    CURRENT_USER: 'beit_halohem_current_user'
};

// ========================================
// Field Mapping: JavaScript <-> Supabase
// ========================================

// Convert camelCase to snake_case for Supabase
function toSnakeCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const snakeCaseObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        snakeCaseObj[snakeKey] = value;
    }
    return snakeCaseObj;
}

// Convert snake_case to camelCase for JavaScript
function toCamelCase(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const camelCaseObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camelCaseObj[camelKey] = value;
    }
    return camelCaseObj;
}

// Convert array of objects
function toCamelCaseArray(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(toCamelCase);
}

// Initialize with demo data if empty
function initializeLocalStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([
            {
                id: 'admin-1',
                name: 'אדמין ראשי',
                email: 'admin@beithalohem.org',
                phone: '050-1234567',
                role: 'admin',
                status: 'active',
                background: 'מנהל מערכת',
                noShowCount: 0,
                totalHours: 0,
                currentLesson: 1,
                password: 'admin123',
                createdAt: new Date().toISOString()
            }
        ]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SCHEDULE)) {
        localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.NOTICES)) {
        localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify([
            {
                id: 'notice-1',
                content: 'ברוכים הבאים למערכת ניהול הסימולטור!',
                createdAt: new Date().toISOString(),
                createdBy: 'admin-1'
            }
        ]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.INSTRUCTOR_STATS)) {
        localStorage.setItem(STORAGE_KEYS.INSTRUCTOR_STATS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.JOIN_REQUESTS)) {
        localStorage.setItem(STORAGE_KEYS.JOIN_REQUESTS, JSON.stringify([]));
    }
}

// ========================================
// User Operations
// ========================================

async function getUsers() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) return toCamelCaseArray(data);
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
}

async function getUserById(id) {
    const users = await getUsers();
    return users.find(u => u.id === id);
}

async function getUserByEmail(email) {
    const users = await getUsers();
    return users.find(u => u.email === email);
}

async function createUser(userData) {
    const supabase = getSupabase();
    const newUser = {
        id: 'user-' + Date.now(),
        ...userData,
        noShowCount: 0,
        totalHours: 0,
        status: userData.role === 'trainee' ? 'in_training' : 'active',
        currentLesson: 1,
        createdAt: new Date().toISOString()
    };

    if (supabase) {
        // Convert to snake_case for Supabase
        const supabaseData = {
            name: newUser.name,
            email: newUser.email,
            phone: newUser.phone,
            age: newUser.age,
            role: newUser.role,
            status: newUser.status,
            background: newUser.background,
            password: newUser.password,
            no_show_count: 0,
            total_hours: 0,
            current_lesson: 1
        };

        const { data, error } = await supabase.from('users').insert(supabaseData).select();
        if (!error && data) return toCamelCase(data[0]);
    }

    const users = await getUsers();
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return newUser;
}

async function updateUser(id, updates) {
    const supabase = getSupabase();

    if (supabase) {
        // Convert updates to snake_case
        const supabaseUpdates = {};
        if (updates.name !== undefined) supabaseUpdates.name = updates.name;
        if (updates.email !== undefined) supabaseUpdates.email = updates.email;
        if (updates.phone !== undefined) supabaseUpdates.phone = updates.phone;
        if (updates.age !== undefined) supabaseUpdates.age = updates.age;
        if (updates.background !== undefined) supabaseUpdates.background = updates.background;
        if (updates.status !== undefined) supabaseUpdates.status = updates.status;
        if (updates.noShowCount !== undefined) supabaseUpdates.no_show_count = updates.noShowCount;
        if (updates.totalHours !== undefined) supabaseUpdates.total_hours = updates.totalHours;
        if (updates.currentLesson !== undefined) supabaseUpdates.current_lesson = updates.currentLesson;

        const { data, error } = await supabase
            .from('users')
            .update(supabaseUpdates)
            .eq('id', id)
            .select();
        if (!error && data) return toCamelCase(data[0]);
    }

    const users = await getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
        users[index] = { ...users[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
        return users[index];
    }
    return null;
}

async function incrementNoShow(userId) {
    const user = await getUserById(userId);
    if (!user) return null;

    const newCount = (user.noShowCount || 0) + 1;
    const updates = { noShowCount: newCount };

    // Auto-freeze at 3 no-shows
    if (newCount >= 3) {
        updates.status = 'frozen';
    }

    await updateUser(userId, updates);

    // Log the no-show
    await addLog({
        userId,
        action: 'no_show',
        details: `פסילה מספר ${newCount}${newCount >= 3 ? ' - החשבון הוקפא' : ''}`
    });

    return { ...user, ...updates };
}

async function removeNoShowStrike(userId, reason, notes) {
    const user = await getUserById(userId);
    if (!user || user.noShowCount <= 0) return null;

    const newCount = user.noShowCount - 1;
    const updates = { noShowCount: newCount };

    // Unfreeze if was frozen and now under 3
    if (user.status === 'frozen' && newCount < 3) {
        updates.status = 'active';
    }

    await updateUser(userId, updates);

    // Log the removal
    await addLog({
        userId,
        action: 'noshow_removed',
        details: `הוסרה פסילה. סיבה: ${reason}. ${notes || ''}`
    });

    return { ...user, ...updates };
}

// ========================================
// Schedule Operations
// ========================================

async function getSchedule() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase.from('schedule').select('*');
        if (!error && data) {
            // Map snake_case columns to camelCase
            return data.map(slot => ({
                id: slot.id,
                date: slot.date,
                timeStart: slot.time_start,
                timeEnd: slot.time_end,
                dayType: slot.day_type,
                leadInstructorId: slot.lead_instructor_id,
                secondInstructorId: slot.second_instructor_id,
                traineeId: slot.trainee_id,
                lessonNumber: slot.lesson_number,
                notes: slot.notes,
                completed: slot.completed,
                attendanceMarked: slot.attendance_marked,
                createdAt: slot.created_at
            }));
        }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE) || '[]');
}

async function getScheduleByDate(date) {
    const schedule = await getSchedule();
    return schedule.filter(s => s.date === date);
}

async function getScheduleByMonth(year, month) {
    const schedule = await getSchedule();
    return schedule.filter(s => {
        const d = new Date(s.date);
        return d.getFullYear() === year && d.getMonth() === month;
    });
}

async function createSlot(slotData) {
    const supabase = getSupabase();
    const slotId = 'slot-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    if (supabase) {
        // Map to snake_case for Supabase
        const supabaseSlot = {
            date: slotData.date,
            time_start: slotData.timeStart,
            time_end: slotData.timeEnd,
            day_type: slotData.dayType,
            lead_instructor_id: slotData.leadInstructorId || null,
            second_instructor_id: slotData.secondInstructorId || null,
            trainee_id: slotData.traineeId || null,
            lesson_number: slotData.lessonNumber || null,
            notes: slotData.notes || null,
            completed: false,
            attendance_marked: false
        };

        const { data, error } = await supabase.from('schedule').insert(supabaseSlot).select();
        if (!error && data) {
            return {
                id: data[0].id,
                date: data[0].date,
                timeStart: data[0].time_start,
                timeEnd: data[0].time_end,
                dayType: data[0].day_type,
                leadInstructorId: data[0].lead_instructor_id,
                secondInstructorId: data[0].second_instructor_id,
                traineeId: data[0].trainee_id,
                lessonNumber: data[0].lesson_number,
                notes: data[0].notes,
                completed: data[0].completed,
                attendanceMarked: data[0].attendance_marked,
                createdAt: data[0].created_at
            };
        }
    }

    // localStorage fallback
    const newSlot = {
        id: slotId,
        ...slotData,
        completed: false,
        attendanceMarked: false,
        createdAt: new Date().toISOString()
    };

    const schedule = await getSchedule();
    schedule.push(newSlot);
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
    return newSlot;
}

async function updateSlot(id, updates) {
    const supabase = getSupabase();

    if (supabase) {
        // Convert updates to snake_case
        const supabaseUpdates = {};
        if (updates.leadInstructorId !== undefined) supabaseUpdates.lead_instructor_id = updates.leadInstructorId;
        if (updates.secondInstructorId !== undefined) supabaseUpdates.second_instructor_id = updates.secondInstructorId;
        if (updates.traineeId !== undefined) supabaseUpdates.trainee_id = updates.traineeId;
        if (updates.lessonNumber !== undefined) supabaseUpdates.lesson_number = updates.lessonNumber;
        if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
        if (updates.completed !== undefined) supabaseUpdates.completed = updates.completed;
        if (updates.attendanceMarked !== undefined) supabaseUpdates.attendance_marked = updates.attendanceMarked;

        const { data, error } = await supabase
            .from('schedule')
            .update(supabaseUpdates)
            .eq('id', id)
            .select();

        if (!error && data) {
            return {
                id: data[0].id,
                date: data[0].date,
                timeStart: data[0].time_start,
                timeEnd: data[0].time_end,
                dayType: data[0].day_type,
                leadInstructorId: data[0].lead_instructor_id,
                secondInstructorId: data[0].second_instructor_id,
                traineeId: data[0].trainee_id,
                lessonNumber: data[0].lesson_number,
                notes: data[0].notes
            };
        }
    }

    const schedule = await getSchedule();
    const index = schedule.findIndex(s => s.id === id);
    if (index !== -1) {
        schedule[index] = { ...schedule[index], ...updates };
        localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
        return schedule[index];
    }
    return null;
}

async function deleteSlot(id, userId) {
    const supabase = getSupabase();
    const schedule = await getSchedule();
    const slot = schedule.find(s => s.id === id);

    if (supabase) {
        await supabase.from('schedule').delete().eq('id', id);
    } else {
        const filtered = schedule.filter(s => s.id !== id);
        localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(filtered));
    }

    // Log cancellation
    if (slot) {
        await addLog({
            userId,
            action: 'slot_cancelled',
            details: `בוטלה משבצת בתאריך ${slot.date} בשעה ${slot.timeStart}`
        });
    }

    return true;
}

// ========================================
// Notice Board Operations
// ========================================

async function getNotices() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase
            .from('notices')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) {
            return data.map(n => ({
                id: n.id,
                content: n.content,
                createdBy: n.created_by,
                createdAt: n.created_at
            }));
        }
    }
    const notices = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTICES) || '[]');
    return notices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function createNotice(content, createdBy) {
    const supabase = getSupabase();

    if (supabase) {
        const supabaseNotice = {
            content,
            created_by: createdBy
        };

        const { data, error } = await supabase.from('notices').insert(supabaseNotice).select();
        if (!error && data) {
            return {
                id: data[0].id,
                content: data[0].content,
                createdBy: data[0].created_by,
                createdAt: data[0].created_at
            };
        }
    }

    const newNotice = {
        id: 'notice-' + Date.now(),
        content,
        createdBy,
        createdAt: new Date().toISOString()
    };

    const notices = await getNotices();
    notices.unshift(newNotice);
    localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(notices));
    return newNotice;
}

async function deleteNotice(id) {
    const supabase = getSupabase();

    if (supabase) {
        await supabase.from('notices').delete().eq('id', id);
    } else {
        const notices = await getNotices();
        const filtered = notices.filter(n => n.id !== id);
        localStorage.setItem(STORAGE_KEYS.NOTICES, JSON.stringify(filtered));
    }
    return true;
}

// ========================================
// Logs Operations
// ========================================

async function getLogs() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase
            .from('logs')
            .select('*')
            .order('timestamp', { ascending: false });
        if (!error && data) {
            return data.map(l => ({
                id: l.id,
                userId: l.user_id,
                action: l.action,
                details: l.details,
                timestamp: l.timestamp
            }));
        }
    }
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function addLog(logData) {
    const supabase = getSupabase();

    if (supabase) {
        const supabaseLog = {
            user_id: logData.userId,
            action: logData.action,
            details: logData.details
        };

        await supabase.from('logs').insert(supabaseLog);
    } else {
        const newLog = {
            id: 'log-' + Date.now(),
            ...logData,
            timestamp: new Date().toISOString()
        };
        const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS) || '[]');
        logs.push(newLog);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    }
    return logData;
}

// ========================================
// Instructor Stats Operations
// ========================================

async function getInstructorStats() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase.from('instructor_stats').select('*');
        if (!error && data) {
            return data.map(s => ({
                id: s.id,
                instructorId: s.instructor_id,
                lessonType: s.lesson_type,
                hours: s.hours
            }));
        }
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.INSTRUCTOR_STATS) || '[]');
}

async function updateInstructorStats(instructorId, lessonType, hours) {
    const supabase = getSupabase();
    const stats = await getInstructorStats();
    const existing = stats.find(s => s.instructorId === instructorId && s.lessonType === lessonType);

    if (supabase) {
        if (existing) {
            await supabase
                .from('instructor_stats')
                .update({ hours: existing.hours + hours })
                .eq('id', existing.id);
        } else {
            await supabase.from('instructor_stats').insert({
                instructor_id: instructorId,
                lesson_type: lessonType,
                hours
            });
        }
    } else {
        if (existing) {
            existing.hours += hours;
        } else {
            stats.push({
                id: 'stat-' + Date.now(),
                instructorId,
                lessonType,
                hours
            });
        }
        localStorage.setItem(STORAGE_KEYS.INSTRUCTOR_STATS, JSON.stringify(stats));
    }

    // Also update user's total hours
    const user = await getUserById(instructorId);
    if (user) {
        await updateUser(instructorId, { totalHours: (user.totalHours || 0) + hours });
    }

    return stats;
}

async function getInstructorStatsByUser(instructorId) {
    const stats = await getInstructorStats();
    return stats.filter(s => s.instructorId === instructorId);
}

// ========================================
// Join Requests Operations
// ========================================

async function getJoinRequests() {
    const supabase = getSupabase();
    if (supabase) {
        const { data, error } = await supabase.from('join_requests').select('*');
        if (!error && data) return toCamelCaseArray(data);
    }
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.JOIN_REQUESTS) || '[]');
}

async function createJoinRequest(requestData) {
    const supabase = getSupabase();

    if (supabase) {
        const supabaseRequest = {
            name: requestData.name,
            email: requestData.email,
            phone: requestData.phone,
            message: requestData.message,
            status: 'pending'
        };

        const { data, error } = await supabase.from('join_requests').insert(supabaseRequest).select();
        if (!error && data) return toCamelCase(data[0]);
    }

    const newRequest = {
        id: 'request-' + Date.now(),
        ...requestData,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    const requests = await getJoinRequests();
    requests.push(newRequest);
    localStorage.setItem(STORAGE_KEYS.JOIN_REQUESTS, JSON.stringify(requests));
    return newRequest;
}

// ========================================
// Session Management
// ========================================

function getCurrentUser() {
    const userJson = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
    if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
}

// ========================================
// Helper Functions
// ========================================

function getRoleName(role) {
    const roleNames = {
        'admin': 'אדמין',
        'staff': 'גורם ניהולי',
        'instructor_senior': 'מדריך ותיק',
        'instructor_junior': 'מדריך חדש',
        'trainee': 'מתאמן'
    };
    return roleNames[role] || role;
}

function getStatusName(status) {
    const statusNames = {
        'active': 'פעיל',
        'in_training': 'בהכשרה',
        'solo': 'סולו',
        'graduate': 'בוגר',
        'frozen': 'מוקפא'
    };
    return statusNames[status] || status;
}

function canRegisterIndependent(status) {
    return status === 'solo' || status === 'graduate';
}

function isInstructor(role) {
    return role === 'instructor_senior' || role === 'instructor_junior';
}

function isAdmin(role) {
    return role === 'admin';
}

function isStaff(role) {
    return role === 'staff' || role === 'admin';
}

// Initialize on load
initializeLocalStorage();

export {
    // Users
    getUsers,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    incrementNoShow,
    removeNoShowStrike,

    // Schedule
    getSchedule,
    getScheduleByDate,
    getScheduleByMonth,
    createSlot,
    updateSlot,
    deleteSlot,

    // Notices
    getNotices,
    createNotice,
    deleteNotice,

    // Logs
    getLogs,
    addLog,

    // Instructor Stats
    getInstructorStats,
    updateInstructorStats,
    getInstructorStatsByUser,

    // Join Requests
    getJoinRequests,
    createJoinRequest,

    // Session
    getCurrentUser,
    setCurrentUser,

    // Helpers
    getRoleName,
    getStatusName,
    canRegisterIndependent,
    isInstructor,
    isAdmin,
    isStaff
};
