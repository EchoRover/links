const linksData = {
  general: {
    ERP: "https://iitdadierp.iitd.ac.in/student/login",
    Teams: "https://teams.microsoft.com/",
    Outlook: "https://outlook.office.com/",
    Blackboard: "https://iida.blackboard.com/ultra/course",
    TimeTable: "https://abudhabi.iitd.ac.in/uploaded_files/B.Tech.%202nd%20year%20CSE%20Sem%201_2025-26.pdf"
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

      "Lectures": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/Em6zEdGXyjhIu7zR8AelmXABTrrxgwJTEO8-izxjDqiJ-g?e=Uh1kMb",
      "Problem Sets": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EqJTUBdP5_JOl3DJZA1x9NoBeapUtXShxvgO7bsJjfwBKA?e=llLCfm",
      "Problem Solutions": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EgWkUBlK5q1FgNwNT9tr1f4B9cQHB7KZWay-v6D24dzlQg?e=agUWaU",
      "Quiz Solutions": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EhqyGydyYatAg34IGX0LQAIBzpo7kRAs_EYYku9ooXNTDQ?e=0dAo85",

      "Course Files": "https://iitdabudhabi-my.sharepoint.com/:f:/g/personal/sirahul_iitdabudhabi_ac_ae/EmCRWabo5RFMsKyJWGalJNEBN3vCCbt5q8lc2O5HuZ0sSg?e=vpTWOg",
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

function renderUpdates(selector, updates) {
  const container = document.querySelector(selector);
  if (!container) return;

  const now = new Date();

  updates.forEach(update => {
    const expiryDateTime = new Date(update.expiry);
    if (now <= expiryDateTime) {
      const p = document.createElement("p");
      p.textContent = update.text;
      container.appendChild(p);
    }
  });
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



window.addEventListener("DOMContentLoaded", () => {
  renderGeneralLinks(".general", linksData.general);   // general links
  renderLinks1(".links", linksData.courses);  // course links

});


