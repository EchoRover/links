const linksData = {
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
addUpdate("assignments","ACOL106: Programming assignment 5, 26/10/2025","2025-10-26");
addUpdate("assignments","AGRL112: Assignment 6 (RMQ), 11/10/2025","2025-10-11");
addUpdate("assignments","AGRL112: Assignment 7 (Systems), 25/10/2025","2025-10-25");
addUpdate("assignments","ACOL106: Comprehension Quiz 07, 14/10/2025","2025-10-14");
addUpdate("assignments","ACOL215: 8bit display submission before diwali, 2/11/2025","2025-11-2");






window.addEventListener("DOMContentLoaded", () => {
  renderGeneralLinks(".general", linksData.general);   // general links
  renderLinks1(".links", linksData.courses);  // course links
  renderUpdates();

});


