/* ==========================================================================
   MENTAL MATHS - ENGINE (VANILLA JS)
   ========================================================================= */

// Game State Object
const state = {
    screen: 'config', // 'config' | 'playing' | 'gameover'
    duration: 60, // in seconds
    timeLeft: 60,
    score: 0,
    combo: 1,
    maxCombo: 1,
    
    // Stats
    questionsAsked: 0,
    questionsCorrect: 0,
    questionsAttempted: 0, // total typed submissions / mistakes
    sessionHistory: [], // array of { text, userAns, correctAns, correct, time }
    
    // Math Generation
    currentQuestion: null, // { text, answer, op }
    questionStartTime: 0,
    hasMistakeOnCurrent: false,
    firstWrongInput: null, // first invalid input typed on the current question
    
    // Timers & Loops
    timerInterval: null,
    comboAnimationFrame: null,
    
    // Configuration
    config: {
        ops: {
            add: true,
            sub: true,
            mul: true,
            div: true
        },
        ranges: {
            add: { min1: 2, max1: 100, min2: 2, max2: 100 },
            sub: { min1: 2, max1: 100, min2: 2, max2: 100 },
            mul: { min1: 2, max1: 12, min2: 2, max2: 12 },
            div: { min1: 2, max1: 12, min2: 2, max2: 100 } // min1/max1 = diviseur, min2/max2 = quotient
        }
    }
};

// Session Mode Presets
const presets = {
    easy: {
        ops: { add: true, sub: true, mul: false, div: false },
        ranges: {
            add: { min1: 2, max1: 20, min2: 2, max2: 20 },
            sub: { min1: 2, max1: 20, min2: 2, max2: 20 },
            mul: { min1: 2, max1: 12, min2: 2, max2: 12 },
            div: { min1: 2, max1: 12, min2: 2, max2: 100 }
        }
    },
    medium: {
        ops: { add: true, sub: true, mul: true, div: true },
        ranges: {
            add: { min1: 2, max1: 100, min2: 2, max2: 100 },
            sub: { min1: 2, max1: 100, min2: 2, max2: 100 },
            mul: { min1: 2, max1: 12, min2: 2, max2: 12 },
            div: { min1: 2, max1: 12, min2: 2, max2: 100 }
        }
    },
    hard: {
        ops: { add: true, sub: true, mul: true, div: true },
        ranges: {
            add: { min1: 10, max1: 1000, min2: 10, max2: 1000 },
            sub: { min1: 10, max1: 1000, min2: 10, max2: 1000 },
            mul: { min1: 2, max1: 100, min2: 2, max2: 20 },
            div: { min1: 2, max1: 20, min2: 2, max2: 100 }
        }
    }
};

// DOM Elements
const elements = {
    // Screens
    configScreen: document.getElementById('configScreen'),
    gameScreen: document.getElementById('gameScreen'),
    gameOverScreen: document.getElementById('gameOverScreen'),
    
    // Progress & Timer
    progressBar: document.getElementById('progressBar'),
    timer: document.getElementById('timer'),
    score: document.getElementById('score'),
    combo: document.getElementById('combo'),
    comboGauge: document.getElementById('comboGauge'),
    
    // Arena
    mathQuestion: document.getElementById('mathQuestion'),
    answerInput: document.getElementById('answerInput'),
    gameArena: document.getElementById('gameArena'),
    
    // Game over details
    finalScore: document.getElementById('finalScore'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    finalSpeed: document.getElementById('finalSpeed'),
    finalMaxCombo: document.getElementById('finalMaxCombo'),
    questionsLog: document.getElementById('questionsLog'),
    
    // Buttons
    startBtn: document.getElementById('startBtn'),
    restartBtn: document.getElementById('restartBtn'),
    toConfigBtn: document.getElementById('toConfigBtn'),
    
    // Leaderboard
    scoreboardBody: document.getElementById('scoreboardBody')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    loadLeaderboard();
    setupEventListeners();
    elements.answerInput.focus();
});

