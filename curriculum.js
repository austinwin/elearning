// aiMath - Curriculum & Local Question Generator
// Covers Pre-K through 5th Grade across all math domains

const GRADE_LEVELS = ['pre-k', 'kindergarten', '1st', '2nd', '3rd', '4th', '5th'];

const DOMAINS = [
  'Counting and Cardinality',
  'Operations and Algebraic Thinking',
  'Number Sense and Place Value',
  'Measurement',
  'Time',
  'Money',
  'Geometry',
  'Data and Graphs',
  'Fractions',
  'Decimals',
  'Patterns',
  'Word Problems'
];

const GRADE_LABELS = {
  'pre-k': 'Pre-K',
  'kindergarten': 'Kindergarten',
  '1st': '1st Grade',
  '2nd': '2nd Grade',
  '3rd': '3rd Grade',
  '4th': '4th Grade',
  '5th': '5th Grade'
};

const DOMAIN_GRADE_MAP = {
  'pre-k': ['Counting and Cardinality', 'Geometry', 'Patterns', 'Measurement'],
  'kindergarten': ['Counting and Cardinality', 'Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Patterns', 'Measurement'],
  '1st': ['Counting and Cardinality', 'Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Measurement', 'Time', 'Money', 'Data and Graphs', 'Word Problems'],
  '2nd': ['Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Measurement', 'Time', 'Money', 'Data and Graphs', 'Fractions', 'Word Problems'],
  '3rd': ['Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Measurement', 'Time', 'Money', 'Data and Graphs', 'Fractions', 'Word Problems', 'Patterns'],
  '4th': ['Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Measurement', 'Fractions', 'Decimals', 'Data and Graphs', 'Word Problems', 'Patterns'],
  '5th': ['Operations and Algebraic Thinking', 'Number Sense and Place Value', 'Geometry', 'Measurement', 'Fractions', 'Decimals', 'Data and Graphs', 'Word Problems', 'Patterns']
};

const SKILLS_BY_DOMAIN = {
  'Counting and Cardinality': ['counting', 'number recognition', 'comparing quantities', 'ordering numbers'],
  'Operations and Algebraic Thinking': ['addition', 'subtraction', 'multiplication', 'division', 'missing numbers', 'even odd', 'skip counting', 'order of operations'],
  'Number Sense and Place Value': ['place value', 'comparing numbers', 'rounding', 'expanded form'],
  'Measurement': ['length', 'weight', 'capacity', 'area', 'perimeter', 'volume', 'unit conversion', 'comparing measurements'],
  'Time': ['reading clocks', 'elapsed time', 'time intervals', 'calendar'],
  'Money': ['coin recognition', 'counting money', 'making change', 'money word problems'],
  'Geometry': ['2D shapes', '3D shapes', 'angles', 'lines', 'symmetry', 'coordinate plane', 'shape classification'],
  'Data and Graphs': ['picture graphs', 'bar graphs', 'line plots', 'data interpretation', 'scaled graphs'],
  'Fractions': ['fraction basics', 'equivalent fractions', 'comparing fractions', 'adding fractions', 'subtracting fractions', 'multiplying fractions', 'dividing fractions', 'fractions on number line'],
  'Decimals': ['decimal basics', 'comparing decimals', 'adding decimals', 'subtracting decimals', 'multiplying decimals', 'dividing decimals', 'decimal place value'],
  'Patterns': ['shape patterns', 'number patterns', 'growing patterns', 'pattern rules'],
  'Word Problems': ['one-step', 'two-step', 'multi-step', 'mixed operations']
};

// --- Helper Functions ---

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function generateDistractors(correctAnswer, domain, difficulty) {
  const correct = String(correctAnswer).trim();
  const distractors = new Set();

  // Try numeric
  const num = parseFloat(correct);
  if (!isNaN(num) && isFinite(num)) {
    const isInt = Number.isInteger(num);
    const step = isInt ? 1 : (num < 1 ? 0.1 : 1);

    // Off-by errors
    distractors.add(String(num + step));
    distractors.add(String(num - step));
    if (num >= 2) distractors.add(String(num + step * 2));
    if (num >= 3) distractors.add(String(num - step * 2));
    if (num > 0) distractors.add(String(num * 2));
    if (num > 0 && num < 100) distractors.add(String(num * 10));
    if (num > 10) distractors.add(String(Math.round(num / 10)));

    // Swapped digits for 2-digit numbers
    if (isInt && num >= 10 && num <= 99) {
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      if (tens !== ones) distractors.add(String(ones * 10 + tens));
    }

    // Common misconceptions
    if (isInt && num > 1) distractors.add(String(num - 1));
    if (isInt) distractors.add(String(num + 1));

    // For fractions like "3/4"
    if (correct.includes('/')) {
      const parts = correct.split('/');
      if (parts.length === 2) {
        const n = parseInt(parts[0]);
        const d = parseInt(parts[1]);
        if (!isNaN(n) && !isNaN(d) && d > 0) {
          distractors.add(`${n + 1}/${d}`);
          distractors.add(`${Math.max(1, n - 1)}/${d}`);
          distractors.add(`${n}/${d + 1}`);
          distractors.add(`${n}/${Math.max(2, d - 1)}`);
        }
      }
    }

    // Clean up: remove the correct answer, non-numeric, and zero/negative for young kids
    distractors.delete(correct);
    const cleaned = [...distractors].filter(d => {
      const v = parseFloat(d);
      if (isNaN(v) || !isFinite(v)) return false;
      if (difficulty <= 2 && v < 0) return false;
      return d !== correct;
    });

    if (cleaned.length >= 3) {
      return shuffleArray(cleaned).slice(0, 3);
    }

    // Fill with nearby values
    const fallback = [];
    for (let i = 1; fallback.length < 3 && i <= 5; i++) {
      const candidates = [num + i * step, num - i * step];
      for (const c of candidates) {
        const cs = String(c);
        if (!distractors.has(cs) && cs !== correct && !isNaN(c) && isFinite(c) && c >= 0 && fallback.length < 3) {
          fallback.push(cs);
        }
      }
    }
    return fallback;
  }

  // Text answer — generate generic distractors based on domain
  const wordBank = {
    'Geometry': ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'cube', 'sphere', 'cone', 'cylinder'],
    'Time': ['1:00', '2:00', '3:00', '4:00', '12:00', '1:30', '2:30', '3:30'],
    'Money': ['5¢', '10¢', '25¢', '50¢', '$1', '$5'],
    'Fractions': ['1/2', '1/3', '1/4', '2/3', '3/4', '1/5', '2/5'],
    'Decimals': ['0.1', '0.5', '0.25', '0.75', '1.0', '0.01']
  };

  const pool = wordBank[domain] || ['Yes', 'No', 'Maybe', 'All of the above'];
  const filtered = pool.filter(w => w.toLowerCase() !== correct.toLowerCase());
  if (filtered.length >= 3) return shuffleArray(filtered).slice(0, 3);

  return ['Option A', 'Option B', 'Option C'];
}

