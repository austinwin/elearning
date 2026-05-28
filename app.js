// Smart Math Tutor - Main Application
// Complete PWA math tutor for Pre-K through 5th Grade

(function () {
  'use strict';

  // --- Application State ---
  const state = {
    currentMode: 'kid', // 'kid' | 'parent'
    currentQuestion: null,
    childAnswer: '',
    attemptCount: 0,
    usedHint: false,
    feedbackState: 'idle', // 'idle' | 'correct' | 'wrong-first' | 'wrong-final' | 'loading'
    starCount: 0,
    streak: 0,
    bestStreak: 0,
    sessionStart: Date.now(),
    isOffline: !navigator.onLine,
    isLoading: false,
    questionStartTime: Date.now(),
    lastFeedbackTimeout: null,
    chatHistory: [], // For AI Coach conversation context
    questionsSinceLastAI: parseInt(localStorage.getItem('smart_math_ai_counter') || '0')
  };

  // --- Settings (localStorage) ---
  function getSettings() {
    return {
      apiKey: localStorage.getItem('smart_math_api_key') || '',
      gradeLevel: localStorage.getItem('smart_math_grade') || '2nd',
      childName: localStorage.getItem('smart_math_child_name') || '',
      aiEnabled: localStorage.getItem('smart_math_ai_enabled') !== 'false',
      aiVendor: localStorage.getItem('smart_math_ai_vendor') || 'deepseek',
      aiModel: localStorage.getItem('smart_math_ai_model') || 'deepseek-chat',
      soundEnabled: localStorage.getItem('smart_math_sound') !== 'false',
      dailyGoal: parseInt(localStorage.getItem('smart_math_daily_goal') || '10'),
      aiEvalFrequency: parseInt(localStorage.getItem('smart_math_ai_eval_freq') || '10'),
      theme: localStorage.getItem('smart_math_theme') || 'light'
    };
  }

  function saveSetting(key, value) {
    localStorage.setItem(`smart_math_${key}`, value);
  }

  // --- DOM References ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // --- Initialization ---
  async function init() {
    try {
      // Initialize IndexedDB
      await openDB();
    } catch (err) {
      console.warn('IndexedDB initialization failed, continuing with limited functionality:', err);
    }

    // Load saved state from localStorage
    const settings = getSettings();
    state.starCount = parseFloat(localStorage.getItem('smart_math_stars') || '0');
    state.streak = parseInt(localStorage.getItem('smart_math_streak') || '0');
    state.bestStreak = parseInt(localStorage.getItem('smart_math_best_streak') || '0');

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        console.log('Service Worker registered:', registration.scope);
      } catch (err) {
        console.warn('Service Worker registration failed:', err);
      }
    }

    // Set up online/offline listeners
    window.addEventListener('online', () => {
      state.isOffline = false;
      updateOfflineBadge();
    });
    window.addEventListener('offline', () => {
      state.isOffline = true;
      updateOfflineBadge();
    });
    updateOfflineBadge();

    // Set up UI event listeners
    setupEventListeners();

    // Show initial mode
    showKidMode();

    // Load first question
    await loadNextQuestion();
  }

  function updateOfflineBadge() {
    const badge = $('#offlineBadge');
    if (badge) {
      if (state.isOffline) {
        badge.classList.add('visible');
        badge.textContent = '📡 Offline Practice';
      } else {
        badge.classList.remove('visible');
      }
    }
  }

  // --- Event Listeners ---
  function setupEventListeners() {
    // Mode toggle
    $('#settingsBtn').addEventListener('click', () => {
      if (state.currentMode === 'kid') {
        showParentMode();
      } else {
        showKidMode();
      }
    });

    // Kid mode buttons
    $('#hintBtn').addEventListener('click', showHint);
    $('#speakBtn').addEventListener('click', readAloud);

    // Parent mode
    $('#saveSettingsBtn').addEventListener('click', saveParentSettings);
    $('#saveAllSettingsBtn').addEventListener('click', saveParentSettings);
    $('#clearApiKeyBtn').addEventListener('click', clearAPIKey);
    $('#resetProgressBtn').addEventListener('click', confirmResetProgress);
    $('#exportDataBtn').addEventListener('click', exportProgress);
    $('#importDataBtn').addEventListener('click', () => $('#importFileInput').click());
    $('#importFileInput').addEventListener('change', importProgress);
    $('#aiVendorSelect').addEventListener('change', onVendorChange);

    // Parent tabs
    $$('.parent-tab').forEach(tab => {
      tab.addEventListener('click', () => switchParentTab(tab.dataset.tab));
    });

    // Chat
    $('#chatSendBtn').addEventListener('click', sendChatMessage);
    $('#chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(); }
    });
    $$('.chat-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const prompts = {
          evaluate: 'Please evaluate my child\'s overall math progress. Highlight strengths, weaknesses, trends, and provide specific recommendations.',
          weaknesses: 'What are my child\'s weakest areas? Which specific skills need the most practice?',
          recommend: 'Based on the practice history, what should my child focus on next? Give me a concrete 1-week practice plan.',
          summary: 'Give me a brief summary of my child\'s learning journey so far. Include key stats and notable patterns.'
        };
        const msg = prompts[action] || action;
        $('#chatInput').value = msg;
        sendChatMessage();
      });
    });

    // History filters
    $('#historyDomainFilter').addEventListener('change', renderHistory);
    $('#historySort').addEventListener('change', renderHistory);

    // Load parent form values
    loadParentForm();

    // Dialog
    $('#dialogCancel').addEventListener('click', closeDialog);
    $('#dialogConfirm').addEventListener('click', () => {
      closeDialog();
      if (window._dialogCallback) {
        window._dialogCallback();
        window._dialogCallback = null;
      }
    });
  }

  // --- Mode Switching ---
  function showKidMode() {
    state.currentMode = 'kid';
    $('#kidMode').classList.remove('hidden');
    $('#parentMode').classList.add('hidden');
    $('#modeLabel').textContent = '👧 Kid Mode';
    $('#settingsBtn').setAttribute('aria-label', 'Open Parent Settings');
    updateKidUI();
  }

  function showParentMode() {
    state.currentMode = 'parent';
    $('#kidMode').classList.add('hidden');
    $('#parentMode').classList.remove('hidden');
    $('#modeLabel').textContent = '👨‍👩‍👧 Parent Mode';
    $('#settingsBtn').setAttribute('aria-label', 'Back to Kid Mode');
    loadParentForm();
    switchParentTab('dashboard');
  }

  function updateKidUI() {
    const settings = getSettings();
    $('#childNameDisplay').textContent = settings.childName || 'Learner';
    $('#gradeBadge').textContent = GRADE_LABELS[settings.gradeLevel] || settings.gradeLevel;
    $('#starCount').textContent = Math.floor(state.starCount);
    $('#streakCount').textContent = state.streak;

    // Update progress bar
    updateDailyProgress();
  }

  async function updateDailyProgress() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const daily = await getDailyPractice(today);
      const attempted = daily ? daily.attempted : 0;
      const goal = parseInt(localStorage.getItem('smart_math_daily_goal') || '10');
      const pct = Math.min(100, Math.round((attempted / goal) * 100));
      $('#progressBarFill').style.width = pct + '%';
      $('#dailyCount').textContent = attempted;
      $('#dailyGoalLabel').textContent = '/' + goal;
    } catch (e) {
      $('#progressBarFill').style.width = '0%';
      $('#dailyCount').textContent = '0';
      $('#dailyGoalLabel').textContent = '/10';
    }
  }

  // --- Question Loading ---
  async function loadNextQuestion() {
    state.isLoading = true;
    state.feedbackState = 'loading';
    state.attemptCount = 0;
    state.usedHint = false;
    state.childAnswer = '';
    state.questionStartTime = Date.now();

    // Show loading state
    showLoadingState();

    const settings = getSettings();

    try {
      // Get recent attempts and skill progress for adaptive AI evaluation
      let recentAttempts = [];
      let skillProgress = [];

      try {
        // Fetch up to 100 recent attempts for AI context
        recentAttempts = await getRecentAttempts(100);
        skillProgress = await getAllSkillProgress(settings.gradeLevel);
      } catch (e) {
        console.warn('Could not load progress data:', e);
      }

      // Determine next question plan (used as AI suggestion, AI can override)
      const plan = selectNextQuestionPlan(settings.gradeLevel, recentAttempts, skillProgress);

      // Build comprehensive profile for AI evaluation
      const totalCorrect = skillProgress.reduce((sum, sp) => sum + (sp.correct || 0), 0);
      const totalAttempted = skillProgress.reduce((sum, sp) => sum + (sp.attempted || 0), 0);
      const successRate = totalAttempted > 0 ? totalCorrect / totalAttempted : 0.5;

      // Domain accuracy stats
      const domainStats = {};
      for (const a of recentAttempts) {
        if (!domainStats[a.domain]) domainStats[a.domain] = { total: 0, correct: 0 };
        domainStats[a.domain].total++;
        if (a.isCorrect) domainStats[a.domain].correct++;
      }

      // Find weakest and least practiced domains
      const domains = DOMAIN_GRADE_MAP[settings.gradeLevel] || DOMAIN_GRADE_MAP['2nd'];
      let weakestDomain = plan.domain;
      let leastPracticedDomain = plan.domain;
      let lowestMastery = 101;
      let oldestDate = new Date().toISOString();

      for (const d of domains) {
        const dp = skillProgress.filter(sp => sp.domain === d);
        if (dp.length === 0) {
          weakestDomain = d;
          lowestMastery = -1;
          break;
        }
        const avgM = dp.reduce((sum, sp) => sum + (sp.mastery || 0), 0) / dp.length;
        if (avgM < lowestMastery) {
          lowestMastery = avgM;
          weakestDomain = d;
        }
        const mostRecent = dp.reduce((latest, sp) =>
          sp.lastPracticed && sp.lastPracticed > latest ? sp.lastPracticed : latest, '2000-01-01');
        if (mostRecent < oldestDate) {
          oldestDate = mostRecent;
          leastPracticedDomain = d;
        }
      }

      // Compact skill progress for AI (mastery + difficulty only)
      const skillProgressSummary = skillProgress.map(sp => ({
        domain: sp.domain,
        skill: sp.skill,
        mastery: sp.mastery || 0,
        currentDifficulty: sp.currentDifficulty || 1,
        attempted: sp.attempted || 0
      }));

      const profile = {
        childName: settings.childName || 'Learner',
        gradeLevel: settings.gradeLevel,
        targetDomain: plan.domain,
        targetSkill: plan.skill,
        targetDifficulty: plan.difficulty,
        successRate,
        streak: state.streak,
        weakestDomain,
        leastPracticedDomain,
        domainStats,
        skillProgress: skillProgressSummary,
        // Send full history — AI will token-trim internally
        recentHistory: recentAttempts.map(a => ({
          domain: a.domain,
          skill: a.skill,
          difficulty: a.difficulty,
          question: a.question,
          childAnswer: a.childAnswer,
          correctAnswer: a.correctAnswer,
          isCorrect: a.isCorrect
        }))
      };

      // Generate question — use AI only at evaluation checkpoints to save tokens
      let question;
      const evalFreq = settings.aiEvalFrequency;
      state.questionsSinceLastAI++;
      localStorage.setItem('smart_math_ai_counter', state.questionsSinceLastAI);

      const shouldUseAI = canUseAI() && state.questionsSinceLastAI >= evalFreq;

      if (shouldUseAI) {
        try {
          question = await generateAIQuestion(profile);
          state.questionsSinceLastAI = 0;
          localStorage.setItem('smart_math_ai_counter', '0');
        } catch (e) {
          console.warn('AI question failed, using local:', e.message);
          question = null;
        }
      }

      // Fall back to local if AI not used or failed
      if (!question || !question.question) {
        question = generateLocalQuestion(settings.gradeLevel, plan.domain, plan.skill, plan.difficulty);
      }

      if (!question || !question.question) {
        question = fallbackSimpleQuestion(settings.gradeLevel);
      }

      state.currentQuestion = question;
      state.attemptCount = 0;
      state.usedHint = false;
      state.feedbackState = 'idle';
      state.isLoading = false;
      state.questionStartTime = Date.now();

      renderQuestion(question);
      updateKidUI();
    } catch (error) {
      console.error('Failed to load question:', error);
      state.isLoading = false;
      state.feedbackState = 'idle';

      // Ultimate fallback
      const fb = fallbackSimpleQuestion(settings.gradeLevel);
      state.currentQuestion = fb;
      renderQuestion(fb);
    }
  }

  function renderQuestion(question) {
    const q = question;

    // Question header
    $('#questionDomain').textContent = q.domain || 'Math';
    $('#questionSkill').textContent = q.skill || 'Practice';
    $('#questionText').textContent = q.question || 'What is 2 + 2?';

    // Difficulty dots
    const diff = q.difficulty || 1;
    const dotsHtml = Array.from({ length: 10 }, (_, i) =>
      `<span class="difficulty-dot ${i < diff ? 'filled' : ''}" aria-hidden="true"></span>`
    ).join('');
    $('#difficultyDots').innerHTML = dotsHtml;
    $('#difficultyDots').setAttribute('aria-label', `Difficulty level ${diff} out of 10`);

    // Clear feedback
    $('#feedbackArea').innerHTML = '';
    $('#hintDisplay').classList.add('hidden');
    $('#hintText').textContent = '';

    state.childAnswer = '';

    // Always show multiple-choice buttons
    const choicesContainer = $('#choicesContainer');
    choicesContainer.innerHTML = '';

    const choices = q.choices && q.choices.length > 0 ? q.choices : ['Yes', 'No'];
    const shuffled = shuffleArray([...choices]);

    // Ensure correct answer is present
    const correctStr = String(q.correct_answer);
    if (!shuffled.includes(correctStr)) {
      shuffled[randInt(0, shuffled.length - 1)] = correctStr;
    }

    shuffled.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'choice-button';
      btn.textContent = choice;
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.addEventListener('click', () => selectChoice(choice, btn));
      choicesContainer.appendChild(btn);
    });
  }

  function selectChoice(choice, button) {
    // Prevent double-tap during feedback
    if (state.feedbackState === 'correct' || state.feedbackState === 'wrong-final' || state.isLoading) return;

    // Deselect all
    $$('#choicesContainer .choice-button').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-checked', 'false');
    });
    // Select clicked
    button.classList.add('selected');
    button.setAttribute('aria-checked', 'true');
    state.childAnswer = choice;

    // Auto-submit after brief visual feedback
    setTimeout(() => submitAnswer(), 350);
  }

  function showLoadingState() {
    $('#questionText').textContent = 'Loading a new question...';
    $('#feedbackArea').innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner" aria-label="Loading"></div>
        <span class="loading-text">Getting the next question ready...</span>
      </div>
    `;
    $('#choicesContainer').innerHTML = '';
  }

  // --- Answer Submission ---
  async function submitAnswer() {
    if (state.isLoading || state.feedbackState === 'correct' || state.feedbackState === 'wrong-final') {
      return;
    }

    const q = state.currentQuestion;
    if (!q) return;

    const answer = state.childAnswer;
    if (!answer) return;

    state.attemptCount++;
    const isCorrect = isAnswerCorrect(answer, q.correct_answer, q.accepted_answers);

    if (isCorrect) {
      await handleCorrectAnswer(answer);
    } else if (state.attemptCount >= 2) {
      await handleWrongFinal(answer);
    } else {
      handleWrongFirst(answer);
    }
  }

  async function handleCorrectAnswer(answer) {
    const q = state.currentQuestion;
    const settings = getSettings();
    state.feedbackState = 'correct';

    // Disable input
    disableAnswerInput();

    // Calculate stars
    let starsEarned = 0;
    if (state.attemptCount === 1 && !state.usedHint) {
      starsEarned = 1;
    } else if (state.attemptCount === 1 && state.usedHint) {
      starsEarned = 0.5;
    } else if (state.attemptCount === 2 && !state.usedHint) {
      starsEarned = 0.5;
    } else {
      starsEarned = 0.5;
    }
    state.starCount += starsEarned;

    // Update streak
    state.streak++;
    if (state.streak > state.bestStreak) {
      state.bestStreak = state.streak;
    }

    // Save to localStorage
    localStorage.setItem('smart_math_stars', state.starCount);
    localStorage.setItem('smart_math_streak', state.streak);
    localStorage.setItem('smart_math_best_streak', state.bestStreak);

    // Calculate hidden mastery
    let masteryChange = 0;
    if (state.attemptCount === 1 && !state.usedHint) masteryChange = 6;
    else if (state.attemptCount === 2 && !state.usedHint) masteryChange = 3;
    else if (state.usedHint) masteryChange = 2;
    if (state.usedHint) masteryChange -= 1;

    // Show feedback
    const feedbacks = ['🌟 Awesome!', '🎉 Great job!', '⭐ You got it!', '💪 Super!', '👏 Wonderful!', '🥳 Perfect!'];
    const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    showFeedback(feedback, 'correct');

    // Highlight correct answer
    $$('#choicesContainer .choice-button').forEach(b => {
      if (normalizeAnswer(b.textContent) === normalizeAnswer(q.correct_answer)) {
        b.classList.add('correct-reveal');
      }
    });

    // Save attempt
    const attempt = buildAttemptObject(answer, true);
    await saveAttemptSafe(attempt);

    // Update skill progress
    await updateSkillProgressAfterAttempt(true, masteryChange);

    // Update daily practice
    await updateDailyPracticeRecord(true, starsEarned);

    // Save session
    await recordSession();

    // Auto advance after delay
    state.lastFeedbackTimeout = setTimeout(async () => {
      await loadNextQuestion();
    }, 1500);

    updateKidUI();
  }

  async function handleWrongFirst(answer) {
    state.feedbackState = 'wrong-first';

    // Show gentle feedback
    const feedbacks = ['Not quite, try again! 💭', 'Almost! Give it another try 🌈', 'Keep trying, you can do it! 💪', 'So close! One more try ✨'];
    const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
    showFeedback(feedback, 'wrong');

    // Enable retry — reset choice selection
    state.childAnswer = '';
    $$('#choicesContainer .choice-button').forEach(b => {
      b.classList.remove('selected', 'correct-reveal', 'wrong-reveal');
      b.disabled = false;
    });

    // Auto-reset feedback after brief delay so child can retry
    state.lastFeedbackTimeout = setTimeout(() => {
      if (state.feedbackState === 'wrong-first') {
        $('#feedbackArea').innerHTML = '';
      }
    }, 2000);
  }

  async function handleWrongFinal(answer) {
    const q = state.currentQuestion;
    state.feedbackState = 'wrong-final';
    state.streak = 0;

    // Save streak
    localStorage.setItem('smart_math_streak', '0');

    // Disable input
    disableAnswerInput();

    // Show correct answer — highlight choices
    let correctDisplay = q.correct_answer;
    $$('#choicesContainer .choice-button').forEach(b => {
      if (normalizeAnswer(b.textContent) === normalizeAnswer(q.correct_answer)) {
        b.classList.add('correct-reveal');
      } else if (state.childAnswer && normalizeAnswer(b.textContent) === normalizeAnswer(state.childAnswer)) {
        b.classList.add('wrong-reveal');
      }
    });

    showFeedback(`The answer is ${correctDisplay}. Keep practicing! 🌟`, 'info');

    // Calculate mastery penalty
    let masteryChange = -4;
    if (state.usedHint) masteryChange -= 1;

    // Save attempt
    const attempt = buildAttemptObject(answer, false);
    await saveAttemptSafe(attempt);

    // Update skill progress
    await updateSkillProgressAfterAttempt(false, masteryChange);

    // Update daily practice
    await updateDailyPracticeRecord(false, 0);

    // Record session
    await recordSession();

    // Auto advance
    state.lastFeedbackTimeout = setTimeout(async () => {
      await loadNextQuestion();
    }, 2500);

    updateKidUI();
  }

  function buildAttemptObject(answer, isCorrect) {
    const q = state.currentQuestion;
    const timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);
    const settings = getSettings();

    return {
      id: `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      childName: settings.childName || 'Learner',
      gradeLevel: settings.gradeLevel,
      domain: q.domain || 'General',
      skill: q.skill || 'Practice',
      difficulty: q.difficulty || 1,
      questionType: q.question_type || 'numeric',
      question: q.question || '',
      choices: q.choices || [],
      correctAnswer: q.correct_answer || '',
      acceptedAnswers: q.accepted_answers || [],
      childAnswer: answer,
      isCorrect,
      attemptCount: state.attemptCount,
      usedHint: state.usedHint,
      hint: q.hint || '',
      source: q.source || 'local',
      aiReasoning: q.reasoning || '',
      timeSpentSeconds: timeSpent
    };
  }

  async function saveAttemptSafe(attempt) {
    try {
      await saveAttempt(attempt);
    } catch (e) {
      console.warn('Failed to save attempt:', e);
    }
  }

  async function updateSkillProgressAfterAttempt(isCorrect, masteryChange) {
    const q = state.currentQuestion;
    const settings = getSettings();
    const id = makeSkillProgressId(settings.gradeLevel, q.domain, q.skill);

    try {
      let progress = await getSkillProgress(settings.gradeLevel, q.domain, q.skill);

      if (!progress) {
        progress = {
          id,
          gradeLevel: settings.gradeLevel,
          domain: q.domain,
          skill: q.skill,
          attempted: 0,
          correct: 0,
          mastery: 50,
          currentDifficulty: q.difficulty || 1,
          lastPracticed: new Date().toISOString(),
          recentResults: []
        };
      }

      progress.attempted = (progress.attempted || 0) + 1;
      if (isCorrect) {
        progress.correct = (progress.correct || 0) + 1;
      }

      // Update mastery
      progress.mastery = Math.max(0, Math.min(100, (progress.mastery || 50) + masteryChange));

      // Update difficulty based on recent results
      progress.recentResults = progress.recentResults || [];
      progress.recentResults.push(isCorrect);
      if (progress.recentResults.length > 5) {
        progress.recentResults.shift();
      }

      const recentCorrect = progress.recentResults.filter(r => r).length;
      const recentTotal = progress.recentResults.length;

      if (recentTotal >= 3 && recentCorrect === recentTotal) {
        progress.currentDifficulty = Math.min(10, (progress.currentDifficulty || 1) + 1);
      } else if (recentTotal >= 3 && recentCorrect === 0) {
        progress.currentDifficulty = Math.max(1, (progress.currentDifficulty || 1) - 1);
      }

      progress.lastPracticed = new Date().toISOString();

      await saveSkillProgress(progress);
    } catch (e) {
      console.warn('Failed to update skill progress:', e);
    }
  }

  async function updateDailyPracticeRecord(isCorrect, starsEarned) {
    const today = new Date().toISOString().split('T')[0];
    const timeSpent = Math.round((Date.now() - state.questionStartTime) / 1000);

    try {
      let daily = await getDailyPractice(today);
      if (!daily) {
        daily = {
          date: today,
          attempted: 0,
          correct: 0,
          minutesPracticed: 0,
          starsEarned: 0
        };
      }

      daily.attempted = (daily.attempted || 0) + 1;
      if (isCorrect) {
        daily.correct = (daily.correct || 0) + 1;
      }
      daily.minutesPracticed = (daily.minutesPracticed || 0) + Math.ceil(timeSpent / 60);
      daily.starsEarned = (daily.starsEarned || 0) + starsEarned;

      await saveDailyPractice(daily);
    } catch (e) {
      console.warn('Failed to update daily practice:', e);
    }
  }

  async function recordSession() {
    try {
      const session = {
        id: `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
        gradeLevel: getSettings().gradeLevel,
        questionId: state.currentQuestion ? state.currentQuestion.question : '',
        isCorrect: state.feedbackState === 'correct',
        streak: state.streak,
        starsEarned: state.starCount
      };
      await saveSession(session);
    } catch (e) {
      // Non-critical
    }
  }

  // --- Helper Functions ---
  function enableAnswerInput() {
    $$('#choicesContainer .choice-button').forEach(b => {
      b.classList.remove('correct-reveal', 'wrong-reveal', 'selected');
      b.disabled = false;
    });
  }

  function disableAnswerInput() {
    $$('#choicesContainer .choice-button').forEach(b => b.disabled = true);
  }

  function showFeedback(message, type) {
    const area = $('#feedbackArea');
    const iconMap = {
      correct: '🌟',
      wrong: '💭',
      info: '📚'
    };
    area.innerHTML = `
      <div class="feedback-message ${type}">
        ${iconMap[type] || ''} ${message}
      </div>
    `;
  }

  function showHint() {
    if (!state.currentQuestion || !state.currentQuestion.hint) return;
    state.usedHint = true;
    const hintDisplay = $('#hintDisplay');
    const hintText = $('#hintText');
    hintText.textContent = state.currentQuestion.hint;
    hintDisplay.classList.remove('hidden');

    // Apply hidden mastery penalty for using hint
    updateHintPenalty();
  }

  async function updateHintPenalty() {
    const q = state.currentQuestion;
    const settings = getSettings();
    try {
      let progress = await getSkillProgress(settings.gradeLevel, q.domain, q.skill);
      if (progress) {
        progress.mastery = Math.max(0, (progress.mastery || 50) - 1);
        progress.lastPracticed = new Date().toISOString();
        await saveSkillProgress(progress);
      }
    } catch (e) {
      // Non-critical
    }
  }

  function readAloud() {
    if (!('speechSynthesis' in window)) {
      showFeedback('Sorry, reading aloud is not supported on this device.', 'info');
      return;
    }

    const q = state.currentQuestion;
    if (!q) return;

    window.speechSynthesis.cancel();

    // Read the question
    const utterance = new SpeechSynthesisUtterance(q.question);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;

    // Get a friendly voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Female')) ||
                          voices.find(v => v.lang.startsWith('en')) ||
                          voices[0];
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);

    // If multiple choice, read choices after a delay
    if (q.question_type === 'multiple_choice' && q.choices && q.choices.length > 0) {
      utterance.onend = () => {
        const choicesText = q.choices.join('. Or: ');
        const choiceUtterance = new SpeechSynthesisUtterance(`Choices: ${choicesText}`);
        choiceUtterance.rate = 0.8;
        choiceUtterance.pitch = 1.1;
        if (preferredVoice) choiceUtterance.voice = preferredVoice;
        window.speechSynthesis.speak(choiceUtterance);
      };
    }
  }

  // --- Parent Mode ---
  function loadParentForm() {
    const settings = getSettings();

    // Populate vendor dropdown
    const vendorSelect = $('#aiVendorSelect');
    vendorSelect.innerHTML = '';
    const vendors = getAvailableVendors();
    vendors.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = v.name;
      if (v.id === settings.aiVendor) opt.selected = true;
      vendorSelect.appendChild(opt);
    });

    // Populate model dropdown based on current vendor
    populateModelDropdown(settings.aiVendor, settings.aiModel);

    // Update API key hint based on vendor
    updateAPIKeyHint(settings.aiVendor);

    // Custom endpoint
    const customEndpoint = localStorage.getItem('smart_math_custom_endpoint') || '';
    $('#customEndpointInput').value = customEndpoint;
    const vendorInfo = getVendorInfo(settings.aiVendor);
    if (vendorInfo && vendorInfo.customEndpoint) {
      $('#customEndpointGroup').style.display = '';
    } else {
      $('#customEndpointGroup').style.display = 'none';
    }

    $('#apiKeyInput').value = settings.apiKey;
    $('#childNameInput').value = settings.childName;
    $('#gradeSelect').value = settings.gradeLevel;
    $('#aiToggle').checked = settings.aiEnabled;
    $('#soundToggle').checked = settings.soundEnabled;
    $('#dailyGoalInput').value = parseInt(localStorage.getItem('smart_math_daily_goal') || '10');
    $('#aiEvalFreqInput').value = parseInt(localStorage.getItem('smart_math_ai_eval_freq') || '10');

    // Show/hide API key
    $('#apiKeyInput').type = 'password';
  }

  function populateModelDropdown(vendorId, selectedModel) {
    const modelSelect = $('#aiModelSelect');
    modelSelect.innerHTML = '';
    const models = getModelsForVendor(vendorId);
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      if (m.id === selectedModel) opt.selected = true;
      modelSelect.appendChild(opt);
    });
    // If no model selected, pick first
    if (!selectedModel || !models.find(m => m.id === selectedModel)) {
      modelSelect.selectedIndex = 0;
    }
  }

  function updateAPIKeyHint(vendorId) {
    const info = getVendorInfo(vendorId);
    const hint = $('#apiKeyHint');
    const input = $('#apiKeyInput');
    if (info) {
      hint.textContent = info.apiKeyHint || 'Enter your API key';
      input.placeholder = info.apiKeyPlaceholder || 'Enter key...';
    }
  }

  function onVendorChange() {
    const vendorId = $('#aiVendorSelect').value;
    populateModelDropdown(vendorId, null);
    updateAPIKeyHint(vendorId);

    // Show/hide custom endpoint field
    const info = getVendorInfo(vendorId);
    const endpointGroup = $('#customEndpointGroup');
    if (info && info.customEndpoint) {
      endpointGroup.style.display = '';
      if (!$('#customEndpointInput').value) {
        $('#customEndpointInput').value = info.endpoint || '';
      }
    } else {
      endpointGroup.style.display = 'none';
    }
  }

  function saveParentSettings() {
    const apiKey = $('#apiKeyInput').value.trim();
    const childName = $('#childNameInput').value.trim();
    const gradeLevel = $('#gradeSelect').value;
    const aiEnabled = $('#aiToggle').checked;
    const soundEnabled = $('#soundToggle').checked;
    const aiVendor = $('#aiVendorSelect').value;
    const aiModel = $('#aiModelSelect').value;

    saveSetting('api_key', apiKey);
    saveSetting('child_name', childName);
    saveSetting('grade', gradeLevel);
    saveSetting('ai_enabled', aiEnabled ? 'true' : 'false');
    saveSetting('ai_vendor', aiVendor);
    saveSetting('ai_model', aiModel);
    saveSetting('sound', soundEnabled ? 'true' : 'false');

    // Save daily goal
    const dailyGoal = parseInt($('#dailyGoalInput').value) || 10;
    localStorage.setItem('smart_math_daily_goal', Math.max(1, Math.min(100, dailyGoal)));

    // Save AI evaluation frequency
    const aiEvalFreq = parseInt($('#aiEvalFreqInput').value) || 10;
    localStorage.setItem('smart_math_ai_eval_freq', Math.max(1, Math.min(50, aiEvalFreq)));
    state.questionsSinceLastAI = 0;
    localStorage.setItem('smart_math_ai_counter', '0');

    // Save custom endpoint if visible
    const customEndpoint = $('#customEndpointInput').value.trim();
    if (customEndpoint) {
      localStorage.setItem('smart_math_custom_endpoint', customEndpoint);
    } else {
      localStorage.removeItem('smart_math_custom_endpoint');
    }

    const vendorName = getVendorInfo(aiVendor).name;
    const msg = `✅ Settings saved! Using ${vendorName} (${aiModel}).`;

    // Show feedback in both kid mode and settings tab
    showFeedback(msg, 'correct');
    const sf = $('#settingsFeedback');
    if (sf) {
      sf.textContent = msg;
      sf.style.color = '#2E7D32';
      setTimeout(() => { sf.textContent = ''; }, 4000);
    }

    updateKidUI();

    // Reload question with new settings if returning to kid mode later
    // (don't force switch — let parent explore other tabs)
  }

  function clearAPIKey() {
    showConfirmDialog(
      'Clear API Key?',
      'Are you sure you want to remove the API key? AI-generated questions will not be available until you enter a new key.',
      () => {
        saveSetting('api_key', '');
        $('#apiKeyInput').value = '';
        saveSetting('ai_enabled', 'false');
        $('#aiToggle').checked = false;
        showFeedback('API key cleared. Using local questions only.', 'info');
      }
    );
  }

  function confirmResetProgress() {
    showConfirmDialog(
      'Reset All Progress?',
      'This will delete all question history, skill progress, and daily records. Stars and streaks will reset to zero. This cannot be undone.',
      async () => {
        try {
          await resetAllData();
          state.starCount = 0;
          state.streak = 0;
          state.bestStreak = 0;
          localStorage.setItem('smart_math_stars', '0');
          localStorage.setItem('smart_math_streak', '0');
          localStorage.setItem('smart_math_best_streak', '0');
          showFeedback('✅ All progress has been reset.', 'correct');
          updateKidUI();
          renderParentDashboard();
          showKidMode();
          await loadNextQuestion();
        } catch (e) {
          showFeedback('❌ Failed to reset progress. Please try again.', 'wrong');
        }
      }
    );
  }

  async function exportProgress() {
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smart-math-progress-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('✅ Progress exported successfully!', 'correct');
    } catch (e) {
      console.error('Export failed:', e);
      showFeedback('❌ Failed to export progress. Please try again.', 'wrong');
    }
  }

  async function importProgress(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate
      if (!data.attempts || !data.skillProgress || !data.dailyPractice) {
        throw new Error('Invalid file format');
      }

      await showConfirmDialogAsync(
        'Import Progress?',
        `This will replace all current progress with data from the file.\n\nFile contains:\n- ${data.attempts.length} question attempts\n- ${data.skillProgress.length} skill records\n- ${data.dailyPractice.length} daily records\n\nThis cannot be undone. Continue?`
      ).then(async (confirmed) => {
        if (confirmed) {
          await importAllData(data);
          showFeedback('✅ Progress imported successfully!', 'correct');
          updateKidUI();
          renderParentDashboard();
          showKidMode();
          await loadNextQuestion();
        }
      });
    } catch (e) {
      console.error('Import failed:', e);
      showFeedback('❌ Invalid file. Please check the file and try again.', 'wrong');
    }

    // Reset file input
    event.target.value = '';
  }

  async function renderParentDashboard() {
    const settings = getSettings();
    const dashboard = $('#dashboardContent');

    try {
      const attempts = await getAttemptsByGrade(settings.gradeLevel);
      const skillProgress = await getAllSkillProgress(settings.gradeLevel);
      const dailyPractice = await getAllDailyPractice();

      const totalAttempted = attempts.length;
      const totalCorrect = attempts.filter(a => a.isCorrect).length;
      const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

      // Accuracy by domain
      const domainStats = {};
      for (const a of attempts) {
        if (!domainStats[a.domain]) {
          domainStats[a.domain] = { attempted: 0, correct: 0 };
        }
        domainStats[a.domain].attempted++;
        if (a.isCorrect) domainStats[a.domain].correct++;
      }

      // Find strongest and weakest
      let strongestDomain = null;
      let weakestDomain = null;
      let highestAcc = -1;
      let lowestAcc = 101;

      for (const [domain, stats] of Object.entries(domainStats)) {
        const acc = stats.attempted > 0 ? Math.round((stats.correct / stats.attempted) * 100) : 0;
        if (acc > highestAcc) { highestAcc = acc; strongestDomain = domain; }
        if (acc < lowestAcc) { lowestAcc = acc; weakestDomain = domain; }
      }

      // Suggested focus
      const suggestedFocus = weakestDomain || 'Counting and Cardinality';

      // Recent domains practiced
      const recentDomains = [...new Set(attempts.slice(0, 20).map(a => a.domain))];

      // Today's practice
      const today = new Date().toISOString().split('T')[0];
      const todayPractice = dailyPractice.find(d => d.date === today);
      const todayCount = todayPractice ? todayPractice.attempted : 0;

      // Last practice date
      const lastAttempt = attempts.length > 0 ? attempts[0].timestamp : null;
      const lastPracticeDate = lastAttempt ? new Date(lastAttempt).toLocaleDateString() : 'Never';

      let html = '';

      // Summary cards
      html += `
        <div class="dashboard-summary">
          <div class="summary-card">
            <div class="summary-value">${totalAttempted}</div>
            <div class="summary-label">Questions</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${accuracy}%</div>
            <div class="summary-label">Accuracy</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${state.streak}</div>
            <div class="summary-label">Streak</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${todayCount}</div>
            <div class="summary-label">Today</div>
          </div>
        </div>
      `;

      // Additional stats
      html += `
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 16px;">
          <strong>Best Streak:</strong> ${state.bestStreak} &nbsp;|&nbsp;
          <strong>Last Practice:</strong> ${lastPracticeDate} &nbsp;|&nbsp;
          <strong>Stars:</strong> ${Math.floor(state.starCount)}
        </p>
      `;

      // Domain progress
      html += '<h3>📊 Domain Progress</h3>';
      html += '<div class="domain-progress-list">';

      const domains = DOMAIN_GRADE_MAP[settings.gradeLevel] || DOMAIN_GRADE_MAP['2nd'];
      for (const domain of domains) {
        const ds = domainStats[domain] || { attempted: 0, correct: 0 };
        const domainAcc = ds.attempted > 0 ? Math.round((ds.correct / ds.attempted) * 100) : 0;

        // Get mastery from skill progress
        const domainSP = skillProgress.filter(sp => sp.domain === domain);
        const avgMastery = domainSP.length > 0
          ? Math.round(domainSP.reduce((sum, sp) => sum + (sp.mastery || 0), 0) / domainSP.length)
          : 0;

        const masteryLabel = getMasteryLabel(avgMastery);
        const masteryClass = `mastery-${masteryLabel.toLowerCase().replace(/\s+/g, '-')}`;

        // Last practiced
        const lastP = domainSP.length > 0
          ? domainSP.reduce((latest, sp) => sp.lastPracticed > latest ? sp.lastPracticed : latest, '')
          : 'Never';
        const lastPracticedStr = lastP && lastP !== 'Never' ? new Date(lastP).toLocaleDateString() : 'Never';

        html += `
          <div class="domain-progress-card">
            <div class="domain-name">${domain}</div>
            <div class="domain-mastery ${masteryClass}">${masteryLabel}</div>
            <div class="domain-stats">
              ${ds.attempted} questions · ${domainAcc}% accuracy · Last: ${lastPracticedStr}
            </div>
            <div class="domain-bar-container">
              <div class="domain-bar-fill" style="width: ${avgMastery}%"></div>
            </div>
          </div>
        `;
      }
      html += '</div>';

      // Suggested focus
      html += `
        <div class="suggested-focus">
          <div class="focus-title">💡 Suggested Next Focus</div>
          <div class="focus-detail">
            Practice <strong>${suggestedFocus}</strong> to build confidence in your weakest area.
            ${strongestDomain ? `<br>Keep up the great work in <strong>${strongestDomain}</strong>!` : ''}
          </div>
        </div>
      `;

      // Recent domains
      if (recentDomains.length > 0) {
        html += `
          <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 12px;">
            Recently practiced: ${recentDomains.slice(0, 5).join(', ')}
          </p>
        `;
      }

      dashboard.innerHTML = html;
    } catch (e) {
      console.error('Dashboard render error:', e);
      dashboard.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <div class="error-message">Could not load dashboard data. Try answering a few questions first!</div>
        </div>
      `;
    }
  }

  // --- Parent Tabs ---
  function switchParentTab(tabId) {
    // Update tab buttons
    $$('.parent-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
      t.setAttribute('aria-selected', t.dataset.tab === tabId ? 'true' : 'false');
    });
    // Update panels
    $$('.parent-tab-panel').forEach(p => p.classList.remove('active'));
    const panel = document.getElementById('tab-' + tabId);
    if (panel) panel.classList.add('active');

    // Load content for the tab
    if (tabId === 'dashboard') renderParentDashboard();
    if (tabId === 'history') { populateHistoryFilters(); renderHistory(); }
    if (tabId === 'coach') initChatTab();
    if (tabId === 'settings') loadParentForm();
  }

  // --- History Tab ---
  async function populateHistoryFilters() {
    const filter = $('#historyDomainFilter');
    if (filter.options.length > 1) return; // Already populated
    try {
      const attempts = await getRecentAttempts(1000);
      const domains = [...new Set(attempts.map(a => a.domain))].sort();
      domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        filter.appendChild(opt);
      });
    } catch (e) { /* ignore */ }
  }

  async function renderHistory() {
    const content = $('#historyContent');
    const domainFilter = $('#historyDomainFilter').value;
    const sort = $('#historySort').value;

    try {
      let attempts = await getRecentAttempts(500);
      if (domainFilter) {
        attempts = attempts.filter(a => a.domain === domainFilter);
      }
      if (sort === 'oldest') attempts.reverse();
      if (sort === 'correct') attempts = attempts.filter(a => a.isCorrect);
      if (sort === 'wrong') attempts = attempts.filter(a => !a.isCorrect);

      if (attempts.length === 0) {
        content.innerHTML = '<p class="text-center text-muted mt-4">No questions attempted yet. Start practicing!</p>';
        return;
      }

      const shown = attempts.slice(0, 200);
      let html = `<div class="history-table-wrapper"><table class="history-table">
        <thead><tr>
          <th>Date</th><th>Domain</th><th>Skill</th><th>Question</th><th>Answer</th><th>Correct</th><th>Result</th>
        </tr></thead><tbody>`;

      for (let i = 0; i < shown.length; i++) {
        const a = shown[i];
        const date = new Date(a.timestamp).toLocaleDateString();
        const time = new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const resultIcon = a.isCorrect ? '✅' : '❌';
        const rowClass = a.isCorrect ? 'history-row-correct' : 'history-row-wrong';
        const rowId = 'hist-row-' + i;

        // Main row — clickable to expand
        html += `<tr class="${rowClass} history-main-row" data-row="${rowId}" role="button" tabindex="0" aria-expanded="false" title="Click for full details">
          <td>${date}<br><small>${time}</small></td>
          <td>${escapeHtml(a.domain || '-')}</td>
          <td>${escapeHtml(a.skill || '-')}</td>
          <td class="history-question">${escapeHtml(a.question || '')}</td>
          <td>${escapeHtml(a.childAnswer || '')}</td>
          <td>${escapeHtml(a.correctAnswer || '')}</td>
          <td>${resultIcon}</td>
        </tr>`;

        // Hidden detail row
        const hintText = escapeHtml(a.hint || 'None');
        const sourceLabel = a.source === 'ai' ? '🤖 AI' : '📝 Local';
        const timeSpent = a.timeSpentSeconds ? `${a.timeSpentSeconds}s` : '—';
        html += `<tr class="history-detail-row hidden" id="${rowId}">
          <td colspan="7">
            <div class="history-detail-card">
              <div class="history-detail-grid">
                <div><strong>Full Question:</strong><br>${escapeHtml(a.question || '')}</div>
                <div><strong>Child's Answer:</strong><br>${escapeHtml(a.childAnswer || '')}</div>
                <div><strong>Correct Answer:</strong><br>${escapeHtml(a.correctAnswer || '')}</div>
                <div><strong>Domain:</strong> ${escapeHtml(a.domain || '-')}</div>
                <div><strong>Skill:</strong> ${escapeHtml(a.skill || '-')}</div>
                <div><strong>Difficulty:</strong> ${a.difficulty || 1}/10</div>
                <div><strong>Result:</strong> ${a.isCorrect ? '✅ Correct' : '❌ Incorrect'}</div>
                <div><strong>Attempt:</strong> #${a.attemptCount || 1} &nbsp;|&nbsp; <strong>Hint Used:</strong> ${a.usedHint ? 'Yes' : 'No'}</div>
                <div><strong>Source:</strong> ${sourceLabel}</div>
                <div><strong>Time Spent:</strong> ${timeSpent}</div>
                <div><strong>Hint:</strong> ${hintText}</div>
              </div>
            </div>
          </td>
        </tr>`;
      }
      html += '</tbody></table></div>';
      if (attempts.length > 200) {
        html += `<p class="text-muted text-center mt-2">Showing 200 of ${attempts.length} entries. Export to see all.</p>`;
      }
      content.innerHTML = html;

      // Attach click handlers via event delegation
      content.querySelectorAll('.history-main-row').forEach(row => {
        row.addEventListener('click', () => toggleHistoryRow(row.dataset.row));
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleHistoryRow(row.dataset.row);
          }
        });
      });
    } catch (e) {
      console.error('History render error:', e);
      content.innerHTML = '<p class="text-center text-muted mt-4">Could not load history.</p>';
    }
  }

  function toggleHistoryRow(rowId) {
    const detailRow = document.getElementById(rowId);
    if (!detailRow) return;
    const mainRow = detailRow.previousElementSibling;
    const isOpen = !detailRow.classList.contains('hidden');
    detailRow.classList.toggle('hidden', isOpen);
    if (mainRow) {
      mainRow.setAttribute('aria-expanded', String(!isOpen));
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // --- AI Coach / Chat Tab ---
  function initChatTab() {
    // Chat is already set up; ensure quick actions are visible
    $('#chatQuickActions').classList.remove('hidden');
  }

  async function sendChatMessage() {
    const input = $('#chatInput');
    const message = input.value.trim();
    if (!message) return;

    const settings = getSettings();
    if (!settings.apiKey) {
      addChatMessage('assistant', '⚠️ Please configure an API key in the Settings tab to use the AI Coach.');
      return;
    }

    // Add user message
    addChatMessage('user', message);
    input.value = '';
    $('#chatQuickActions').classList.add('hidden');

    // Show typing indicator
    const typingId = addChatMessage('assistant', '<span class="loading-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;margin-right:8px;"></span> Thinking...');
    input.disabled = true;
    $('#chatSendBtn').disabled = true;

    try {
      // Gather all data
      const gradeLevel = settings.gradeLevel;
      const attempts = await getAttemptsByGrade(gradeLevel);
      const skillProgress = await getAllSkillProgress(gradeLevel);
      const dailyPractice = await getAllDailyPractice();

      // Call AI evaluation
      const response = await generateAIEvaluation(attempts, skillProgress, dailyPractice, message, state.chatHistory);

      // Update typing indicator with response
      updateChatMessage(typingId, response);

      // Add to conversation history
      state.chatHistory.push({ role: 'user', content: message });
      state.chatHistory.push({ role: 'assistant', content: response });
      if (state.chatHistory.length > 20) {
        state.chatHistory = state.chatHistory.slice(-20);
      }
    } catch (e) {
      updateChatMessage(typingId, '⚠️ Something went wrong. Please try again.');
    }

    input.disabled = false;
    $('#chatSendBtn').disabled = false;
    input.focus();

    // Scroll to bottom
    const msgContainer = $('#chatMessages');
    msgContainer.scrollTop = msgContainer.scrollHeight;
  }

  function addChatMessage(role, content) {
    const container = $('#chatMessages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `chat-message ${role}`;
    div.id = id;
    div.innerHTML = `<div class="chat-bubble">${content}</div>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  function updateChatMessage(id, content) {
    const el = document.getElementById(id);
    if (el) {
      el.querySelector('.chat-bubble').innerHTML = content.replace(/\n/g, '<br>');
      const container = $('#chatMessages');
      container.scrollTop = container.scrollHeight;
    }
  }

  // --- Dialogs ---
  function showConfirmDialog(title, message, callback) {
    $('#dialogTitle').textContent = title;
    $('#dialogMessage').textContent = message;
    $('#dialogOverlay').classList.remove('hidden');
    window._dialogCallback = callback;
    $('#dialogConfirm').focus();
  }

  function showConfirmDialogAsync(title, message) {
    return new Promise((resolve) => {
      $('#dialogTitle').textContent = title;
      $('#dialogMessage').textContent = message;
      $('#dialogOverlay').classList.remove('hidden');
      window._dialogCallback = () => resolve(true);
      const originalCancel = $('#dialogCancel').onclick;
      $('#dialogCancel').onclick = () => {
        closeDialog();
        resolve(false);
        $('#dialogCancel').onclick = originalCancel;
      };
      $('#dialogConfirm').focus();
    });
  }

  function closeDialog() {
    $('#dialogOverlay').classList.add('hidden');
    window._dialogCallback = null;
  }

  // --- Initialize App ---
  document.addEventListener('DOMContentLoaded', init);

  // Handle service worker updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker activated
      console.log('Service Worker updated');
    });
  }

  // Preload voices for speech synthesis
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (state.lastFeedbackTimeout) {
      clearTimeout(state.lastFeedbackTimeout);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });

})();