// Event Listeners
function setupEventListeners() {
    // Language buttons selection
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setLanguage(btn.getAttribute('data-lang'));
        });
    });

    // Preset buttons selection
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyPreset(btn.getAttribute('data-preset'));
        });
    });

    // If any setting input is modified, set preset to custom
    document.querySelectorAll('.settings-grid input').forEach(input => {
        input.addEventListener('change', () => {
            setPresetActiveButton('custom');
        });
        input.addEventListener('input', () => {
            setPresetActiveButton('custom');
        });
    });

    // Start session
    elements.startBtn.addEventListener('click', startSession);
    
    // Restart session
    elements.restartBtn.addEventListener('click', () => {
        startSession();
    });
    
    // Back to config
    elements.toConfigBtn.addEventListener('click', showConfigScreen);
    
    // Reactive input (The core "Zero-Clic" logic)
    elements.answerInput.addEventListener('input', handleInput);
    
    // Autofocus reinforcement during gameplay
    elements.gameArena.addEventListener('click', () => {
        if (state.screen === 'playing') {
            elements.answerInput.focus();
        }
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (state.screen === 'playing') {
            if (document.activeElement !== elements.answerInput) {
                elements.answerInput.focus();
            }
        }
        
        if (e.code === 'Space') {
            // Only trigger start/restart on Space if not typing in settings numeric inputs
            if (document.activeElement.tagName !== 'INPUT' || document.activeElement === elements.answerInput) {
                e.preventDefault();
                if (state.screen === 'config') {
                    startSession();
                } else if (state.screen === 'gameover') {
                    startSession();
                }
            }
        } else if (e.code === 'Escape') {
            e.preventDefault();
            if (state.screen === 'playing') {
                endSession(false); // Quit to config
            } else if (state.screen === 'gameover') {
                showConfigScreen();
            }
        } else if (e.code === 'Enter') {
            if (state.screen === 'config') {
                startSession();
            } else if (state.screen === 'gameover') {
                startSession();
            }
        }
    });
}

// Show specific screen
function setScreen(screenName) {
    state.screen = screenName;
    
    elements.configScreen.classList.remove('active');
    elements.gameScreen.classList.remove('active');
    elements.gameOverScreen.classList.remove('active');
    
    if (screenName === 'config') {
        elements.configScreen.classList.add('active');
    } else if (screenName === 'playing') {
        elements.gameScreen.classList.add('active');
        elements.answerInput.focus();
    } else if (screenName === 'gameover') {
        elements.gameOverScreen.classList.add('active');
    }
}

function showConfigScreen() {
    setScreen('config');
    elements.progressBar.style.width = '0%';
}

// Read settings from UI
function readSettings() {
    // Duration
    const durationRadio = document.querySelector('input[name="duration"]:checked');
    state.duration = parseInt(durationRadio ? durationRadio.value : 60, 10);
    
    // Operators
    state.config.ops.add = document.getElementById('op_add').checked;
    state.config.ops.sub = document.getElementById('op_sub').checked;
    state.config.ops.mul = document.getElementById('op_mul').checked;
    state.config.ops.div = document.getElementById('op_div').checked;
    
    // Ensure at least one operator is selected
    if (!state.config.ops.add && !state.config.ops.sub && !state.config.ops.mul && !state.config.ops.div) {
        state.config.ops.add = true;
        document.getElementById('op_add').checked = true;
    }
    
    // Helper to read min/max safely
    const getRange = (prefix) => {
        let min1 = parseInt(document.getElementById(`${prefix}_min1`).value, 10) || 2;
        let max1 = parseInt(document.getElementById(`${prefix}_max1`).value, 10) || 100;
        let min2 = parseInt(document.getElementById(`${prefix}_min2`).value, 10) || 2;
        let max2 = parseInt(document.getElementById(`${prefix}_max2`).value, 10) || 100;
        
        // Handle inverted inputs gracefully
        return {
            min1: Math.min(min1, max1),
            max1: Math.max(min1, max1),
            min2: Math.min(min2, max2),
            max2: Math.max(min2, max2)
        };
    };
    
    state.config.ranges.add = getRange('add');
    state.config.ranges.sub = getRange('sub');
    state.config.ranges.mul = getRange('mul');
    state.config.ranges.div = getRange('div');
}

// Start Session
function startSession() {
    readSettings();
    
    // Reset state
    state.timeLeft = state.duration;
    state.score = 0;
    state.combo = 1;
    state.maxCombo = 1;
    state.questionsAsked = 0;
    state.questionsCorrect = 0;
    state.questionsAttempted = 0;
    state.sessionHistory = [];
    
    // Update UI
    elements.score.textContent = '0';
    elements.combo.textContent = 'x1';
    elements.combo.className = 'stat-value font-mono';
    elements.timer.textContent = `${state.timeLeft}s`;
    elements.progressBar.style.width = '100%';
    elements.answerInput.value = '';
    
    // Show Screen
    setScreen('playing');
    
    // Start timers
    startTimer();
    generateNextQuestion();
}