function makeQuestion(domain, skill, difficulty, questionType, question, correctAnswer, acceptedAnswers, choices, hint) {
  // Force all questions to be multiple_choice
  const qType = 'multiple_choice';
  let finalChoices = choices || [];

  // Auto-generate choices if insufficient
  if (!finalChoices || finalChoices.length < 2) {
    const distractorPool = finalChoices && finalChoices.length > 0 ? [...finalChoices] : [];
    const generated = generateDistractors(correctAnswer, domain, difficulty);
    for (const d of generated) {
      if (!distractorPool.includes(d)) distractorPool.push(d);
    }
    // Ensure correct answer is in the pool
    const correctStr = String(correctAnswer);
    if (!distractorPool.includes(correctStr)) {
      distractorPool.push(correctStr);
    }
    // Ensure we have at least 3 choices, max 4
    finalChoices = shuffleArray(distractorPool).slice(0, Math.min(4, Math.max(3, distractorPool.length)));
    // Make sure correct answer is in final choices
    if (!finalChoices.includes(correctStr)) {
      finalChoices[randInt(0, finalChoices.length - 1)] = correctStr;
    }
  }

  // Ensure correct answer is in choices
  const correctStr = String(correctAnswer);
  if (!finalChoices.includes(correctStr)) {
    finalChoices.push(correctStr);
    finalChoices = shuffleArray(finalChoices).slice(0, 4);
  }

  return {
    reasoning: 'Generated locally',
    domain,
    skill,
    difficulty: Math.min(10, Math.max(1, difficulty)),
    question_type: qType,
    question,
    choices: finalChoices,
    correct_answer: correctStr,
    accepted_answers: acceptedAnswers || [correctStr],
    hint: hint || 'Think carefully about the question.',
    source: 'local'
  };
}

// --- Question Templates by Grade ---

// ======================== PRE-K ========================

const PRE_K_TEMPLATES = {
  counting: [
    () => {
      const count = randInt(1, 10);
      return makeQuestion('Counting and Cardinality', 'counting', 1, 'numeric',
        `How many stars are there? ★ ${'★ '.repeat(count - 1).trim()}`,
        count, [String(count)], [],
        `Count each star one by one. Start at 1 and go up.`);
    },
    () => {
      const count = randInt(1, 8);
      const animal = randChoice(['🐶', '🐱', '🐰', '🐸', '🐵']);
      return makeQuestion('Counting and Cardinality', 'counting', 1, 'numeric',
        `Count the animals: ${(animal + ' ').repeat(count).trim()}`,
        count, [String(count)], [],
        `Point to each ${animal} and count out loud.`);
    },
    () => {
      const a = randInt(1, 5);
      const b = randInt(1, 5);
      const total = a + b;
      return makeQuestion('Counting and Cardinality', 'counting', 2, 'numeric',
        `Count all the apples: 🍎 ${'🍎 '.repeat(a - 1).trim()} and 🍏 ${'🍏 '.repeat(b - 1).trim()}`,
        total, [String(total)], [],
        `Count the red apples first, then the green apples.`);
    }
  ],
  numberSense: [
    () => {
      const num = randInt(1, 10);
      const words = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
      return makeQuestion('Counting and Cardinality', 'number recognition', 1, 'multiple_choice',
        `Which number is this? ${num}`,
        words[num - 1], words.slice(0, 10),
        shuffleArray([words[num - 1], words[randInt(0, 9)], words[randInt(0, 9)], words[randInt(0, 9)]]),
        `The number ${num} is written as "${words[num - 1]}".`);
    },
    () => {
      const a = randInt(1, 6);
      const b = randInt(1, 6);
      const bigger = Math.max(a, b);
      return makeQuestion('Counting and Cardinality', 'comparing quantities', 2, 'multiple_choice',
        `Which group has more? Group A: ${'●'.repeat(a)} (${a}) vs Group B: ${'●'.repeat(b)} (${b})`,
        bigger === a ? 'Group A' : 'Group B',
        ['Group A', 'Group B'],
        [],
        `Count each group. The group with the bigger number has more.`);
    },
    () => {
      const a = randInt(2, 8);
      const b = randInt(2, 8);
      const same = a === b;
      return makeQuestion('Counting and Cardinality', 'comparing quantities', 1, 'multiple_choice',
        `Are these the same? ${'🔵'.repeat(a)} and ${'🔴'.repeat(b)}`,
        same ? 'Yes' : 'No',
        ['Yes', 'No'],
        ['Yes', 'No'],
        `Count both groups. Same number means they are equal.`);
    }
  ],
  geometry: [
    () => {
      const shapes = ['circle', 'square', 'triangle', 'rectangle'];
      const shape = randChoice(shapes);
      const features = { circle: 'round', square: '4 equal sides', triangle: '3 sides', rectangle: '4 sides (2 long, 2 short)' };
      return makeQuestion('Geometry', '2D shapes', 1, 'multiple_choice',
        `What shape has ${features[shape]}?`,
        shape, shapes,
        shuffleArray(shapes),
        `A ${shape} has ${features[shape]}.`);
    },
    () => {
      const shapes = ['circle', 'square', 'triangle', 'rectangle'];
      const shape = randChoice(shapes);
      return makeQuestion('Geometry', '2D shapes', 1, 'multiple_choice',
        `Which one is a ${shape}?`,
        shape, shapes,
        shuffleArray(shapes),
        `Look at the shape carefully. A ${shape} has a special look.`);
    }
  ],
  patterns: [
    () => {
      const patterns = [
        { seq: '🔴 🔵 🔴 🔵', next: '🔴', hint: 'Red, Blue, Red, Blue... what comes after Blue?' },
        { seq: '⭐ 🌙 ⭐ 🌙', next: '⭐', hint: 'Star, Moon, Star, Moon... what comes after Moon?' },
        { seq: '🍎 🍌 🍎 🍌', next: '🍎', hint: 'Apple, Banana, Apple, Banana... what comes after Banana?' }
      ];
      const p = randChoice(patterns);
      return makeQuestion('Patterns', 'shape patterns', 1, 'text',
        `What comes next in this pattern? ${p.seq} ___`,
        p.next, [p.next], [],
        p.hint);
    },
    () => {
      const patterns = [
        { seq: '🔺 🔺 🔻 🔺 🔺', next: '🔻', hint: 'Two up arrows, one down arrow, then repeat.' },
        { seq: '🟢 🟡 🟢 🟡', next: '🟢', hint: 'Green, Yellow, Green, Yellow... what comes after Yellow?' }
      ];
      const p = randChoice(patterns);
      return makeQuestion('Patterns', 'shape patterns', 2, 'text',
        `What comes next? ${p.seq} ___`,
        p.next, [p.next], [],
        p.hint);
    }
  ],
  measurement: [
    () => {
      const a = randInt(2, 8);
      const b = randInt(2, 8);
      const bigger = Math.max(a, b);
      const smaller = Math.min(a, b);
      return makeQuestion('Measurement', 'comparing measurements', 1, 'multiple_choice',
        `Which is taller? Block tower A is ${bigger} blocks. Block tower B is ${smaller} blocks.`,
        'Tower A', ['Tower A', 'Tower B'],
        ['Tower A', 'Tower B'],
        `The tower with more blocks is taller. ${bigger} is more than ${smaller}.`);
    },
    () => {
      return makeQuestion('Measurement', 'comparing measurements', 1, 'multiple_choice',
        `Which is heavier? A 🐘 or a 🐭?`,
        'Elephant', ['Elephant', 'Mouse'],
        ['Elephant', 'Mouse'],
        `An elephant is much bigger and heavier than a mouse.`);
    }
  ]
};

