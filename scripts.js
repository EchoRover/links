
const linksData = {
  general: {
    "ERP": "https://iitdadierp.iitd.ac.in/student/login",
    "Teams": "https://teams.microsoft.com/",
    "Outlook": "https://outlook.office.com/",
    "Blackboard": "https://iida.blackboard.com/ultra/course",
    "Website":"https://abudhabi.iitd.ac.in/",
    "Acd Cal": "https://iitdabudhabi.ac.ae/uploaded_files/AcademicCalendar-AY2025-2026Sem2.pdf",
    "TimeTable": "https://iitdabudhabi.ac.ae/uploaded_files/semseter-schedule/B.Tech%20CSE%20-%20Semester%204%20-%20V3.pdf",

  },
    
  courses: {
    "ACOL216 (Comp Arch)": {
      "Lectures":"https://lcs2-iitd.github.io/ACOL216-2502/lectures/",
      "Assignments":"https://lcs2-iitd.github.io/ACOL216-2502/assignments/",
      "Materials":"https://lcs2-iitd.github.io/ACOL216-2502/materials/",
      "Course Page":"http://lcs2.in/acol216",
      "Blackboard":"https://iida.blackboard.com/ultra/courses/_102_1/outline",
  
    },

     "ACOL226 (Prog Lang)": {

      "Blackboard":"https://iida.blackboard.com/ultra/courses/_103_1/outline",
      "Piazza":"https://piazza.com/class/mkl7p555i3l4c6#"
    },
     "AAIL100 (Data Sci)": {
      "Lectures":"https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/slides.html",
      "Labs":"https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/lab.html",
      "Quiz/Homework":"https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/quiz.html",

      "Course Page": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2026/AAIL100/",
      "Gradescope":"https://www.gradescope.com/courses/1227694",
      "Piazza":"https://piazza.com/class/mkeyrkxjpbxnh",
      "Blackboard":"https://iida.blackboard.com/ultra/courses/_105_1/outline",
    },
     "ACOP290 (Design Prac)": {
      "Blackboard":"https://iida.blackboard.com/ultra/courses/_104_1/outline",
    },
     "AHUL213 (Macro Econ)": {
      "Course Page": "https://jayanjthomas.wordpress.com/teaching/macroeconomics-for-undergraduates/",

    },
     "AHUL231 (Intro Lit)": {
      "Course Page": "",
      "Piazza":""
    },
    


 
  }
};


function renderLinks1(thing, data) {
  const container = document.querySelector(thing);

  for (const [course, resources] of Object.entries(data)) {
    const box = document.createElement("div");
    box.className = "box";

    const title = document.createElement("h1");
    title.textContent = course;
    box.appendChild(title);

    for (const [name, url] of Object.entries(resources)) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.textContent = name;
      box.appendChild(link);
    }

    container.appendChild(box);
  }
}
// For general links in .box2
function renderGeneralLinks(selector, data) {
  const container = document.querySelector(selector);
  if (!container) return;

  for (const [name, url] of Object.entries(data)) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.textContent = name;
    container.appendChild(link);
  }
}

// ====== Render Updates ======



// ====== Updates Data ======
const updatesData = [];

// ====== Helper to Add Update ======
function addUpdate(category, text, expiry) {
  updatesData.push([category, text, expiry]);
}