// Timer Loop
function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    
    const startTime = Date.now();
    const totalDurationMs = state.duration * 1000;
    
    state.timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remainingMs = Math.max(0, totalDurationMs - elapsed);
        state.timeLeft = Math.ceil(remainingMs / 1000);
        
        elements.timer.textContent = `${state.timeLeft}s`;
        
        // Progress bar drains
        const percentage = (remainingMs / totalDurationMs) * 100;
        elements.progressBar.style.width = `${percentage}%`;
        
        if (remainingMs <= 0) {
            endSession(true);
        }
    }, 100);
}

// Math generation
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateNextQuestion() {
    // Select active operators
    const activeOps = [];
    if (state.config.ops.add) activeOps.push('+');
    if (state.config.ops.sub) activeOps.push('-');
    if (state.config.ops.mul) activeOps.push('×');
    if (state.config.ops.div) activeOps.push('÷');
    
    // Fallback if none (should not happen due to check)
    const op = activeOps[randomInt(0, activeOps.length - 1)] || '+';
    
    let text = '';
    let answer = 0;
    
    if (op === '+') {
        const r = state.config.ranges.add;
        const a = randomInt(r.min1, r.max1);
        const b = randomInt(r.min2, r.max2);
        text = `${a} + ${b}`;
        answer = a + b;
    } else if (op === '-') {
        const r = state.config.ranges.sub;
        let a = randomInt(r.min1, r.max1);
        let b = randomInt(r.min2, r.max2);
        // Guarantee positive results for continuous flow
        if (a < b) {
            const temp = a;
            a = b;
            b = temp;
        }
        text = `${a} - ${b}`;
        answer = a - b;
    } else if (op === '×') {
        const r = state.config.ranges.mul;
        const a = randomInt(r.min1, r.max1);
        const b = randomInt(r.min2, r.max2);
        text = `${a} × ${b}`;
        answer = a * b;
    } else if (op === '÷') {
        const r = state.config.ranges.div;
        // Zetamac division algorithm:
        // diviseur (d) in range 1
        // quotient (q) in range 2
        // dividend (a) = d * q
        // problem: a / d = q
        const d = randomInt(r.min1, r.max1);
        const q = randomInt(r.min2, r.max2);
        const a = d * q;
        text = `${a} ÷ ${d}`;
        answer = q;
    }
    
    state.currentQuestion = { text, answer, op };
    state.questionStartTime = Date.now();
    state.hasMistakeOnCurrent = false;
    state.firstWrongInput = null;
    
    elements.mathQuestion.textContent = `${text} =`;
    elements.answerInput.value = '';
    
    // Reset/start combo animation loop
    startComboGaugeAnimation();
}

// Combo Gauge Animation (60 FPS with requestAnimationFrame)
function startComboGaugeAnimation() {
    if (state.comboAnimationFrame) cancelAnimationFrame(state.comboAnimationFrame);
    
    const duration = 2000; // 2 seconds window to keep combo
    
    function tick() {
        if (state.screen !== 'playing') return;
        
        const elapsed = Date.now() - state.questionStartTime;
        const remaining = Math.max(0, duration - elapsed);
        const percentage = (remaining / duration) * 100;
        
        elements.comboGauge.style.width = `${percentage}%`;
        
        if (remaining > 0) {
            state.comboAnimationFrame = requestAnimationFrame(tick);
        } else {
            // When 2 seconds expire, we do NOT automatically end the combo unless they answer.
            // But visually, the bar remains empty (0%) indicating that answering now will reset the combo to x1.
            elements.comboGauge.style.width = '0%';
        }
    }
    
    state.comboAnimationFrame = requestAnimationFrame(tick);
}