// ======================== KINDERGARTEN ========================

const KINDERGARTEN_TEMPLATES = {
  counting: [
    () => {
      const num = randInt(1, 20);
      return makeQuestion('Counting and Cardinality', 'counting', 1, 'numeric',
        `Count from 1 to ${num}. What is the last number?`,
        num, [String(num)], [],
        `Start at 1 and count up until you reach the end.`);
    },
    () => {
      const start = randInt(3, 12);
      const end = randInt(start + 2, start + 6);
      return makeQuestion('Counting and Cardinality', 'counting', 2, 'numeric',
        `How many numbers are there from ${start} to ${end}?`,
        end - start + 1, [String(end - start + 1)], [],
        `Count: ${start}, ${start + 1}, ... up to ${end}.`);
    },
    () => {
      const num = randInt(11, 19);
      const tens = Math.floor(num / 10);
      const ones = num % 10;
      return makeQuestion('Counting and Cardinality', 'number recognition', 2, 'numeric',
        `What number is ${tens} ten and ${ones} ones?`,
        num, [String(num)], [],
        `${tens} ten = ${tens * 10}. Add ${ones} ones = ${num}.`);
    }
  ],
  operations: [
    () => {
      const a = randInt(1, 4);
      const b = randInt(1, 5 - a);
      return makeQuestion('Operations and Algebraic Thinking', 'addition', 1, 'numeric',
        `What is ${a} + ${b}?`,
        a + b, [String(a + b)], [],
        `Start at ${a} and count up ${b} more.`);
    },
    () => {
      const a = randInt(2, 5);
      const b = randInt(1, a);
      return makeQuestion('Operations and Algebraic Thinking', 'subtraction', 1, 'numeric',
        `What is ${a} − ${b}?`,
        a - b, [String(a - b)], [],
        `Start at ${a} and count back ${b}.`);
    },
    () => {
      const a = randInt(3, 5);
      const b = randInt(1, 2);
      const total = a + b;
      return makeQuestion('Operations and Algebraic Thinking', 'addition', 2, 'numeric',
        `You have ${a} 🍪 cookies. Your friend gives you ${b} more. How many cookies do you have now?`,
        total, [String(total)], [],
        `Add ${a} and ${b} together.`);
    }
  ],
  geometry: [
    () => {
      const shape = randChoice(['circle', 'square', 'triangle', 'rectangle', 'hexagon']);
      const sides = { circle: 0, square: 4, triangle: 3, rectangle: 4, hexagon: 6 };
      const s = sides[shape];
      return makeQuestion('Geometry', '2D shapes', 1, 'numeric',
        `How many sides does a ${shape} have?`,
        s, [String(s), s === 0 ? 'zero' : ''].filter(Boolean), [],
        s === 0 ? `A ${shape} is round and has no straight sides.` : `Count each straight side of the ${shape}.`);
    },
    () => {
      const positions = ['above', 'below', 'inside', 'outside', 'next to', 'behind'];
      const pos = randChoice(positions);
      const correct = randChoice(['ball', 'book', 'toy', 'cup']);
      return makeQuestion('Geometry', '2D shapes', 1, 'multiple_choice',
        `The cat is ${pos} the box. Where is the cat?`,
        pos, positions,
        shuffleArray([pos, ...shuffleArray(positions.filter(p => p !== pos)).slice(0, 3)]),
        `"${pos}" tells you where something is.`);
    }
  ],
  patterns: [
    () => {
      const start = randInt(1, 3);
      const step = randInt(2, 3);
      const seq = [start, start + step, start + 2 * step];
      return makeQuestion('Patterns', 'number patterns', 2, 'numeric',
        `What comes next? ${seq.join(', ')}, ___`,
        start + 3 * step, [String(start + 3 * step)], [],
        `Each number is ${step} more than the one before it.`);
    }
  ],
  measurement: [
    () => {
      const a = randInt(3, 10);
      const b = randInt(3, 10);
      return makeQuestion('Measurement', 'comparing measurements', 1, 'multiple_choice',
        `Pencil A is ${a} cubes long. Pencil B is ${b} cubes long. Which is longer?`,
        a > b ? 'Pencil A' : (b > a ? 'Pencil B' : 'Same'),
        ['Pencil A', 'Pencil B', 'Same'],
        ['Pencil A', 'Pencil B', 'Same'],
        `Compare ${a} and ${b}. The bigger number means longer.`);
    }
  ]
};

// ======================== 1ST GRADE ========================