function renderUpdates() {
  const now = new Date();

  // group updates by category
  const grouped = {};
  updatesData.forEach(([category, text, expiry]) => {
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([text, expiry]);
  });

  // sort inside each category
  for (const [category, items] of Object.entries(grouped)) {
    items.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const container = document.getElementById(category + "-box");
    if (!container) continue;

    items.forEach(([text, expiry]) => {
      const parts = String(expiry).split('-').map(Number);
      if (parts.length !== 3) return;
      const [y, m, d] = parts;
      const expiryExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      if (now < expiryExclusive) {
        const p = document.createElement("p");
        p.textContent = text;
        container.appendChild(p);
      }
    });
  }
}
function renderUpdates() {
  const now = new Date();

  // group updates by category
  const grouped = {};
  updatesData.forEach(([category, text, expiry]) => {
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push([text, expiry]);
  });

  // sort and render
  for (const [category, items] of Object.entries(grouped)) {
    items.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    const container = document.getElementById(category + "-box");
    if (!container) continue;

 items.forEach(([text, expiry]) => {
  const parts = String(expiry).split('-').map(Number);
  if (parts.length !== 3) return;
  const [y, m, d] = parts;
  const expiryExclusive = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  if (now < expiryExclusive) {
    const p = document.createElement("p");

    // Try to split title and date using the last comma
    const splitIndex = text.lastIndexOf(',');
    if (splitIndex >= 0) {
      const title = text.slice(0, splitIndex);
      const date = text.slice(splitIndex + 1).trim();
      p.classList.add("two-column");
      p.innerHTML = `
        <span class="title">${title}</span>
        <span class="date">${date}</span>
      `;
    } else {
      // No comma → center-align full text
      p.classList.add("center-text");
      p.textContent = text;
    }

    container.appendChild(p);
  }
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

addUpdate("quizzes","There are exams next week!","2025-10-16");
addUpdate("assignments","ACOL106: Programming assignment 4, 12/10/2025","2025-10-12");
addUpdate("assignments","ACOL106: Programming assignment 5, 2/11/2025","2025-11-2");
addUpdate("assignments","AGRL112: Assignment 6 (RMQ), 11/10/2025","2025-10-11");
addUpdate("assignments","AGRL112: Assignment 7 (Systems), 25/10/2025","2025-10-25");
addUpdate("assignments","ACOL106: Comprehension Quiz 07, 14/10/2025","2025-10-14");
addUpdate("assignments","ACOL215: 8bit display submission before diwali, 17/10/2025","2025-10-21");
addUpdate("assignments","ACOL215: Assignment 1, 27/10/2025","2025-10-27");

addUpdate("assignments","ACOL215: Lab Assignment, 20/11/2025","2025-11-20");

addUpdate("quizzes","ACOL215: Theory Quiz, 24/11/2025","2025-11-24");

addUpdate("quizzes","ACOL215: Theory Quiz, 8/12/2025","2025-12-8");

addUpdate("quizzes","ACOL106: Theory Quiz Regular, 20/11/2025","2025-11-20");

addUpdate("quizzes","AMTL106: Theory Quiz Topic 14, 19/11/2025","2025-11-19");

addUpdate("quizzes","AENL100: Quiz, 21/11/2025","2025-11-21");


addUpdate("assignments","AENL100: Group AI Project, 12/12/2025","2025-12-12");
addUpdate("assignments","AMTL106: Group Project (est. date), 27/11/2025","2025-11-30");

addUpdate("assignments","AGRL112: Robotics, 23/11/2025","2025-11-23");
addUpdate("assignments","AGRL112: Error codes, 30/11/2025","2025-11-30");
addUpdate("assignments","ACOL106: Programming Assignment 6, 23/11/2025","2025-11-23");
addUpdate("assignments","ACOL106: Comprehension Quiz, 19/11/2025","2025-11-19");

addUpdate("quizzes","ACOL226: Quiz 1, 11/02/2026","2026-2-11");
addUpdate("quizzes","ACOL226: Quiz 2, 11/03/2026","2026-3-11");
addUpdate("quizzes","ACOL226: Quiz 3, 06/05/2026","2026-5-6");



















window.addEventListener("DOMContentLoaded", () => {
  renderGeneralLinks(".general", linksData.general);   // general links
  renderLinks1(".links", linksData.courses);  // course links
  renderUpdates();

});




const linksDataOLD = {
  general: {
    "ERP": "https://iitdadierp.iitd.ac.in/student/login",
    "Teams": "https://teams.microsoft.com/",
    "Outlook": "https://outlook.office.com/",
    "Blackboard": "https://iida.blackboard.com/ultra/course",
    "TimeTable": "https://abudhabi.iitd.ac.in/uploaded_files/B.Tech.%202nd%20year%20CSE%20Sem%201_2025-26.pdf",
    "Website":"https://abudhabi.iitd.ac.in/"
  },

  courses: {
    "ACOL215 (DIGI)": {
      "Course Page": "https://kumarmadhukar.github.io/courses/digilog-ad-diwali25/index.html"
    },

    "ACOL106 (DSA)": {
      "Lectures": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/slides.html",
      "Homework": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/homework.html",
      "Quiz": " https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/quiz.html",
      "Gradescope": "https://www.gradescope.com/courses/1086727",
      "Piazza": "https://piazza.com/class/megt7ecep5i4wy",
      "Course Page": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/ACOL106/",

    },

    "AGRL112 (Intro CS)": {
      "Lectures": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/slides.html",
      "Homework": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/homework.html",
      "Gradescope": "https://www.gradescope.com/courses/1098487",
      "Piazza": "https://piazza.com/class/megt7ecep5i4wy",
      "Course Page": "https://www.cse.iitd.ac.in/%7Erjaiswal/Teaching/2025/AGRL112/",

    },

    "AMTL106 (Stoc & Prob)": {

      "Lectures": "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Lecture%20Notes?csf=1&web=1&e=Ks8lhi",
      "Problem Sets": "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Problem%20Sets?csf=1&web=1&e=lKawnC",
      "Problem Solutions": "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Solution%20to%20Problem%20Sets?csf=1&web=1&e=TIGDUz",
      "Quiz Solutions": "https://iitdabudhabi-my.sharepoint.com/:f:/r/personal/sirahul_iitdabudhabi_ac_ae/Documents/AMTL106/Exams/Quiz?csf=1&web=1&e=MximhB",

      "Course Files": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EmCRWabo5RFMsKyJWGalJNEBEQ8tN5PLBAnV1RqlxuVCbA?e=OkG0g9",
      "Blackboard": "https://iida.blackboard.com/ultra/courses/_44_1/outline",
    },

    "AENL100 (AI)": {
      "Blackboard": "https://iida.blackboard.com/ultra/courses/_6_1/outline"
    }
  }
};