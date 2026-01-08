// סילבוס הקורס - Flight Simulator Syllabus
// 10 Lessons for the training program

const SYLLABUS = [
    {
        number: 1,
        name: "היכרות עם הסימולטור והטסה בסיסית",
        nameEn: "Simulator Introduction & Basic Flight"
    },
    {
        number: 2,
        name: "מצבי טיסה בסיסיים חלק א'",
        nameEn: "Basic Flight Conditions Part A"
    },
    {
        number: 3,
        name: "מצבי טיסה בסיסיים חלק ב'",
        nameEn: "Basic Flight Conditions Part B"
    },
    {
        number: 4,
        name: "המראה ונחיתה חלק א'",
        nameEn: "Takeoff & Landing Part A"
    },
    {
        number: 5,
        name: "המראה ונחיתה חלק ב'",
        nameEn: "Takeoff & Landing Part B"
    },
    {
        number: 6,
        name: "המראה ונחיתה על המים",
        nameEn: "Water Landing"
    },
    {
        number: 7,
        name: "בד\"ח, Glass Cockpit, והפעלה עצמית (סולו)",
        nameEn: "Pre-Flight Check, Glass Cockpit & Solo Operation"
    },
    {
        number: 8,
        name: "EFB וניווט בסיסי",
        nameEn: "EFB & Basic Navigation"
    },
    {
        number: 9,
        name: "ניווטים מתקדמים",
        nameEn: "Advanced Navigation"
    },
    {
        number: 10,
        name: "גלגל זנב, טיסת לילה והשלמות",
        nameEn: "Taildragger, Night Flight & Completion"
    }
];

// Get lesson by number
function getLesson(number) {
    return SYLLABUS.find(lesson => lesson.number === number);
}

// Get lesson display name (Hebrew)
function getLessonName(number) {
    const lesson = getLesson(number);
    return lesson ? `שיעור ${number}: ${lesson.name}` : `שיעור ${number}`;
}

// Get lesson display name (English)
function getLessonNameEn(number) {
    const lesson = getLesson(number);
    return lesson ? `Lesson ${number}: ${lesson.nameEn}` : `Lesson ${number}`;
}

// Get next lesson for trainee
function getNextLesson(currentLesson) {
    if (currentLesson >= 10) return null;
    return getLesson(currentLesson + 1);
}

export { SYLLABUS, getLesson, getLessonName, getLessonNameEn, getNextLesson };