const FIRST_GRADE_TEMPLATES = {
  operations: [
    () => {
      const a = randInt(5, 15);
      const b = randInt(1, 20 - a);
      return makeQuestion('Operations and Algebraic Thinking', 'addition', 3, 'numeric',
        `What is ${a} + ${b}?`,
        a + b, [String(a + b)], [],
        `Try counting on from ${a}: ${a}, ${a + 1}, ${a + 2}...`);
    },
    () => {
      const a = randInt(10, 20);
      const b = randInt(1, a);
      return makeQuestion('Operations and Algebraic Thinking', 'subtraction', 3, 'numeric',
        `What is ${a} − ${b}?`,
        a - b, [String(a - b)], [],
        `Count back ${b} from ${a}.`);
    },
    () => {
      const a = randInt(3, 10);
      const sum = randInt(a + 2, a + 8);
      const missing = sum - a;
      return makeQuestion('Operations and Algebraic Thinking', 'missing numbers', 3, 'numeric',
        `${a} + ___ = ${sum}. What is the missing number?`,
        missing, [String(missing)], [],
        `Think: ${sum} − ${a} = ?`);
    }
  ],
  placeValue: [
    () => {
      const tens = randInt(1, 9);
      const ones = randInt(0, 9);
      const num = tens * 10 + ones;
      return makeQuestion('Number Sense and Place Value', 'place value', 2, 'multiple_choice',
        `In the number ${num}, how many tens are there?`,
        String(tens), ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
        shuffleArray([String(tens), String(tens - 1 || 1), String(tens + 1 > 9 ? 9 : tens + 1), String(randInt(1, 9))]),
        `The first digit ${tens} tells you how many tens.`);
    },
    () => {
      const a = randInt(11, 99);
      const b = randInt(11, 99);
      const symbol = a > b ? '>' : (a < b ? '<' : '=');
      return makeQuestion('Number Sense and Place Value', 'comparing numbers', 3, 'text',
        `Compare: ${a} ___ ${b}. Type >, <, or =`,
        symbol, [symbol, symbol === '>' ? 'greater than' : (symbol === '<' ? 'less than' : 'equal')], [],
        `Look at the tens digit first, then the ones digit.`);
    }
  ],
  geometry: [
    () => {
      const shape = randChoice(['square', 'rectangle', 'triangle', 'circle', 'pentagon']);
      const sides = { square: 4, rectangle: 4, triangle: 3, circle: 0, pentagon: 5 };
      const corners = { square: 4, rectangle: 4, triangle: 3, circle: 0, pentagon: 5 };
      return makeQuestion('Geometry', '2D shapes', 2, 'numeric',
        `How many corners does a ${shape} have?`,
        corners[shape], [String(corners[shape]), corners[shape] === 0 ? 'zero' : ''].filter(Boolean), [],
        `Count the pointy corners of the ${shape}.`);
    },
    () => {
      const shape3d = randChoice(['cube', 'sphere', 'cylinder', 'cone']);
      const props = {
        cube: { faces: 6, desc: 'six square faces and looks like a box' },
        sphere: { faces: 0, desc: 'completely round like a ball' },
        cylinder: { faces: 2, desc: 'two flat circles and a curved side' },
        cone: { faces: 1, desc: 'one flat circle and a pointy top' }
      };
      return makeQuestion('Geometry', '3D shapes', 2, 'multiple_choice',
        `Which 3D shape ${props[shape3d].desc}?`,
        shape3d, ['cube', 'sphere', 'cylinder', 'cone'],
        shuffleArray(['cube', 'sphere', 'cylinder', 'cone']),
        `Think about how a ${shape3d} looks.`);
    }
  ],
  time: [
    () => {
      const hour = randInt(1, 12);
      return makeQuestion('Time', 'reading clocks', 2, 'text',
        `If the short hand points to ${hour} and the long hand points to 12, what time is it? Write like "3 o\'clock".`,
        `${hour} o'clock`, [`${hour} o'clock`, `${hour}:00`], [],
        `When the long hand is at 12, it's exactly ${hour} o'clock.`);
    },
    () => {
      const hour = randInt(1, 12);
      return makeQuestion('Time', 'reading clocks', 3, 'text',
        `If the short hand is halfway between ${hour} and ${hour === 12 ? 1 : hour + 1}, and the long hand is at 6, what time is it?`,
        `${hour}:30`, [`${hour}:30`, `half past ${hour}`], [],
        `When the long hand is at 6, it's half past the hour.`);
    }
  ],
  money: [
    () => {
      const coin = randChoice(['penny', 'nickel', 'dime', 'quarter']);
      const values = { penny: 1, nickel: 5, dime: 10, quarter: 25 };
      return makeQuestion('Money', 'coin recognition', 1, 'numeric',
        `How many cents is one ${coin} worth?`,
        values[coin], [String(values[coin])], [],
        `A ${coin} is worth ${values[coin]}¢.`);
    }
  ],
  wordProblems: [
    () => {
      const a = randInt(5, 15);
      const b = randInt(2, 8);
      return makeQuestion('Word Problems', 'one-step', 3, 'numeric',
        `Sam has ${a} stickers. He gives ${b} stickers to his friend. How many stickers does Sam have left?`,
        a - b, [String(a - b)], [],
        `This is subtraction: ${a} − ${b} = ?`);
    }
  ]
};

// Helper to generate 2nd-5th grade templates
function makeOpTemplate(gradeLevel, domain, skill, difficulty, operation) {
  return () => {
    let a, b, answer;
    switch (operation) {
      case 'add_2digit':
        a = randInt(20, 99);
        b = randInt(10, 99);
        answer = a + b;
        break;
      case 'sub_2digit':
        a = randInt(30, 99);
        b = randInt(10, a);
        answer = a - b;
        break;
      case 'mult_facts':
        a = randInt(2, 10);
        b = randInt(2, 10);
        answer = a * b;
        break;
      case 'div_basic':
        b = randInt(2, 9);
        answer = randInt(2, 9);
        a = b * answer;
        break;
      case 'mult_2digit':
        a = randInt(10, 50);
        b = randInt(2, 9);
        answer = a * b;
        break;
      case 'div_remainder':
        b = randInt(3, 8);
        const quotient = randInt(3, 12);
        const remainder = randInt(1, b - 1);
        a = b * quotient + remainder;
        answer = `${quotient} R ${remainder}`;
        break;
      case 'mult_multi':
        a = randInt(10, 99);
        b = randInt(10, 50);
        answer = a * b;
        break;
      case 'div_multi':
        b = randInt(3, 12);
        answer = randInt(5, 20);
        a = b * answer;
        break;
      default:
        a = randInt(10, 50);
        b = randInt(1, 20);
        answer = a + b;
    }
    const opSymbol = { add_2digit: '+', sub_2digit: '−', mult_facts: '×', div_basic: '÷', mult_2digit: '×', div_remainder: '÷', mult_multi: '×', div_multi: '÷' };
    const qType = operation === 'div_remainder' ? 'text' : 'numeric';
    return makeQuestion(domain, skill, difficulty, qType,
      `What is ${a} ${opSymbol[operation]} ${b}?`,
      answer, [String(answer)], [],
      `Solve step by step.`);
  };
}

function makeFracTemplate(operation, difficulty) {
  return () => {
    const ops = {
      add_like: () => {
        const denom = randChoice([2, 3, 4, 5, 6, 8, 10]);
        const n1 = randInt(1, denom - 1);
        const n2 = randInt(1, denom - n1);
        return [`${n1}/${denom} + ${n2}/${denom}`, `${n1 + n2}/${denom}`, `${n1 + n2}/${denom}`];
      },
      sub_like: () => {
        const denom = randChoice([2, 3, 4, 5, 6, 8, 10]);
        const n1 = randInt(2, denom - 1);
        const n2 = randInt(1, n1);
        return [`${n1}/${denom} − ${n2}/${denom}`, `${n1 - n2}/${denom}`, `${n1 - n2}/${denom}`];
      },
      compare: () => {
        const denom1 = randChoice([2, 3, 4, 6, 8]);
        const denom2 = randChoice([2, 3, 4, 6, 8]);
        const n1 = randInt(1, denom1);
        const n2 = randInt(1, denom2);
        const val1 = n1 / denom1;
        const val2 = n2 / denom2;
        const sym = val1 > val2 ? '>' : (val1 < val2 ? '<' : '=');
        return [`Compare: ${n1}/${denom1} ___ ${n2}/${denom2}`, sym, sym];
      },
      mult_whole: () => {
        const whole = randInt(2, 6);
        const denom = randChoice([2, 3, 4, 5, 8]);
        const n = randInt(1, denom - 1);
        return [`${whole} × ${n}/${denom} = ?`, `${whole * n}/${denom}`, `${whole * n}/${denom}`];
      }
    };
    const [q, ans] = ops[operation] ? ops[operation]() : ops.add_like();
    return makeQuestion('Fractions', `Fraction ${operation}`, difficulty, 'text', q, ans, [ans], [], 'Think about the denominators.');
  };
}

