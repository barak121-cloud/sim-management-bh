// UI Components Module
// Reusable UI components for the application

// ========================================
// Toast Notifications
// ========================================

let toastTimeout = null;

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Clear existing toasts
    container.innerHTML = '';

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span>${getToastIcon(type)}</span>
      <span>${message}</span>
    </div>
  `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// ========================================
// Modal Functions
// ========================================

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function closeModalOnOverlay(event) {
    if (event.target.classList.contains('modal-overlay')) {
        event.target.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ========================================
// Loading States
// ========================================

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 2rem; animation: pulse 1s infinite;">⏳</div>
        <p style="color: var(--text-secondary); margin-top: 1rem;">טוען...</p>
      </div>
    `;
    }
}

function showEmpty(containerId, message = 'אין נתונים להצגה') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2rem;">📭</div>
        <p style="margin-top: 0.5rem;">${message}</p>
      </div>
    `;
    }
}

// ========================================
// Confirmation Dialog
// ========================================

function confirm(message) {
    return window.confirm(message);
}

// ========================================
// Date/Time Formatting
// ========================================

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(timeStr) {
    return timeStr;
}

function formatDateTime(dateTimeStr) {
    const date = new Date(dateTimeStr);
    return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getHebrewMonthName(month) {
    const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    return months[month];
}

function getHebrewDayName(day) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[day];
}

// ========================================
// Table Rendering
// ========================================

function renderTable(containerId, headers, rows, emptyMessage = 'אין נתונים') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (rows.length === 0) {
        showEmpty(containerId, emptyMessage);
        return;
    }

    container.innerHTML = rows.map(row => `<tr>${row}</tr>`).join('');
}

// ========================================
// Form Helpers
// ========================================

function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

function resetForm(formId) {
    const form = document.getElementById(formId);
    if (form) form.reset();
}

// ========================================
// Lead Instructor Badge Component
// ========================================

function renderLeadBadge() {
    return '<span class="lead-badge">מוביל</span>';
}

// ========================================
// Progress Bar Component
// ========================================

function updateProgress(currentLesson) {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const currentLessonName = document.getElementById('current-lesson-name');

    if (progressFill && progressPercent) {
        const percent = (currentLesson / 10) * 100;
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${Math.round(percent)}%`;
    }
}

// ========================================
// Export all functions
// ========================================

// Make functions available globally for inline handlers
window.showModal = showModal;
window.closeModal = closeModal;
window.closeModalOnOverlay = closeModalOnOverlay;

export {
    showToast,
    showModal,
    closeModal,
    closeModalOnOverlay,
    showLoading,
    showEmpty,
    confirm,
    formatDate,
    formatTime,
    formatDateTime,
    getHebrewMonthName,
    getHebrewDayName,
    renderTable,
    getFormData,
    resetForm,
    renderLeadBadge,
    updateProgress
};
