// aiMath - IndexedDB Database Layer
// Stores: attempts, skillProgress, dailyPractice, sessions, generatedQuestions

const DB_NAME = 'SmartMathTutorDB';
const DB_VERSION = 2;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Question attempts store
      if (!database.objectStoreNames.contains('attempts')) {
        const attemptsStore = database.createObjectStore('attempts', { keyPath: 'id' });
        attemptsStore.createIndex('timestamp', 'timestamp', { unique: false });
        attemptsStore.createIndex('domain', 'domain', { unique: false });
        attemptsStore.createIndex('skill', 'skill', { unique: false });
        attemptsStore.createIndex('gradeLevel', 'gradeLevel', { unique: false });
        attemptsStore.createIndex('isCorrect', 'isCorrect', { unique: false });
      }

      // Skill progress store
      if (!database.objectStoreNames.contains('skillProgress')) {
        const spStore = database.createObjectStore('skillProgress', { keyPath: 'id' });
        spStore.createIndex('gradeLevel', 'gradeLevel', { unique: false });
        spStore.createIndex('domain', 'domain', { unique: false });
        spStore.createIndex('skill', 'skill', { unique: false });
      }

      // Daily practice store
      if (!database.objectStoreNames.contains('dailyPractice')) {
        database.createObjectStore('dailyPractice', { keyPath: 'date' });
      }

      // Sessions store
      if (!database.objectStoreNames.contains('sessions')) {
        database.createObjectStore('sessions', { keyPath: 'id' });
      }

      // Generated questions cache
      if (!database.objectStoreNames.contains('generatedQuestions')) {
        database.createObjectStore('generatedQuestions', { keyPath: 'id' });
      }

      // AI evaluation logs
      if (!database.objectStoreNames.contains('evaluationLogs')) {
        const evalStore = database.createObjectStore('evaluationLogs', { keyPath: 'id', autoIncrement: true });
        evalStore.createIndex('date', 'date', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

function getStore(storeName, mode = 'readonly') {
  if (!db) {
    throw new Error('Database not opened');
  }
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// --- Attempts ---

async function saveAttempt(attempt) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('attempts', 'readwrite');
    const request = store.put(attempt);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAttemptsByDomain(domain, limit = 50) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('attempts');
    const index = store.index('domain');
    const results = [];
    const request = index.openCursor(IDBKeyRange.only(domain), 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function getRecentAttempts(limit = 20) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('attempts');
    const index = store.index('timestamp');
    const results = [];
    const request = index.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function getAttemptsByGrade(gradeLevel) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('attempts');
    const index = store.index('gradeLevel');
    const results = [];
    const request = index.openCursor(IDBKeyRange.only(gradeLevel));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function getTotalAttempts() {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('attempts');
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Skill Progress ---

function makeSkillProgressId(gradeLevel, domain, skill) {
  return `${gradeLevel}::${domain}::${skill}`;
}

async function getSkillProgress(gradeLevel, domain, skill) {
  await openDB();
  const id = makeSkillProgressId(gradeLevel, domain, skill);
  return new Promise((resolve, reject) => {
    const store = getStore('skillProgress');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveSkillProgress(progress) {
  await openDB();
  if (!progress.id) {
    progress.id = makeSkillProgressId(progress.gradeLevel, progress.domain, progress.skill);
  }
  return new Promise((resolve, reject) => {
    const store = getStore('skillProgress', 'readwrite');
    const request = store.put(progress);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllSkillProgress(gradeLevel) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('skillProgress');
    const index = store.index('gradeLevel');
    const results = [];
    const request = index.openCursor(IDBKeyRange.only(gradeLevel));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Daily Practice ---

async function getDailyPractice(date) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('dailyPractice');
    const request = store.get(date);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function saveDailyPractice(record) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('dailyPractice', 'readwrite');
    const request = store.put(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllDailyPractice() {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('dailyPractice');
    const results = [];
    const request = store.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Sessions ---

async function saveSession(session) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('sessions', 'readwrite');
    const request = store.put(session);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecentSessions(limit = 30) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('sessions');
    const results = [];
    const request = store.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Generated Questions Cache ---

async function cacheGeneratedQuestion(question) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('generatedQuestions', 'readwrite');
    const request = store.put(question);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// --- Data Export / Import ---

async function exportAllData() {
  await openDB();
  const data = {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    attempts: [],
    skillProgress: [],
    dailyPractice: [],
    sessions: []
  };

  // Get all attempts
  const attemptsStore = getStore('attempts');
  data.attempts = await new Promise((resolve, reject) => {
    const results = [];
    const request = attemptsStore.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });

  // Get all skill progress
  const spStore = getStore('skillProgress');
  data.skillProgress = await new Promise((resolve, reject) => {
    const results = [];
    const request = spStore.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });

  // Get all daily practice
  const dpStore = getStore('dailyPractice');
  data.dailyPractice = await new Promise((resolve, reject) => {
    const results = [];
    const request = dpStore.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });

  // Get all sessions
  const sessionsStore = getStore('sessions');
  data.sessions = await new Promise((resolve, reject) => {
    const results = [];
    const request = sessionsStore.openCursor();
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });

  return data;
}

async function importAllData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  if (!Array.isArray(data.attempts) || !Array.isArray(data.skillProgress) || !Array.isArray(data.dailyPractice)) {
    throw new Error('Data missing required arrays');
  }

  await openDB();

  // Clear existing data
  const storeNames = ['attempts', 'skillProgress', 'dailyPractice', 'sessions', 'generatedQuestions'];
  for (const name of storeNames) {
    await new Promise((resolve, reject) => {
      const store = getStore(name, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import attempts
  const attemptsStore = getStore('attempts', 'readwrite');
  for (const attempt of data.attempts) {
    await new Promise((resolve, reject) => {
      const request = attemptsStore.put(attempt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import skill progress
  const spStore = getStore('skillProgress', 'readwrite');
  for (const sp of data.skillProgress) {
    await new Promise((resolve, reject) => {
      const request = spStore.put(sp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import daily practice
  const dpStore = getStore('dailyPractice', 'readwrite');
  for (const dp of data.dailyPractice) {
    await new Promise((resolve, reject) => {
      const request = dpStore.put(dp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import sessions
  if (data.sessions && Array.isArray(data.sessions)) {
    const sessionsStore = getStore('sessions', 'readwrite');
    for (const session of data.sessions) {
      await new Promise((resolve, reject) => {
        const request = sessionsStore.put(session);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// --- Evaluation Logs ---

async function saveEvaluationLog(entry) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('evaluationLogs', 'readwrite');
    const request = store.add(entry);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getEvaluationLogs(limit = 50) {
  await openDB();
  return new Promise((resolve, reject) => {
    const store = getStore('evaluationLogs');
    const index = store.index('date');
    const results = [];
    const request = index.openCursor(null, 'prev');
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// --- Reset ---

async function resetAllData() {
  await openDB();
  const storeNames = ['attempts', 'skillProgress', 'dailyPractice', 'sessions', 'generatedQuestions', 'evaluationLogs'];
  for (const name of storeNames) {
    await new Promise((resolve, reject) => {
      const store = getStore(name, 'readwrite');
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