function makeDecimalTemplate(operation, difficulty) {
  return () => {
    const ops = {
      add: () => {
        const a = (randInt(10, 99) / 10).toFixed(1);
        const b = (randInt(10, 99) / 10).toFixed(1);
        return [`${a} + ${b} = ?`, (parseFloat(a) + parseFloat(b)).toFixed(1)];
      },
      sub: () => {
        const a = (randInt(30, 99) / 10).toFixed(1);
        const b = (randInt(10, parseFloat(a) * 10 - 10) / 10).toFixed(1);
        return [`${a} − ${b} = ?`, (parseFloat(a) - parseFloat(b)).toFixed(1)];
      },
      compare: () => {
        const a = (randInt(10, 99) / 100).toFixed(2);
        const b = (randInt(10, 99) / 100).toFixed(2);
        const va = parseFloat(a);
        const vb = parseFloat(b);
        const sym = va > vb ? '>' : (va < vb ? '<' : '=');
        return [`Compare: ${a} ___ ${b}`, sym];
      },
      mult: () => {
        const a = (randInt(10, 50) / 10).toFixed(1);
        const b = randInt(2, 9);
        return [`${a} × ${b} = ?`, (parseFloat(a) * b).toFixed(1)];
      }
    };
    const [q, ans] = ops[operation] ? ops[operation]() : ops.add();
    return makeQuestion('Decimals', `Decimal ${operation}`, difficulty, 'text', q, ans, [ans], [], 'Line up the decimal points.');
  };
}

function makeGeoTemplate(topic, difficulty) {
  return () => {
    const geos = {
      area_rect: () => {
        const w = randInt(3, 12);
        const h = randInt(3, 12);
        return [`What is the area of a rectangle that is ${w} units wide and ${h} units tall?`, w * h, `${w * h} square units`];
      },
      perimeter_rect: () => {
        const w = randInt(3, 10);
        const h = randInt(3, 10);
        return [`What is the perimeter of a rectangle that is ${w} by ${h}?`, 2 * (w + h), `${2 * (w + h)} units`];
      },
      volume: () => {
        const l = randInt(2, 6);
        const w = randInt(2, 6);
        const h = randInt(2, 6);
        return [`What is the volume of a box ${l} × ${w} × ${h}?`, l * w * h, `${l * w * h} cubic units`];
      },
      angles: () => {
        const angles = [
          { type: 'right', deg: 90, desc: 'exactly 90 degrees, like a corner of a square' },
          { type: 'acute', deg: randChoice([30, 45, 60]), desc: 'less than 90 degrees' },
          { type: 'obtuse', deg: randChoice([120, 135, 150]), desc: 'more than 90 degrees but less than 180' }
        ];
        const a = randChoice(angles);
        return [`An angle that is ${a.desc} is called a(n) ___ angle.`, a.type, a.type];
      }
    };
    const [q, ans, accepted] = geos[topic] ? geos[topic]() : geos.area_rect();
    return makeQuestion('Geometry', topic, difficulty, 'text', q, ans, [ans, accepted].flat().filter(Boolean), [], 'Think about the formula.');
  };
}

function makeWordProblem(difficulty) {
  return () => {
    const problems = [
      () => {
        const a = randInt(20, 80);
        const b = randInt(15, 50);
        return [`A baker made ${a} cookies in the morning and ${b} cookies in the afternoon. How many cookies in total?`, a + b];
      },
      () => {
        const a = randInt(30, 100);
        const b = randInt(10, a - 10);
        return [`There are ${a} students. ${b} are boys. How many are girls?`, a - b];
      },
      () => {
        const groups = randInt(3, 8);
        const perGroup = randInt(3, 8);
        return [`There are ${groups} tables with ${perGroup} students at each. How many students in total?`, groups * perGroup];
      },
      () => {
        const total = randInt(20, 50);
        const groups = randInt(3, 8);
        const perGroup = Math.floor(total / groups);
        return [`${total} apples are shared equally among ${groups} friends. How many does each get?`, perGroup];
      },
      () => {
        const a = randInt(100, 500);
        const b = randInt(20, 100);
        const c = randInt(10, 50);
        return [`A store sold ${a} toys on Monday, ${b} on Tuesday, and ${c} on Wednesday. How many toys were sold in all 3 days?`, a + b + c];
      }
    ];
    const p = randChoice(problems)();
    return makeQuestion('Word Problems', difficulty >= 7 ? 'multi-step' : 'one-step', difficulty, 'numeric',
      p[0], p[1], [String(p[1])], [],
      'Read the problem carefully. What operation do you need?');
  };
}