// Handle Inputs dynamically (Zero Clic)
function handleInput(e) {
    if (state.screen !== 'playing' || !state.currentQuestion) return;
    
    const typedValue = elements.answerInput.value.trim();
    if (typedValue === '') return;
    
    const targetAnswerStr = state.currentQuestion.answer.toString();
    
    // Check if what they typed matches the final correct answer
    if (typedValue === targetAnswerStr) {
        handleCorrectAnswer();
    } else {
        // Zero-clic prefix matching: check if the typed string is still a valid prefix of the correct answer.
        // For example: correct answer is "45". If they typed "4", it's a valid prefix.
        // If they typed "5" or "4a", it is NOT a valid prefix.
        if (!targetAnswerStr.startsWith(typedValue)) {
            handleIncorrectInput(typedValue);
        }
    }
}

// Correct Answer flow
function handleCorrectAnswer() {
    const timeTaken = (Date.now() - state.questionStartTime) / 1000;
    
    // Check if answered within 2 seconds
    const withinComboWindow = timeTaken <= 2.0;
    
    if (withinComboWindow) {
        state.combo++;
        if (state.combo > state.maxCombo) {
            state.maxCombo = state.combo;
        }
        
        // Visual Pop on Combo
        elements.combo.classList.remove('combo-scale');
        void elements.combo.offsetWidth; // Force reflow
        elements.combo.classList.add('combo-scale');
    } else {
        state.combo = 1;
    }
    
    // Calculate Score
    const pointsAwarded = 10 * state.combo;
    state.score += pointsAwarded;
    state.questionsCorrect++;
    state.questionsAsked++;
    state.questionsAttempted++; // Correct submission counts as an attempt
    
    // Update Score Board
    elements.score.textContent = state.score;
    elements.combo.textContent = `x${state.combo}`;
    
    // Record in history
    state.sessionHistory.unshift({
        text: state.currentQuestion.text,
        userAns: state.firstWrongInput,
        correctAns: state.currentQuestion.answer,
        correct: !state.hasMistakeOnCurrent,
        time: timeTaken.toFixed(2)
    });
    
    // Instant Visual Flash
    flashArena('flash-correct');
    
    // Go to next question
    generateNextQuestion();
}

// Incorrect Input flow
function handleIncorrectInput(typedValue) {
    // Only count 1 mistake per question to avoid penalizing rapid typos too harshly
    if (!state.hasMistakeOnCurrent) {
        state.hasMistakeOnCurrent = true;
        state.firstWrongInput = typedValue;
        state.questionsAttempted++; // Count the mistake towards accuracy
        
        // Reset combo on mistake
        state.combo = 1;
        elements.combo.textContent = 'x1';
        elements.comboGauge.style.width = '0%';
        
        // Instant Visual Flash (Shake + Red border)
        flashArena('flash-incorrect');
    }
}

// Visual flash helper
function flashArena(className) {
    elements.gameArena.classList.remove('flash-correct', 'flash-incorrect');
    void elements.gameArena.offsetWidth; // Force reflow
    elements.gameArena.classList.add(className);
    
    // Auto remove after animation completes
    setTimeout(() => {
        elements.gameArena.classList.remove(className);
    }, 150);
}

// End Session
function endSession(completed = true) {
    // Stop all intervals and animations
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (state.comboAnimationFrame) cancelAnimationFrame(state.comboAnimationFrame);
    
    if (!completed) {
        showConfigScreen();
        return;
    }
    
    // If the user answered absolutely nothing, prevent Division by Zero
    const totalAttempts = Math.max(state.questionsAttempted, 1);
    const accuracy = Math.round((state.questionsCorrect / totalAttempts) * 100);
    const opsPerMin = Math.round((state.questionsCorrect / state.duration) * 60);
    
    // Populate Game Over Stats
    elements.finalScore.textContent = state.score;
    elements.finalAccuracy.textContent = `${accuracy}%`;
    elements.finalSpeed.textContent = opsPerMin;
    elements.finalMaxCombo.textContent = `x${state.maxCombo}`;
    
    // Save to LocalStorage Leaderboard
    saveToLeaderboard({
        date: new Date().toLocaleDateString(currentLang === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        duration: `${state.duration}s`,
        score: state.score,
        accuracy: `${accuracy}%`,
        maxCombo: `x${state.maxCombo}`,
        rawScore: state.score // for sorting
    });
    
    // Populate detailed logs of current session
    populateQuestionsLog();
    
    // Go to Game Over Screen
    setScreen('gameover');
}

// The answer field accepts free text, so user input must never reach innerHTML raw
function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

// Populate details table of current session
function populateQuestionsLog() {
    elements.questionsLog.innerHTML = '';
    
    const dict = translations[currentLang] || translations.fr;
    
    if (state.sessionHistory.length === 0) {
        elements.questionsLog.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--sub-color);">${dict.noAnswers}</td></tr>`;
        return;
    }
    
    state.sessionHistory.forEach(item => {
        const row = document.createElement('tr');
        
        const statusSpan = item.correct
            ? `<span class="status-badge correct">${dict.correctBadge}</span>`
            : `<span class="status-badge incorrect">${dict.incorrectBadge}</span>`;

        const answerCell = item.correct
            ? `<span class="log-correct-ans">${item.correctAns}</span>`
            : `<span class="log-incorrect-ans">${escapeHtml(item.userAns)}</span><span class="log-correct-ans">${item.correctAns}</span>`;

        row.innerHTML = `
            <td>${item.text}</td>
            <td>${answerCell}</td>
            <td>${statusSpan}</td>
            <td>${item.time}s</td>
        `;
        
        elements.questionsLog.appendChild(row);
    });
}

