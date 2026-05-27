// ============================================================
// SEM 5 (Year 3 Sem 1) — Aug 2026 onward · ACTIVE
// URLs added as courses come online.
// ============================================================
const linksData = {
  general: {
    ERP: "https://iitdadierp.iitd.ac.in/student/login",
    Teams: "https://teams.microsoft.com/",
    Outlook: "https://outlook.office.com/",
    Blackboard: "https://iida.blackboard.com/ultra/course",
    Website: "https://abudhabi.iitd.ac.in/",
    "Acd Cal": "",   // TODO: AY2026-2027 Sem 1 calendar PDF
    TimeTable: "",   // TODO: Sem 5 timetable PDF
  },

  // Dummy links per course — placeholder URLs ("#"). Replace as real URLs land.
  // Varied counts on purpose so the row layout looks like a real sem.
  courses: {
    "ACOL333 (AI)": {
      Lectures: "#",
      Tutorials: "#",
      Labs: "#",
      Assignments: "#",
      Quiz: "#",
      Piazza: "#",
      Gradescope: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
    "ACOL334 (Comp Networks)": {
      Lectures: "#",
      Labs: "#",
      Assignments: "#",
      Piazza: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
    "ACOL351 (Algos)": {
      Lectures: "#",
      Tutorials: "#",
      Assignments: "#",
      Quiz: "#",
      Piazza: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
    "AGRL130 (Entrepren)": {
      Slides: "#",
      Readings: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
    "AHUL256 (Crit Think)": {
      Readings: "#",
      Notes: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
    "AHUL261 (Psych)": {
      Lectures: "#",
      Readings: "#",
      Assignments: "#",
      "Course Page": "#",
      Blackboard: "https://iida.blackboard.com/ultra/course",
    },
  },
};

// ============================================================
// SEM 4 (Year 2 Sem 2) — Jan-May 2026 · PRESERVED
// ============================================================
const linksDataSem4 = {
  general: {
    ERP: "https://iitdadierp.iitd.ac.in/student/login",
    Teams: "https://teams.microsoft.com/",
    Outlook: "https://outlook.office.com/",
    Blackboard: "https://iida.blackboard.com/ultra/course",
    Website: "https://abudhabi.iitd.ac.in/",
    "Acd Cal":
      "https://iitdabudhabi.ac.ae/uploaded_files/AcademicCalendar-AY2025-2026Sem2.pdf",
    TimeTable:
      "https://iitdabudhabi.ac.ae/uploaded_files/semseter-schedule/B.Tech%20CSE%20-%20Semester%204%20-%20V4-2025-20.pdf",
  },

  courses: {
    "ACOL216 (Comp Arch)": {
      Lectures: "https://lcs2-iitd.github.io/ACOL216-2502/lectures/",
      Tutorials: "https://lcs2-iitd.github.io/ACOL216-2502/tutorials/",
      "Daily Quiz": "https://lcs2-iitd.github.io/ACOL216-2502/quiz/",
      Assignments: "https://lcs2-iitd.github.io/ACOL216-2502/assignments/",
      Materials: "https://lcs2-iitd.github.io/ACOL216-2502/materials/",
      "Course Page": "http://lcs2.in/acol216",
      Blackboard: "https://iida.blackboard.com/ultra/courses/_102_1/outline",
    },

    "ACOL226 (Prog Lang)": {
      "Part 1 lectures":
        "https://piazza.com/iitdabudhabi.ac.ae/spring2026/acol226/resources",
      "Part 2 lectures":
        "https://github.com/kumarmadhukar/kumarmadhukar.github.io/tree/master/courses/pl-holi26",
      Blackboard: "https://iida.blackboard.com/ultra/courses/_103_1/outline",
      Piazza: "https://piazza.com/class/mkl7p555i3l4c6#",
    },
    "AAIL100 (Data Sci)": {
      Lectures:
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/slides.html",
      Labs: "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/lab.html",
      "Quiz/Homework":
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/quiz.html",

      "Course Page":
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/",
      Gradescope: "https://www.gradescope.com/courses/1227694",
      Piazza: "https://piazza.com/class/mkeyrkxjpbxnh",
      Blackboard: "https://iida.blackboard.com/ultra/courses/_105_1/outline",
    },
    "ACOP290 (Design Prac)": {
      Blackboard: "https://iida.blackboard.com/ultra/courses/_104_1/outline",
    },
    "AHUL213 (Macro Econ)": {
      Notes:
        "https://drive.google.com/drive/folders/1VYl6McAKfkJDZSQdlb_vN-aDjYnfkAPy",
      "Topics for Minor": "./extras/topics-ahul.html",
      Blackboard: "https://iida.blackboard.com/ultra/courses/_110_1/outline",
      "Course Page":
        "https://jayanjthomas.wordpress.com/teaching/macroeconomics-for-undergraduates/",
    },
    // "AHUL231 (Intro Lit)": {
    //   "Course Page": "",
    //   "Piazza": ""
    // },
  },
};

// Per-course metadata. Each course gets editorial treatment:
// title (short display), subtitle (descriptive tagline), dept, credits, LTP.
const COURSE_META = {
  ACOL333: {
    title: "Artificial Intelligence",
    subtitle: "A Study Of Inference, Search & Learning",
    dept: "COMP. SCI.",
    credits: 4, ltp: "3-0-2",
  },
  ACOL334: {
    title: "Computer Networks",
    subtitle: "Protocols, Routing & The Modern Internet",
    dept: "COMP. SCI.",
    credits: 4, ltp: "3-0-2",
  },
  ACOL351: {
    title: "Algorithms",
    subtitle: "Design, Analysis & The Cost Of Computation",
    dept: "COMP. SCI.",
    credits: 4, ltp: "3-1-0",
  },
  AGRL130: {
    title: "Innovation, Entrepreneurship & Sustainability",
    subtitle: "Innovation, Ventures & Sustainable Practice",
    dept: "GEN. ELEC.",
    credits: 3, ltp: "3-0-0",
  },
  AHUL256: {
    title: "Critical Thinking",
    subtitle: "Arguments, Reasoning & Sound Inference",
    dept: "HUMANITIES",
    credits: 4, ltp: "3-1-0",
  },
  AHUL261: {
    title: "Psychology",
    subtitle: "Cognition, Behavior & The Mind",
    dept: "HUMANITIES",
    credits: 4, ltp: "3-1-0",
  },
};

function renderLinks1(thing, data) {
  const container = document.querySelector(thing);
  if (!container) return;

  for (const [course, resources] of Object.entries(data)) {
    const match = course.match(/^(\S+)(?:\s*\((.+)\))?$/);
    const code = match ? match[1] : course;
    const prefix = code.slice(0, 4).toUpperCase();
    const meta = COURSE_META[code] || {};
    const title = meta.title || (match && match[2]) || course;
    const subtitle = meta.subtitle || "";
    const dept = meta.dept || "";

    const box = document.createElement("article");
    box.className = "box";
    box.dataset.prefix = prefix;

    const h1 = document.createElement("h1");
    h1.className = "course-h1-sr";
    h1.textContent = `${code} — ${title}`;
    box.appendChild(h1);

    // Editorial course header — code chip, dept label, drop-cap title, subtitle
    const firstLetter = title.charAt(0);
    const restOfTitle = title.slice(1);
    const header = document.createElement("div");
    header.className = "course-header";
    header.innerHTML = `
      <div class="course-top">
        <span class="course-chip">${code}</span>
        <span class="course-meta-inline">
          ${meta.ltp ? `<span class="course-ltp">${meta.ltp}</span>` : ""}
          ${meta.credits ? `<span class="course-credits">${meta.credits}</span>` : ""}
        </span>
      </div>
      <h2 class="course-name"><span class="course-firstletter">${firstLetter}</span>${restOfTitle}</h2>
    `;
    box.appendChild(header);

    const linksGrid = document.createElement("div");
    linksGrid.className = "course-links";
    for (const [n, url] of Object.entries(resources)) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.innerHTML = `<span class="link-bullet"></span><span class="link-label">${n}</span><svg class="link-arrow" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      linksGrid.appendChild(link);
    }
    box.appendChild(linksGrid);

    container.appendChild(box);
  }
}

// ====== Render Updates ======

// ====== Updates Data ======
const updatesData = [];

// ====== Helper to Add Update ======
function addUpdate(category, text, expiry) {
  updatesData.push([category, text, expiry]);
}

// Rich update rendering: each item gets a date box (day-of-week · DD MMM)
// + course code + event text. Falls back to the old two-column format
// when the text doesn't follow "CODE: event, DD/MM/YYYY".
function renderUpdates() {
  const now = new Date();
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const grouped = {};
  updatesData.forEach(([category, text, expiry]) => {
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([text, expiry]);
  });

  for (const [category, items] of Object.entries(grouped)) {
    items.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const container = document.getElementById(category + "-box");
    if (!container) continue;

    items.forEach(([text, expiry]) => {
      const parts = String(expiry).split("-").map(Number);
      if (parts.length !== 3) return;
      const [y, m, d] = parts;
      const expiryExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      if (now >= expiryExclusive) return;

      const dateObj = new Date(y, m - 1, d);
      const dow = DOW[dateObj.getDay()];
      const mon = MON[dateObj.getMonth()];

      // Parse "CODE: event, DD/MM/YYYY" → { code, event }
      const lastComma = text.lastIndexOf(",");
      const head = lastComma >= 0 ? text.slice(0, lastComma) : text;
      const colon = head.indexOf(":");
      const code = colon >= 0 ? head.slice(0, colon).trim() : "";
      const event = colon >= 0 ? head.slice(colon + 1).trim() : head.trim();

      const row = document.createElement("a");
      row.className = "upd-row";
      row.href = "#";

      const dateBox = document.createElement("div");
      dateBox.className = "upd-date";
      dateBox.innerHTML = `
        <span class="upd-dow">${dow}</span>
        <span class="upd-day">${String(d).padStart(2, "0")}</span>
        <span class="upd-mon">${mon}</span>
      `;
      row.appendChild(dateBox);

      const body = document.createElement("div");
      body.className = "upd-body";
      if (code) {
        const codeEl = document.createElement("span");
        codeEl.className = "upd-code";
        codeEl.textContent = code;
        body.appendChild(codeEl);
      }
      const eventEl = document.createElement("span");
      eventEl.className = "upd-event";
      eventEl.textContent = event;
      body.appendChild(eventEl);
      row.appendChild(body);

      container.appendChild(row);
    });
  }
}

const toggleBtn = document.getElementById("theme-toggle");

// Initialize theme from system preference
const currentTheme = localStorage.getItem("theme");
if (currentTheme) {
  document.documentElement.setAttribute("data-theme", currentTheme);
}

toggleBtn.addEventListener("click", () => {
  const theme = document.documentElement.getAttribute("data-theme");
  const newTheme = theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});

// Set initial icon

addUpdate("quizzes", "There are exams next week!", "2025-10-16");
addUpdate(
  "assignments",
  "ACOL106: Programming assignment 4, 12/10/2025",
  "2025-10-12",
);
addUpdate(
  "assignments",
  "ACOL106: Programming assignment 5, 2/11/2025",
  "2025-11-2",
);
addUpdate(
  "assignments",
  "AGRL112: Assignment 6 (RMQ), 11/10/2025",
  "2025-10-11",
);
addUpdate(
  "assignments",
  "AGRL112: Assignment 7 (Systems), 25/10/2025",
  "2025-10-25",
);
addUpdate(
  "assignments",
  "ACOL106: Comprehension Quiz 07, 14/10/2025",
  "2025-10-14",
);
addUpdate(
  "assignments",
  "ACOL215: 8bit display submission before diwali, 17/10/2025",
  "2025-10-21",
);
addUpdate("assignments", "ACOL215: Assignment 1, 27/10/2025", "2025-10-27");

addUpdate("assignments", "ACOL215: Lab Assignment, 20/11/2025", "2025-11-20");

addUpdate("quizzes", "ACOL215: Theory Quiz, 24/11/2025", "2025-11-24");

addUpdate("quizzes", "ACOL215: Theory Quiz, 8/12/2025", "2025-12-8");

addUpdate("quizzes", "ACOL106: Theory Quiz Regular, 20/11/2025", "2025-11-20");

addUpdate("quizzes", "AMTL106: Theory Quiz Topic 14, 19/11/2025", "2025-11-19");

addUpdate("quizzes", "AENL100: Quiz, 21/11/2025", "2025-11-21");

addUpdate("assignments", "AENL100: Group AI Project, 12/12/2025", "2025-12-12");
addUpdate(
  "assignments",
  "AMTL106: Group Project (est. date), 27/11/2025",
  "2025-11-30",
);

addUpdate("assignments", "AGRL112: Robotics, 23/11/2025", "2025-11-23");
addUpdate("assignments", "AGRL112: Error codes, 30/11/2025", "2025-11-30");
addUpdate(
  "assignments",
  "ACOL106: Programming Assignment 6, 23/11/2025",
  "2025-11-23",
);
addUpdate(
  "assignments",
  "ACOL106: Comprehension Quiz, 19/11/2025",
  "2025-11-19",
);

addUpdate("quizzes", "ACOL226: Quiz 1, 11/02/2026", "2026-2-11");
addUpdate("quizzes", "ACOL216: Quiz 1, 13/02/2026", "2026-2-13");

addUpdate("quizzes", "ACOL226: Quiz 2, 11/03/2026", "2026-3-11");
// addUpdate("quizzes", "ACOL226: Quiz 3, 06/05/2026", "2026-5-6");

addUpdate("assignments", "AHUL213: Term Paper, 15/05/2026", "2026-5-15");
addUpdate("assignments", "ACOP290: Part 1 viva, 16/05/2026", "2026-5-16");
addUpdate("assignments", "ACOP290: Part 2 dev complete, 25/05/2026", "2026-5-25");
addUpdate("assignments", "ACOP290: Part 2 demo, 26/05/2026", "2026-5-26");

addUpdate("quizzes", "AAIL100: Quiz (MLR Theory + Lab-9), 12/05/2026", "2026-5-12");
addUpdate("quizzes", "ACOL216: Quiz 3 (Pipelining), 15/05/2026", "2026-5-15");

// ============================================================
// SEM 5 (Year 3 Sem 1) — real entries go here as they drop
// ============================================================

window.addEventListener("DOMContentLoaded", () => {
  renderLinks1("#course-grid", linksData.courses);
  renderUpdates();
});

// ============================================================
// SEM 3 (Year 2 Sem 1) — Aug-Nov 2025 · PRESERVED
// ============================================================
const linksDataSem3 = {
  general: {
    ERP: "https://iitdadierp.iitd.ac.in/student/login",
    Teams: "https://teams.microsoft.com/",
    Outlook: "https://outlook.office.com/",
    Blackboard: "https://iida.blackboard.com/ultra/course",
    TimeTable:
      "https://abudhabi.iitd.ac.in/uploaded_files/B.Tech.%202nd%20year%20CSE%20Sem%201_2025-26.pdf",
    Website: "https://abudhabi.iitd.ac.in/",
  },

  courses: {
    "ACOL215 (DIGI)": {
      "Course Page":
        "https://kumarmadhukar.github.io/courses/digilog-ad-diwali25/index.html",
    },

    "ACOL106 (DSA)": {
      Lectures:
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/slides.html",
      Homework:
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/homework.html",
      Quiz: " https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/quiz.html",
      Gradescope: "https://www.gradescope.com/courses/1086727",
      Piazza: "https://piazza.com/class/megt7ecep5i4wy",
      "Course Page":
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/",
    },

    "AGRL112 (Intro CS)": {
      Lectures:
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/slides.html",
      Homework:
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/homework.html",
      Gradescope: "https://www.gradescope.com/courses/1098487",
      Piazza: "https://piazza.com/class/megt7ecep5i4wy",
      "Course Page":
        "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/",
    },

    "AMTL106 (Stoc & Prob)": {
      Lectures:
        "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Lecture%20Notes?csf=1&web=1&e=Ks8lhi",
      "Problem Sets":
        "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Problem%20Sets?csf=1&web=1&e=lKawnC",
      "Problem Solutions":
        "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Solution%20to%20Problem%20Sets?csf=1&web=1&e=TIGDUz",
      "Quiz Solutions":
        "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Exams/Quiz?csf=1&web=1&e=MximhB",

      "Course Files":
        "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EmCRWabo5RFMsKyJWGalJNEBEQ8tN5PLBAnV1RqlxuVCbA?e=OkG0g9",
      Blackboard: "https://iida.blackboard.com/ultra/courses/_44_1/outline",
    },

    "AENL100 (AI)": {
      Blackboard: "https://iida.blackboard.com/ultra/courses/_6_1/outline",
    },
  },
};