function makeTimeTemplate(topic, difficulty) {
  return () => {
    const times = {
      read_clock: () => {
        const hour = randInt(1, 12);
        const minute = randChoice([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
        const mStr = minute === 0 ? '00' : String(minute);
        return [`What time is ${hour}:${mStr}? Write it in words.`, `${hour}:${mStr}`, `${hour}:${mStr}`];
      },
      elapsed: () => {
        const startH = randInt(8, 14);
        const startM = randChoice([0, 15, 30, 45]);
        const elapsedM = randChoice([15, 30, 45, 60, 90, 120]);
        const totalM = startH * 60 + startM + elapsedM;
        const endH = Math.floor(totalM / 60);
        const endMm = totalM % 60;
        const endStr = endMm === 0 ? `${endH}:00` : `${endH}:${String(endMm).padStart(2, '0')}`;
        return [`It is ${startH}:${String(startM).padStart(2, '0')}. What time will it be in ${elapsedM} minutes?`, endStr, endStr];
      }
    };
    const [q, ans, accepted] = times[topic] ? times[topic]() : times.read_clock();
    return makeQuestion('Time', topic, difficulty, 'text', q, ans, [ans, accepted].flat().filter(Boolean), [], 'Use the clock to help you.');
  };
}

function makeMoneyTemplate(topic, difficulty) {
  return () => {
    const moneys = {
      count: () => {
        const quarters = randInt(0, 2);
        const dimes = randInt(0, 3);
        const nickels = randInt(0, 3);
        const pennies = randInt(0, 4);
        const total = quarters * 25 + dimes * 10 + nickels * 5 + pennies;
        const desc = [];
        if (quarters) desc.push(`${quarters} quarter${quarters > 1 ? 's' : ''}`);
        if (dimes) desc.push(`${dimes} dime${dimes > 1 ? 's' : ''}`);
        if (nickels) desc.push(`${nickels} nickel${nickels > 1 ? 's' : ''}`);
        if (pennies) desc.push(`${pennies} penn${pennies > 1 ? 'ies' : 'y'}`);
        return [`How many cents do you have with ${desc.join(', ')}?`, total, `${total} cents`];
      },
      change: () => {
        const price = randChoice([25, 35, 45, 55, 65, 75, 85, 95]);
        const paid = 100;
        return [`An item costs ${price}¢. You pay $1.00. How much change?`, paid - price, `${paid - price} cents`];
      }
    };
    const [q, ans, accepted] = moneys[topic] ? moneys[topic]() : moneys.count();
    return makeQuestion('Money', topic, difficulty, 'text', q, ans, [ans, accepted].flat().filter(Boolean), [], 'Count the coins carefully.');
  };
}

function makeDataTemplate(difficulty) {
  return () => {
    const datasets = [
      { label: 'Apples', values: [5, 8, 3, 6, 4] },
      { label: 'Books Read', values: [3, 7, 2, 9, 5] },
      { label: 'Points Scored', values: [10, 15, 8, 12, 9] }
    ];
    const ds = randChoice(datasets);
    const sum = ds.values.reduce((a, b) => a + b, 0);
    const max = Math.max(...ds.values);
    const min = Math.min(...ds.values);
    const qTypes = [
      { q: `The ${ds.label} this week: Mon=${ds.values[0]}, Tue=${ds.values[1]}, Wed=${ds.values[2]}, Thu=${ds.values[3]}, Fri=${ds.values[4]}. How many total?`, a: sum },
      { q: `The ${ds.label} this week: Mon=${ds.values[0]}, Tue=${ds.values[1]}, Wed=${ds.values[2]}, Thu=${ds.values[3]}, Fri=${ds.values[4]}. Which day had the most?`, a: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][ds.values.indexOf(max)] },
      { q: `The ${ds.label} this week: Mon=${ds.values[0]}, Tue=${ds.values[1]}, Wed=${ds.values[2]}, Thu=${ds.values[3]}, Fri=${ds.values[4]}. How many more on the best day than the worst day?`, a: max - min }
    ];
    const chosen = randChoice(qTypes);
    return makeQuestion('Data and Graphs', 'data interpretation', difficulty,
      typeof chosen.a === 'number' ? 'numeric' : 'text',
      chosen.q, chosen.a, [String(chosen.a)], [],
      'Look at the numbers for each day carefully.');
  };
}

function makePatternTemplate(difficulty) {
  return () => {
    const pats = [
      () => {
        const start = randInt(2, 5);
        const step = randInt(2, 5);
        return [`What is the next number? ${start}, ${start + step}, ${start + 2 * step}, ${start + 3 * step}, ___`, start + 4 * step];
      },
      () => {
        const start = randInt(2, 5);
        const mult = randInt(2, 3);
        return [`What is the next number? ${start}, ${start * mult}, ${start * mult * mult}, ${start * mult * mult * mult}, ___`, start * mult * mult * mult * mult];
      },
      () => {
        const shape = randChoice(['🔺', '⭐', '💎', '🔵']);
        const shapes = [shape, shape, randChoice(['🔺', '⭐', '💎', '🔵']), shape, shape];
        return [`What comes next? ${shapes[0]} ${shapes[1]} ${shapes[2]} ${shapes[3]} ${shapes[4]} ___`, shapes[2]];
      }
    ];
    const p = randChoice(pats)();
    return makeQuestion('Patterns', 'number patterns', difficulty, 'text', p[0], p[1], [String(p[1])], [], 'Look at how the numbers change each time.');
  };
}

// --- Master Template Collection ---

function getTemplatesForGrade(gradeLevel) {
  const gradeTemplates = {
    'pre-k': PRE_K_TEMPLATES,
    'kindergarten': KINDERGARTEN_TEMPLATES,
    '1st': FIRST_GRADE_TEMPLATES,
    '2nd': {},
    '3rd': {},
    '4th': {},
    '5th': {}
  };

  // Build upper-grade templates dynamically
  if (['2nd', '3rd', '4th', '5th'].includes(gradeLevel)) {
    const ops = [];
    const geo = [];
    const frac = [];
    const dec = [];
    const word = [];
    const time = [];
    const money = [];
    const data = [];
    const patterns = [];
    const place = [];

    if (gradeLevel === '2nd') {
      ops.push(makeOpTemplate('2nd', 'Operations and Algebraic Thinking', 'addition', 4, 'add_2digit'));
      ops.push(makeOpTemplate('2nd', 'Operations and Algebraic Thinking', 'subtraction', 4, 'sub_2digit'));
      ops.push(makeOpTemplate('2nd', 'Operations and Algebraic Thinking', 'skip counting', 3, 'mult_facts'));
      ops.push(() => makeQuestion('Operations and Algebraic Thinking', 'even odd', 2, 'multiple_choice',
        `Is ${randInt(1, 20)} even or odd?`, '', [], [], 'Even numbers end in 0, 2, 4, 6, or 8.'));
      place.push(() => {
        const h = randInt(1, 9);
        const t = randInt(0, 9);
        const o = randInt(0, 9);
        const num = h * 100 + t * 10 + o;
        return makeQuestion('Number Sense and Place Value', 'place value', 3, 'numeric',
          `In ${num}, what digit is in the hundreds place?`, h, [String(h)], [], 'The hundreds place is the third digit from the right.');
      });
      frac.push(() => makeQuestion('Fractions', 'fraction basics', 2, 'multiple_choice',
        `What fraction of a pizza is one piece if you cut it into 4 equal pieces?`, '1/4', ['1/4', 'one fourth'], shuffleArray(['1/4', '1/2', '1/3', '1/5']),
        'One piece out of four equal pieces is 1/4.'));
      geo.push(makeGeoTemplate('area_rect', 3));
      geo.push(makeGeoTemplate('perimeter_rect', 3));
      geo.push(() => {
        const shape = randChoice(['triangle', 'quadrilateral', 'pentagon', 'hexagon', 'cube']);
        const sides = { triangle: 3, quadrilateral: 4, pentagon: 5, hexagon: 6, cube: 6 };
        return makeQuestion('Geometry', '2D shapes', 3, 'numeric',
          `How many faces does a ${shape} have?`, sides[shape], [String(sides[shape])], [], 'Count all the flat surfaces.');
      });
    }

    if (gradeLevel === '3rd') {
      ops.push(makeOpTemplate('3rd', 'Operations and Algebraic Thinking', 'multiplication', 4, 'mult_facts'));
      ops.push(makeOpTemplate('3rd', 'Operations and Algebraic Thinking', 'division', 4, 'div_basic'));
      ops.push(makeOpTemplate('3rd', 'Operations and Algebraic Thinking', 'addition', 5, 'add_2digit'));
      ops.push(makeOpTemplate('3rd', 'Operations and Algebraic Thinking', 'subtraction', 5, 'sub_2digit'));
      geo.push(makeGeoTemplate('area_rect', 4));
      geo.push(makeGeoTemplate('perimeter_rect', 4));
      frac.push(makeFracTemplate('add_like', 4));
      frac.push(() => makeQuestion('Fractions', 'fractions on number line', 3, 'text',
        `Where is 1/2 on a number line from 0 to 1?`, 'middle', ['middle', 'halfway', '0.5'], [], 'Halfway between 0 and 1.'));
      time.push(makeTimeTemplate('elapsed', 4));
      data.push(makeDataTemplate(4));
      word.push(makeWordProblem(5));
    }

    if (gradeLevel === '4th') {
      ops.push(makeOpTemplate('4th', 'Operations and Algebraic Thinking', 'multiplication', 5, 'mult_2digit'));
      ops.push(makeOpTemplate('4th', 'Operations and Algebraic Thinking', 'division', 5, 'div_remainder'));
      frac.push(makeFracTemplate('add_like', 5));
      frac.push(makeFracTemplate('sub_like', 5));
      frac.push(makeFracTemplate('compare', 5));
      dec.push(makeDecimalTemplate('add', 4));
      dec.push(makeDecimalTemplate('compare', 4));
      geo.push(makeGeoTemplate('area_rect', 5));
      geo.push(makeGeoTemplate('perimeter_rect', 5));
      geo.push(makeGeoTemplate('angles', 4));
      word.push(makeWordProblem(6));
      data.push(makeDataTemplate(5));
    }

    if (gradeLevel === '5th') {
      ops.push(makeOpTemplate('5th', 'Operations and Algebraic Thinking', 'multiplication', 7, 'mult_multi'));
      ops.push(makeOpTemplate('5th', 'Operations and Algebraic Thinking', 'division', 7, 'div_multi'));
      ops.push(() => makeQuestion('Operations and Algebraic Thinking', 'order of operations', 6, 'numeric',
        `What is ${randInt(2, 5)} + ${randInt(3, 6)} × ${randInt(2, 4)}? (Remember PEMDAS)`, 0, [], [], 'Multiply first, then add.'));
      frac.push(makeFracTemplate('mult_whole', 6));
      frac.push(() => {
        const d1 = randChoice([2, 3, 4, 6, 8]);
        const d2 = randChoice([3, 4, 5, 6, 8, 10]);
        const n1 = randInt(1, d1 - 1);
        const n2 = randInt(1, d2 - 1);
        const lcm = d1 * d2;
        const sum = n1 * d2 + n2 * d1;
        return makeQuestion('Fractions', 'adding fractions unlike denominators', 7, 'text',
          `${n1}/${d1} + ${n2}/${d2} = ?`, `${sum}/${lcm}`, [`${sum}/${lcm}`], [], 'Find a common denominator first.');
      });
      dec.push(makeDecimalTemplate('add', 5));
      dec.push(makeDecimalTemplate('mult', 6));
      dec.push(makeDecimalTemplate('sub', 5));
      geo.push(makeGeoTemplate('volume', 5));
      geo.push(makeGeoTemplate('area_rect', 6));
      geo.push(makeGeoTemplate('angles', 5));
      word.push(makeWordProblem(7));
      data.push(makeDataTemplate(6));
      patterns.push(makePatternTemplate(6));
    }

    // Add money and time for grades 2-4
    if (['2nd', '3rd'].includes(gradeLevel)) {
      time.push(makeTimeTemplate('read_clock', gradeLevel === '2nd' ? 3 : 4));
      money.push(makeMoneyTemplate('count', gradeLevel === '2nd' ? 3 : 4));
      if (gradeLevel === '3rd') {
        time.push(makeTimeTemplate('elapsed', 4));
        money.push(makeMoneyTemplate('change', 4));
      }
    }

    gradeTemplates[gradeLevel] = {
      operations: ops,
      geometry: geo,
      fractions: frac,
      decimals: dec,
      wordProblems: word,
      time: time,
      money: money,
      data: data,
      patterns: patterns,
      placeValue: place
    };
  }

  return gradeTemplates[gradeLevel];
}

// --- Main Local Question Generator ---

function generateLocalQuestion(gradeLevel, targetDomain, targetSkill, targetDifficulty) {
  const templates = getTemplatesForGrade(gradeLevel);
  if (!templates) {
    return fallbackSimpleQuestion(gradeLevel);
  }

  // Map domain to template key
  const domainKeyMap = {
    'Counting and Cardinality': 'counting',
    'Operations and Algebraic Thinking': 'operations',
    'Number Sense and Place Value': 'placeValue',
    'Measurement': 'measurement',
    'Time': 'time',
    'Money': 'money',
    'Geometry': 'geometry',
    'Data and Graphs': 'data',
    'Fractions': 'fractions',
    'Decimals': 'decimals',
    'Patterns': 'patterns',
    'Word Problems': 'wordProblems'
  };

  const key = domainKeyMap[targetDomain];
  const domainTemplates = templates[key];

  if (domainTemplates && Array.isArray(domainTemplates) && domainTemplates.length > 0) {
    const template = randChoice(domainTemplates);
    try {
      const q = template();
      if (q && q.question) {
        q.difficulty = targetDifficulty;
        return q;
      }
    } catch (e) {
      console.warn('Template error:', e);
    }
  }

  // If specific domain not found, try any available template
  const allKeys = Object.keys(templates);
  for (const k of allKeys) {
    if (templates[k] && Array.isArray(templates[k]) && templates[k].length > 0) {
      const template = randChoice(templates[k]);
      try {
        const q = template();
        if (q && q.question) {
          q.difficulty = targetDifficulty;
          return q;
        }
      } catch (e) {
        continue;
      }
    }
  }

  return fallbackSimpleQuestion(gradeLevel);
}

function fallbackSimpleQuestion(gradeLevel) {
  const a = randInt(1, 10);
  const b = randInt(1, 10);
  return makeQuestion('Operations and Algebraic Thinking', 'addition', 1, 'numeric',
    `What is ${a} + ${b}?`, a + b, [String(a + b)], [], 'Add the two numbers together.');
}

// --- Adaptive Question Selection ---

function selectNextQuestionPlan(gradeLevel, recentAttempts, skillProgress) {
  const domains = DOMAIN_GRADE_MAP[gradeLevel] || DOMAIN_GRADE_MAP['2nd'];
  const defaultPlan = {
    domain: domains[0],
    skill: 'addition',
    difficulty: 1,
    useAI: false
  };

  if (!skillProgress || skillProgress.length === 0) {
    defaultPlan.domain = domains[0];
    defaultPlan.skill = getDefaultSkillForDomain(domains[0], gradeLevel);
    defaultPlan.difficulty = 1;
    return defaultPlan;
  }

  // Find weakest domain
  let weakestDomain = null;
  let lowestMastery = 101;
  const domainStats = {};

  for (const d of domains) {
    const domainProgress = skillProgress.filter(sp => sp.domain === d);
    if (domainProgress.length === 0) {
      // Never practiced this domain - prioritize it
      weakestDomain = d;
      lowestMastery = -1;
      break;
    }
    const avgMastery = domainProgress.reduce((sum, sp) => sum + (sp.mastery || 0), 0) / domainProgress.length;
    domainStats[d] = { avgMastery, count: domainProgress.length };
    if (avgMastery < lowestMastery) {
      lowestMastery = avgMastery;
      weakestDomain = d;
    }
  }

  if (!weakestDomain) weakestDomain = domains[0];

  // Find least practiced domain (by last practiced date)
  let leastPracticedDomain = weakestDomain;
  let oldestDate = new Date().toISOString();
  for (const d of domains) {
    const domainProgress = skillProgress.filter(sp => sp.domain === d);
    if (domainProgress.length > 0) {
      const mostRecent = domainProgress.reduce((latest, sp) => {
        return sp.lastPracticed && sp.lastPracticed > latest ? sp.lastPracticed : latest;
      }, '2000-01-01');
      if (mostRecent < oldestDate) {
        oldestDate = mostRecent;
        leastPracticedDomain = d;
      }
    }
  }

  // Check recent attempts (last 3)
  const recentSame = recentAttempts || [];
  const lastFew = recentSame.slice(0, 3);
  const allCorrect = lastFew.length >= 3 && lastFew.every(a => a.isCorrect);
  const allWrong = lastFew.length >= 2 && lastFew.every(a => !a.isCorrect);

  // Determine target
  let targetDomain = weakestDomain;
  let targetDifficulty = 1;

  // Get current skill progress for target domain
  const domainProgress = skillProgress.filter(sp => sp.domain === targetDomain);
  if (domainProgress.length > 0) {
    const avgDiff = Math.round(domainProgress.reduce((sum, sp) => sum + (sp.currentDifficulty || 1), 0) / domainProgress.length);
    targetDifficulty = Math.max(1, avgDiff);
  }

  // Adjust based on recent performance
  if (allWrong && lastFew.length >= 2) {
    // Keep same skill but reduce difficulty
    const lastAttempt = lastFew[0];
    targetDomain = lastAttempt.domain || targetDomain;
    targetDifficulty = Math.max(1, (lastAttempt.difficulty || targetDifficulty) - 1);
  } else if (allCorrect && lastFew.length >= 3) {
    // Increase difficulty
    targetDifficulty = Math.min(10, targetDifficulty + 1);
    // Possibly switch domain
    if (Math.random() < 0.3) {
      targetDomain = randChoice(domains.filter(d => d !== targetDomain));
    }
  }

  // If a domain hasn't been practiced recently, sometimes switch
  if (leastPracticedDomain !== targetDomain && Math.random() < 0.25) {
    targetDomain = leastPracticedDomain;
    const lpProgress = skillProgress.filter(sp => sp.domain === targetDomain);
    if (lpProgress.length > 0) {
      targetDifficulty = Math.max(1, Math.round(lpProgress.reduce((sum, sp) => sum + (sp.currentDifficulty || 1), 0) / lpProgress.length));
    } else {
      targetDifficulty = 1;
    }
  }

  // Check broad accuracy
  const totalCorrect = skillProgress.reduce((sum, sp) => sum + (sp.correct || 0), 0);
  const totalAttempted = skillProgress.reduce((sum, sp) => sum + (sp.attempted || 0), 0);
  const broadAccuracy = totalAttempted > 0 ? totalCorrect / totalAttempted : 0.5;

  if (broadAccuracy < 0.6) {
    // Focus on foundational skills
    targetDifficulty = Math.max(1, targetDifficulty - 1);
    targetDomain = domains[0]; // Counting or operations first
  } else if (broadAccuracy > 0.85) {
    // Include more word problems
    if (domains.includes('Word Problems') && Math.random() < 0.4) {
      targetDomain = 'Word Problems';
    }
  }

  // Pick a skill for the target domain
  const skills = SKILLS_BY_DOMAIN[targetDomain] || ['basic'];
  const targetSkill = randChoice(skills);

  return {
    domain: targetDomain,
    skill: targetSkill,
    difficulty: targetDifficulty,
    useAI: false
  };
}

function getDefaultSkillForDomain(domain, gradeLevel) {
  const skills = SKILLS_BY_DOMAIN[domain];
  if (skills && skills.length > 0) return skills[0];
  return 'basic';
}

// --- Mastery Label ---

function getMasteryLabel(mastery) {
  if (mastery < 30) return 'Needs Support';
  if (mastery < 60) return 'Practicing';
  if (mastery < 80) return 'Improving';
  return 'Strong';
}

// --- Answer Normalization ---

function normalizeAnswer(answer) {
  if (answer === null || answer === undefined) return '';
  let s = String(answer).trim().toLowerCase();

  // Remove extra punctuation
  s = s.replace(/[!?.,;:'"]+$/g, '').trim();

  // Handle money: $0.25, 0.25, 25 cents, 25¢
  s = s.replace(/^\$/, '').replace(/¢$/, '').replace(/\s*cents?\s*$/, '').trim();

  // Handle common fraction words
  const fractionWords = {
    'one half': '1/2',
    'half': '1/2',
    'one third': '1/3',
    'one fourth': '1/4',
    'one quarter': '1/4',
    'three fourths': '3/4',
    'two thirds': '2/3',
    'one fifth': '1/5',
    'one eighth': '1/8',
    'one tenth': '1/10'
  };

  if (fractionWords[s]) {
    s = fractionWords[s];
  }

  // Handle o'clock
  s = s.replace(/o'clock/, '').trim();

  // Handle number words
  const numberWords = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
    'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
    'eighteen': '18', 'nineteen': '19', 'twenty': '20'
  };

  if (numberWords[s]) {
    s = numberWords[s];
  }

  return s;
}

function isAnswerCorrect(childAnswer, correctAnswer, acceptedAnswers) {
  const normalized = normalizeAnswer(childAnswer);
  const correct = normalizeAnswer(correctAnswer);

  // Direct match
  if (normalized === correct) return true;

  // Check accepted answers
  if (acceptedAnswers && Array.isArray(acceptedAnswers)) {
    for (const acc of acceptedAnswers) {
      if (normalized === normalizeAnswer(acc)) return true;
    }
  }

  // Try numeric comparison
  const childNum = parseFloat(normalized);
  const correctNum = parseFloat(correct);
  if (!isNaN(childNum) && !isNaN(correctNum)) {
    // Allow small epsilon for decimal comparison
    if (Math.abs(childNum - correctNum) < 1e-10) return true;
  }

  return false;
}