// Leaderboard Logic
function loadLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('mentalmath_scores')) || [];
    elements.scoreboardBody.innerHTML = '';
    
    const dict = translations[currentLang] || translations.fr;
    
    if (scores.length === 0) {
        elements.scoreboardBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table">${dict.emptyTable}</td>
            </tr>
        `;
        return;
    }
    
    scores.forEach((entry, idx) => {
        const row = document.createElement('tr');
        if (idx === 0) {
            row.className = 'new-high-score'; // highlight top score
        }
        
        row.innerHTML = `
            <td>${idx + 1}</td>
            <td>${entry.date}</td>
            <td>${entry.duration}</td>
            <td style="color: var(--main-color); font-weight: bold;">${entry.score}</td>
            <td>${entry.accuracy}</td>
            <td>${entry.maxCombo}</td>
        `;
        elements.scoreboardBody.appendChild(row);
    });
}

function saveToLeaderboard(newEntry) {
    let scores = JSON.parse(localStorage.getItem('mentalmath_scores')) || [];
    
    scores.push(newEntry);
    
    // Sort: score descending, then raw accuracy if same score
    scores.sort((a, b) => {
        if (b.rawScore !== a.rawScore) {
            return b.rawScore - a.rawScore;
        }
        return parseInt(b.accuracy) - parseInt(a.accuracy);
    });
    
    // Keep only top 10
    scores = scores.slice(0, 10);
    
    localStorage.setItem('mentalmath_scores', JSON.stringify(scores));
    loadLeaderboard();
}

// ==========================================================================
// TRANSLATION ENGINE & DICTIONARY
// ==========================================================================

const translations = {
    fr: {
        title: "Mental Math - Entraînement Ultra-Rapide",
        shortcuts: "<span>[Espace]</span> Commencer/Recommencer | <span>[Échap]</span> Paramètres",
        configTitle: "Configuration de la session",
        presetsLabel: "Mode de session",
        presetEasy: "Facile",
        presetMedium: "Moyen",
        presetHard: "Difficile",
        presetCustom: "Personnalisé",
        durationLabel: "Durée de la session",
        opsTitle: "Opérations et Plages de nombres",
        opAdd: "Addition (+)",
        opSub: "Soustraction (-)",
        opMul: "Multiplication (×)",
        opDiv: "Division (÷)",
        to: "à",
        startBtn: "Commencer la session <span class=\"btn-sub\">[Espace]</span>",
        statTime: "Temps",
        statScore: "Score",
        statCombo: "Multiplicateur",
        placeholderAnswer: "Entrez la réponse...",
        comboLabel: "Combo: ",
        gameOverTitle: "Session terminée !",
        cardScore: "Score Total",
        cardAccuracy: "Précision",
        cardSpeed: "Vitesse (rép/min)",
        cardMaxCombo: "Max Combo",
        logTitle: "Détails des questions",
        thCalc: "Calcul",
        thYourAns: "Votre réponse",
        thStatus: "Statut",
        thTime: "Temps",
        restartBtn: "Recommencer <span class=\"btn-sub\">[Espace]</span>",
        toConfigBtn: "Paramètres <span class=\"btn-sub\">[Echap]</span>",
        leaderboardTitle: "Top 10 - Meilleurs Scores",
        thRank: "Rang",
        thDate: "Date",
        thDuration: "Durée",
        thScore: "Score",
        thAccuracy: "Précision",
        thMaxCombo: "Max Combo",
        emptyTable: "Aucune partie enregistrée",
        credits: "Inspiré par Zetamac & Monkeytype • Développé en HTML5/CSS3/JS",
        correctBadge: "Correct",
        incorrectBadge: "Erreur",
        noAnswers: "Aucune question répondue",
        thDiviseur: "Diviseur",
        thQuotient: "Quotient"
    },
    en: {
        title: "Mental Math - Ultra-Fast Training",
        shortcuts: "<span>[Space]</span> Start/Restart | <span>[Esc]</span> Settings",
        configTitle: "Session Configuration",
        presetsLabel: "Session Mode",
        presetEasy: "Easy",
        presetMedium: "Medium",
        presetHard: "Hard",
        presetCustom: "Custom",
        durationLabel: "Session Duration",
        opsTitle: "Operations and Number Ranges",
        opAdd: "Addition (+)",
        opSub: "Subtraction (-)",
        opMul: "Multiplication (×)",
        opDiv: "Division (÷)",
        to: "to",
        startBtn: "Start Session <span class=\"btn-sub\">[Space]</span>",
        statTime: "Time",
        statScore: "Score",
        statCombo: "Multiplier",
        placeholderAnswer: "Enter answer...",
        comboLabel: "Combo: ",
        gameOverTitle: "Session Finished!",
        cardScore: "Total Score",
        cardAccuracy: "Accuracy",
        cardSpeed: "Speed (ans/min)",
        cardMaxCombo: "Max Combo",
        logTitle: "Question Details",
        thCalc: "Question",
        thYourAns: "Your Answer",
        thStatus: "Status",
        thTime: "Time",
        restartBtn: "Restart <span class=\"btn-sub\">[Space]</span>",
        toConfigBtn: "Settings <span class=\"btn-sub\">[Esc]</span>",
        leaderboardTitle: "Top 10 - Best Scores",
        thRank: "Rank",
        thDate: "Date",
        thDuration: "Duration",
        thScore: "Score",
        thAccuracy: "Accuracy",
        thMaxCombo: "Max Combo",
        emptyTable: "No games recorded",
        credits: "Inspired by Zetamac & Monkeytype • Developed in HTML5/CSS3/JS",
        correctBadge: "Correct",
        incorrectBadge: "Error",
        noAnswers: "No questions answered",
        thDiviseur: "Divisor",
        thQuotient: "Quotient"
    }
};

let currentLang = 'fr';

function initLanguage() {
    currentLang = localStorage.getItem('mentalmath_lang') || 'fr';
    setLanguage(currentLang);
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('mentalmath_lang', lang);
    
    // Update HTML title
    document.title = translations[lang].title;
    document.documentElement.lang = lang;
    
    // Update active state in selectors
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    
    // Translate standard components
    const dict = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.innerHTML = dict[key];
        }
    });
    
    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key]) {
            el.setAttribute('placeholder', dict[key]);
        }
    });

    // Translate attributes like title
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (dict[key]) {
            el.setAttribute('title', dict[key]);
        }
    });
    
    // Refresh variable contents
    loadLeaderboard();
    if (state.screen === 'gameover') {
        populateQuestionsLog();
    }
}

// Preset Handlers
function applyPreset(presetName) {
    if (presetName === 'custom') {
        setPresetActiveButton('custom');
        return;
    }
    
    const preset = presets[presetName];
    if (!preset) return;
    
    // Set checkboxes
    document.getElementById('op_add').checked = preset.ops.add;
    document.getElementById('op_sub').checked = preset.ops.sub;
    document.getElementById('op_mul').checked = preset.ops.mul;
    document.getElementById('op_div').checked = preset.ops.div;
    
    // Helper to set range values
    const setRangeValues = (prefix, r) => {
        document.getElementById(`${prefix}_min1`).value = r.min1;
        document.getElementById(`${prefix}_max1`).value = r.max1;
        document.getElementById(`${prefix}_min2`).value = r.min2;
        document.getElementById(`${prefix}_max2`).value = r.max2;
    };
    
    setRangeValues('add', preset.ranges.add);
    setRangeValues('sub', preset.ranges.sub);
    setRangeValues('mul', preset.ranges.mul);
    setRangeValues('div', preset.ranges.div);
    
    setPresetActiveButton(presetName);
}

function setPresetActiveButton(presetName) {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-preset') === presetName);
    });
}