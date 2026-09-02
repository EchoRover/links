// GENERATED - do not hand-edit. Rebuild: scratchpad/gen_data.py
//
// classes  <- the hand-checked OCC table in rooms-data.js.
// courses  <- each sheet's Course/Title/L-T-P-C/Faculty legend, read
//             from the PDF TEXT LAYER (ruled table where the sheet has
//             one, word coordinates for the Year 1 sheets, which print
//             it as loose text under a 'Coordinator/s' heading).
//             An earlier pass had agents read PICTURES of this table and
//             it produced junk -- 'Anandamunga Das' for Anandarup Das,
//             'Ajun Dhosh' for Arjun Ghosh, AHJL256 for AHUL256. The
//             table is machine-readable text; never OCR it.
// KNOWN GAP: the Y2-CHE sheet prints both 'Rachit Khare' and
//             'Rachit Kharer' for the same person; Khare is used here.
const CT = {
  cohorts: {
  "y1che": "Y1 CHE",
  "y1cse": "Y1 CSE",
  "y1een": "Y1 EEN",
  "y1ele": "Y1 ELE",
  "y2che": "Y2 CHE",
  "y2cse": "Y2 CSE",
  "y2een": "Y2 EEN",
  "y3cse": "Y3 CSE",
  "y3een": "Y3 EEN",
  "m1ets": "MT1 ETS",
  "m2ets": "MT2 ETS"
},
  rooms: {
  "M3-0-004": "Computer Lab 03",
  "M3-0-022": "Computer Lab 02",
  "M3-1-004": "Computer Lab 04",
  "M3-1-009": "Energy Lab",
  "M3-1-014": "Electrical Lab",
  "M3-1-029": "Chemistry Lab",
  "M3-1-031": "Biology Lab",
  "M4-0-005": "Lecture Hall",
  "M4-0-006": "Classroom 2",
  "M4-0-011": "Classroom 3",
  "M4-0-017": "Classroom 4",
  "M4-0-018": "Computer Lab",
  "M4-0-019": "Classroom 3",
  "M4-0-021": "Classroom 6",
  "M4-1-011": "Classroom 8",
  "M4-1-017": "Classroom 7"
},
  courses: {
  "ACHL1000": {
    "title": "Intro to Chemical Engg",
    "ltpc": "1-0-0-1",
    "faculty": [
      "Prof. Mohammad Ali Haider",
      "Prof. Rachit Khare"
    ]
  },
  "ACHL1002": {
    "title": "Material & Energy Balances",
    "ltpc": "2-1-0-3",
    "faculty": [
      "Prof. Rachit Khare"
    ]
  },
  "ACHL2001": {
    "title": "Numerical Analysis for ChemE",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Prapanch Nair"
    ]
  },
  "ACHL2002": {
    "title": "ChemE Thermodynamics",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Mohammad Ali Haider"
    ]
  },
  "ACML1001": {
    "title": "Atoms & Molecules",
    "ltpc": "2-1-0-3",
    "faculty": [
      "Prof. Sameer Sapra",
      "Prof. Nidhi Jain"
    ]
  },
  "ACML1002": {
    "title": "Building Molecules & Materials",
    "ltpc": "2-1-0-3",
    "faculty": [
      "Prof. Subrata Kundu",
      "Prof. Nidhi Jain"
    ]
  },
  "ACMP1000": {
    "title": "Chemistry Laboratory",
    "ltpc": "0-0-4-2",
    "faculty": [
      "Prof. Priyanka Verma",
      "Prof. Subrata Kundu",
      "Prof. Sameer Sapra"
    ]
  },
  "ACOD310": {
    "title": "Mini Project",
    "ltpc": "0-0-6-3",
    "faculty": [
      "Prof. Kaushal Kumar Maurya",
      "Prof. Alap Kshirsagar"
    ]
  },
  "ACOL1000": {
    "title": "Intro to Programming",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Chetan Arora",
      "Prof. Kaushal Kumar Maurya"
    ]
  },
  "ACOL1101": {
    "title": "Programming with Data Structures",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Nikhil Balaji C R",
      "Prof. Alap Kshirsagar"
    ]
  },
  "ACOL2010": {
    "title": "Data Science",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Rajdip Nayek"
    ]
  },
  "ACOL2015": {
    "title": "Digital Logic & System Design",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Abhilash Jindal"
    ]
  },
  "ACOL331": {
    "title": "Operating Systems",
    "ltpc": "3-0-4-5",
    "faculty": [
      "Prof. Abhilash Jindal"
    ]
  },
  "ACOL333": {
    "title": "Principles of AI",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Sumeet Agarwal"
    ]
  },
  "ACOL351": {
    "title": "Algorithms",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Nikhil Balaji C R"
    ]
  },
  "ADAN1100": {
    "title": "Life Skills 1",
    "ltpc": "0-0-1.5-0.75",
    "faculty": [
      "Prof. Shashank Bishnoi"
    ]
  },
  "AELL1000": {
    "title": "Intro to Electrical Engg",
    "ltpc": "2-1-2-4",
    "faculty": [
      "Prof. Ankur Gupta"
    ]
  },
  "AENL226": {
    "title": "Power Electronics & Power Systems",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Anandarup Das",
      "Prof. Ashu Verma"
    ]
  },
  "AENL228": {
    "title": "Measurement & Instrumentation",
    "ltpc": "2-0-2-3",
    "faculty": [
      "Prof. K. Ravi Kumar"
    ]
  },
  "AENP200": {
    "title": "Energy Technology Lab",
    "ltpc": "0-0-3-1.5",
    "faculty": [
      "Prof. Dibakar Rakshit"
    ]
  },
  "AENP225": {
    "title": "Electrical Energy Lab",
    "ltpc": "0-0-3-1.5",
    "faculty": [
      "Prof. Anandarup Das"
    ]
  },
  "AESL2020": {
    "title": "Programming with Data Structures",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Pushpapraj Singh"
    ]
  },
  "AESL2060": {
    "title": "Circuit Analysis & Control",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Anandarup Das"
    ]
  },
  "AESL2061": {
    "title": "Electrical Machines",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Anandarup Das"
    ]
  },
  "AETD781": {
    "title": "Major Project Part-1",
    "ltpc": "0-0-6-3",
    "faculty": [
      "Prof. K. Ravi Kumar"
    ]
  },
  "AETL701": {
    "title": "Engineering Mathematics",
    "ltpc": "2-0-0-2",
    "faculty": [
      "Prof. Harish Kumar"
    ]
  },
  "AETL702": {
    "title": "Thermal Engineering",
    "ltpc": "2-0-0-2",
    "faculty": [
      "Prof. K. Ravi Kumar"
    ]
  },
  "AETL703": {
    "title": "Electrical Engineering",
    "ltpc": "2-0-0-2",
    "faculty": [
      "Prof. Ankur Gupta"
    ]
  },
  "AETL704": {
    "title": "Process Engineering",
    "ltpc": "2-0-0-2",
    "faculty": [
      "Prof. Arun Kumar"
    ]
  },
  "AETL712": {
    "title": "Energy, Development & Sustainability",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Shantanu Roy"
    ]
  },
  "AETL714": {
    "title": "Energy Transition",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Ashu Verma"
    ]
  },
  "AETL726": {
    "title": "Process Intensification",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Shantanu Roy"
    ]
  },
  "AETL728": {
    "title": "Energy Efficiency",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Dibakar Rakshit"
    ]
  },
  "AETL739": {
    "title": "Energy Policy & Planning",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Ashu Verma"
    ]
  },
  "AETP715": {
    "title": "Clean Energy Tech Lab",
    "ltpc": "0-0-3-1.5",
    "faculty": [
      "Prof. Dibakar Rakshit"
    ]
  },
  "AETP717": {
    "title": "Seminar",
    "ltpc": "0-0-2-1",
    "faculty": [
      "Prof. K. Ravi Kumar"
    ]
  },
  "AGRL130": {
    "title": "Entrepreneurship",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Joby Joseph",
      "Prof. Ashu Verma"
    ]
  },
  "AHSL2062": {
    "title": "Social Psychology of Health",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Yashpal Ashokrao Jogdand"
    ]
  },
  "AHSL2675": {
    "title": "Environment, Development & Society",
    "ltpc": "3-0-0-3",
    "faculty": [
      "Prof. Arjun Ghosh"
    ]
  },
  "AHUL256": {
    "title": "Critical Thinking",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Arjun Ghosh"
    ]
  },
  "AHUL261": {
    "title": "Psychology",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Yashpal Ashokrao Jogdand"
    ]
  },
  "AMEL1140": {
    "title": "Thermodynamics",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Prapanch Nair"
    ]
  },
  "AMLL1001": {
    "title": "Intro to Material Science",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Rajesh Prasad"
    ]
  },
  "AMTL1001": {
    "title": "Calculus",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Kamana Porwal"
    ]
  },
  "AMTL2006": {
    "title": "Probability & Stochastic Processes",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Rahul Singh"
    ]
  },
  "AMTL2008": {
    "title": "Probability & Statistics",
    "ltpc": "3-1-0-4",
    "faculty": [
      "Prof. Rahul Singh"
    ]
  },
  "APYL1001": {
    "title": "Electrodynamics",
    "ltpc": "2-1-0-3",
    "faculty": [
      "Prof. Joby Joseph"
    ]
  },
  "ASBL100": {
    "title": "Intro Biology for Engineers",
    "ltpc": "3-0-2-4",
    "faculty": [
      "Prof. Saurabh Raj"
    ]
  },
  "ASBL1100": {
    "title": "Biology for Engineers",
    "ltpc": "2-0-0-2",
    "faculty": [
      "Prof. Ashok Kumar Patel"
    ]
  },
  "ASBP1100": {
    "title": "Experimental Biology Lab",
    "ltpc": "0-0-2-1",
    "faculty": [
      "Prof. Ashok Kumar Patel"
    ]
  }
},
  classes: [
    {"day": "Monday", "start": "16:00", "end": "16:50", "course": "AETL702", "room": "M4-1-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "17:00", "end": "17:50", "course": "AETL704", "room": "M4-1-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "16:30", "end": "17:20", "course": "AETL701", "room": "M4-0-021", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "17:30", "end": "18:50", "course": "AETL714", "room": "M4-0-019", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "19:00", "end": "19:50", "course": "AETL702", "room": "M4-0-021", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:30", "end": "16:50", "course": "AETL712", "room": "M4-0-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "17:00", "end": "17:50", "course": "AETL701", "room": "M4-0-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "18:00", "end": "19:20", "course": "AETL714", "room": "M4-1-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "19:30", "end": "20:20", "course": "AETL703", "room": "M4-1-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:50", "course": "AETL712", "room": "M4-0-011", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "17:00", "end": "17:50", "course": "AETL704", "room": "M4-0-021", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "18:30", "end": "19:20", "course": "AETL703", "room": "M4-1-017", "cohort": "m1ets", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "10:00", "end": "11:50", "course": "AETP717", "room": "M4-1-011", "cohort": "m2ets", "group": "all", "kind": "lab"},
    {"day": "Monday", "start": "15:30", "end": "16:50", "course": "AETL728", "room": "M4-0-017", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "17:30", "end": "20:20", "course": "AETP715", "room": "M4-0-018", "cohort": "m2ets", "group": "all", "kind": "lab"},
    {"day": "Thursday", "start": "15:30", "end": "16:50", "course": "AETL728", "room": "M4-1-017", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:30", "end": "16:50", "course": "AETL739", "room": "M4-1-011", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "17:30", "end": "18:50", "course": "AETL726", "room": "M4-1-011", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:50", "course": "AETL739", "room": "M4-0-021", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "17:30", "end": "18:50", "course": "AETL726", "room": "M4-0-019", "cohort": "m2ets", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "1B & 2B", "kind": "lab"},
    {"day": "Friday", "start": "08:30", "end": "09:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1che", "group": "G3", "kind": "tutorial"},
    {"day": "Friday", "start": "09:30", "end": "10:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1che", "group": "G4", "kind": "tutorial"},
    {"day": "Friday", "start": "10:30", "end": "11:50", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1che", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "4A & 4C", "kind": "lab"},
    {"day": "Monday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1che", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "09:00", "end": "10:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1che", "group": "G3", "kind": "lab"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "ACML1002", "room": "M4-0-021", "cohort": "y1che", "group": "G1 & G2", "kind": "tutorial"},
    {"day": "Monday", "start": "14:00", "end": "14:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1che", "group": "G4", "kind": "tutorial"},
    {"day": "Monday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "3A & 3C", "kind": "lab"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1che", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "16:00", "end": "16:50", "course": "ACML1002", "room": "M2-2-007", "cohort": "y1che", "group": "G4", "kind": "tutorial"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-011", "cohort": "y1che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1che", "group": "G1", "kind": "tutorial"},
    {"day": "Thursday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1che", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Thursday", "start": "09:30", "end": "10:20", "course": "AELL1000", "room": "M4-0-006", "cohort": "y1che", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1che", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1che", "group": "G3", "kind": "tutorial"},
    {"day": "Thursday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y1che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "3A & 4A", "kind": "lab"},
    {"day": "Thursday", "start": "15:00", "end": "18:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "2A & 2C", "kind": "lab"},
    {"day": "Thursday", "start": "16:00", "end": "17:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1che", "group": "G1", "kind": "lab"},
    {"day": "Thursday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "3B & 4B", "kind": "lab"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-011", "cohort": "y1che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1che", "group": "G1", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1che", "group": "G2", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1che", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1che", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Tuesday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y1che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "1A & 2A", "kind": "lab"},
    {"day": "Tuesday", "start": "15:00", "end": "16:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1che", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "16:30", "end": "17:20", "course": "ACML1002", "room": "M2-2-007", "cohort": "y1che", "group": "G3", "kind": "tutorial"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "1B & 2B", "kind": "lab"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1che", "group": "G4", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "3B & 4B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1che", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:00", "end": "11:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "1C & 2C", "kind": "lab"},
    {"day": "Wednesday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1che", "group": "1A & 1C", "kind": "lab"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1che", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1che", "group": "3C & 4C", "kind": "lab"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1che", "group": "G2", "kind": "lab"},
    {"day": "Friday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "1B & 2B", "kind": "lab"},
    {"day": "Friday", "start": "08:30", "end": "09:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G3", "kind": "tutorial"},
    {"day": "Friday", "start": "09:30", "end": "10:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G4", "kind": "tutorial"},
    {"day": "Friday", "start": "10:30", "end": "11:50", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "4A & 4C", "kind": "lab"},
    {"day": "Monday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1cse", "group": "G3", "kind": "tutorial"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "ACML1002", "room": "M4-0-021", "cohort": "y1cse", "group": "G1 & G2", "kind": "tutorial"},
    {"day": "Monday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1cse", "group": "G4", "kind": "tutorial"},
    {"day": "Monday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "3A & 3C", "kind": "lab"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1cse", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "16:00", "end": "16:50", "course": "ACML1002", "room": "M2-2-007", "cohort": "y1cse", "group": "G4", "kind": "tutorial"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G1", "kind": "tutorial"},
    {"day": "Thursday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1cse", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Thursday", "start": "09:30", "end": "10:20", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1cse", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1cse", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G4", "kind": "tutorial"},
    {"day": "Thursday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "15:00", "end": "15:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G1", "kind": "tutorial"},
    {"day": "Thursday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "3A & 4A", "kind": "lab"},
    {"day": "Thursday", "start": "15:00", "end": "18:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "2A & 2C", "kind": "lab"},
    {"day": "Thursday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "3B & 4B", "kind": "lab"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G2", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1cse", "group": "G1", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1cse", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1cse", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G3", "kind": "tutorial"},
    {"day": "Tuesday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "1A & 2A", "kind": "lab"},
    {"day": "Tuesday", "start": "15:00", "end": "16:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "16:30", "end": "17:20", "course": "ACML1002", "room": "M2-2-007", "cohort": "y1cse", "group": "G3", "kind": "tutorial"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "1B & 2B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "3B & 4B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1cse", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:00", "end": "11:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "1C & 2C", "kind": "lab"},
    {"day": "Wednesday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "14:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1cse", "group": "G2", "kind": "tutorial"},
    {"day": "Wednesday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1cse", "group": "1A & 1C", "kind": "lab"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1cse", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1cse", "group": "3C & 4C", "kind": "lab"},
    {"day": "Friday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "1B & 2B", "kind": "lab"},
    {"day": "Friday", "start": "10:30", "end": "11:50", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1een", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "4A & 4C", "kind": "lab"},
    {"day": "Monday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1een", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "09:00", "end": "10:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1een", "group": "G3", "kind": "lab"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1een", "group": "G1", "kind": "tutorial"},
    {"day": "Monday", "start": "11:00", "end": "11:50", "course": "AMTL1001", "room": "M4-0-021", "cohort": "y1een", "group": "G3", "kind": "tutorial"},
    {"day": "Monday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "14:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1een", "group": "G4", "kind": "tutorial"},
    {"day": "Monday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "3A & 3C", "kind": "lab"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1een", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "15:30", "end": "16:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1een", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1een", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Thursday", "start": "09:30", "end": "10:20", "course": "AELL1000", "room": "M4-0-006", "cohort": "y1een", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1een", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1een", "group": "G3", "kind": "tutorial"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1een", "group": "G4", "kind": "tutorial"},
    {"day": "Thursday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y1een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "15:00", "end": "15:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1een", "group": "G1", "kind": "tutorial"},
    {"day": "Thursday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "3A & 4A", "kind": "lab"},
    {"day": "Thursday", "start": "15:00", "end": "18:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "2A & 2C", "kind": "lab"},
    {"day": "Thursday", "start": "16:00", "end": "17:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1een", "group": "G1", "kind": "lab"},
    {"day": "Thursday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "3B & 4B", "kind": "lab"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "AELL1000", "room": "M2-2-007", "cohort": "y1een", "group": "G1", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1een", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1een", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1een", "group": "G3", "kind": "tutorial"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "AMTL1001", "room": "M2-2-015", "cohort": "y1een", "group": "G4", "kind": "tutorial"},
    {"day": "Tuesday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y1een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "1A & 2A", "kind": "lab"},
    {"day": "Tuesday", "start": "15:00", "end": "16:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1een", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "1B & 2B", "kind": "lab"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1een", "group": "G4", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "3B & 4B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1een", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:00", "end": "11:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "1C & 2C", "kind": "lab"},
    {"day": "Wednesday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "14:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1een", "group": "G2", "kind": "tutorial"},
    {"day": "Wednesday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1een", "group": "1A & 1C", "kind": "lab"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1een", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1een", "group": "3C & 4C", "kind": "lab"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y1een", "group": "G2", "kind": "lab"},
    {"day": "Friday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "1B & 2B", "kind": "lab"},
    {"day": "Friday", "start": "10:30", "end": "11:50", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "4A & 4C", "kind": "lab"},
    {"day": "Monday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G1", "kind": "tutorial"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1ele", "group": "G3", "kind": "tutorial"},
    {"day": "Monday", "start": "11:00", "end": "11:50", "course": "AMTL1001", "room": "M4-0-021", "cohort": "y1ele", "group": "G3", "kind": "tutorial"},
    {"day": "Monday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1ele", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1ele", "group": "G4", "kind": "tutorial"},
    {"day": "Monday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "3A & 3C", "kind": "lab"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1ele", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Monday", "start": "15:30", "end": "16:20", "course": "AMTL1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1ele", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Thursday", "start": "09:30", "end": "10:20", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1ele", "group": "G2", "kind": "tutorial"},
    {"day": "Thursday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1ele", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G4", "kind": "tutorial"},
    {"day": "Thursday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "15:00", "end": "15:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G1", "kind": "tutorial"},
    {"day": "Thursday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "3A & 4A", "kind": "lab"},
    {"day": "Thursday", "start": "15:00", "end": "18:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "2A & 2C", "kind": "lab"},
    {"day": "Thursday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "3B & 4B", "kind": "lab"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "APYL1001", "room": "M2-2-015", "cohort": "y1ele", "group": "G1", "kind": "tutorial"},
    {"day": "Tuesday", "start": "09:00", "end": "10:20", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1ele", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:30", "end": "11:50", "course": "ACOL1000", "room": "M4-0-005", "cohort": "y1ele", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G3", "kind": "tutorial"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "AMTL1001", "room": "M2-2-015", "cohort": "y1ele", "group": "G4", "kind": "tutorial"},
    {"day": "Tuesday", "start": "14:00", "end": "14:50", "course": "APYL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:00", "end": "16:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "1A & 2A", "kind": "lab"},
    {"day": "Tuesday", "start": "15:00", "end": "16:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "1B & 2B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "11:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "3B & 4B", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:20", "course": "AMTL1001", "room": "M4-0-005", "cohort": "y1ele", "group": "G1 & G2", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:00", "end": "11:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "1C & 2C", "kind": "lab"},
    {"day": "Wednesday", "start": "12:00", "end": "12:50", "course": "ACML1001", "room": "M4-0-005", "cohort": "y1ele", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "14:50", "course": "ACML1001", "room": "M2-2-009", "cohort": "y1ele", "group": "G2", "kind": "tutorial"},
    {"day": "Wednesday", "start": "14:00", "end": "17:50", "course": "ACMP1000", "room": "M3-1-029", "cohort": "y1ele", "group": "1A & 1C", "kind": "lab"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "ADAN1100", "room": "M4-0-005", "cohort": "y1ele", "group": "G3 & G4", "kind": "lecture"},
    {"day": "Wednesday", "start": "16:00", "end": "17:50", "course": "ACOL1000", "room": "M3-1-004", "cohort": "y1ele", "group": "3C & 4C", "kind": "lab"},
    {"day": "Friday", "start": "11:00", "end": "11:50", "course": "AMTL2008", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "09:20", "course": "ACHL2001", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "10:00", "end": "11:20", "course": "ACHL2002", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACHL1002", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "ASBL1100", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "10:00", "end": "11:20", "course": "ACHL2002", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:50", "course": "ASBP1100", "room": "M3-1-031", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACHL1002", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "ASBL1100", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:00", "end": "10:50", "course": "ACHL1000", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "AMTL2008", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "14:50", "course": "AMTL2008", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "tutorial"},
    {"day": "Tuesday", "start": "15:00", "end": "15:50", "course": "ACHL1002", "room": "M4-0-021", "cohort": "y2che", "group": "all", "kind": "tutorial"},
    {"day": "Tuesday", "start": "16:00", "end": "17:50", "course": "ACHL2001", "room": "M4-0-018", "cohort": "y2che", "group": "all", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:20", "course": "ACHL2001", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:00", "end": "10:50", "course": "ACHL2002", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "tutorial"},
    {"day": "Wednesday", "start": "11:00", "end": "11:50", "course": "AMTL2008", "room": "M4-0-017", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2che", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "08:00", "end": "08:50", "course": "ACOL1101", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "09:00", "end": "09:50", "course": "AMTL2006", "room": "M4-0-021", "cohort": "y2cse", "group": "G2", "kind": "tutorial"},
    {"day": "Friday", "start": "10:00", "end": "10:50", "course": "AMTL2006", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "11:00", "end": "11:50", "course": "ACOL2010", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "08:50", "course": "ACOL2015", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "10:30", "end": "11:50", "course": "AMEL1140", "room": "M4-0-019", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "17:00", "end": "18:50", "course": "ACOL2010", "room": "M3-0-004", "cohort": "y2cse", "group": "all", "kind": "lab"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACOL2015", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "10:00", "end": "10:50", "course": "AMTL2006", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "ACOL2010", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:50", "course": "AMLL1001", "room": "M2-2-031", "cohort": "y2cse", "group": "G2", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:50", "course": "AMEL1140", "room": "M3-1-009", "cohort": "y2cse", "group": "G1", "kind": "lab"},
    {"day": "Thursday", "start": "16:00", "end": "17:50", "course": "AELL1000", "room": "M3-1-014", "cohort": "y2cse", "group": "all", "kind": "lab"},
    {"day": "Thursday", "start": "18:00", "end": "18:50", "course": "AMLL1001", "room": "M4-0-011", "cohort": "y2cse", "group": "all", "kind": "tutorial"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACOL2015", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "ACOL1101", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:00", "end": "10:50", "course": "AMTL2006", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "ACOL2010", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "12:00", "end": "12:50", "course": "AELL1000", "room": "M4-0-005", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:50", "course": "AMLL1001", "room": "M2-2-031", "cohort": "y2cse", "group": "G1", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:50", "course": "AMEL1140", "room": "M3-1-009", "cohort": "y2cse", "group": "G2", "kind": "lab"},
    {"day": "Tuesday", "start": "16:00", "end": "16:50", "course": "AMTL2006", "room": "M2-2-015", "cohort": "y2cse", "group": "G1", "kind": "tutorial"},
    {"day": "Tuesday", "start": "17:00", "end": "18:50", "course": "ACOL1101", "room": "M3-0-022", "cohort": "y2cse", "group": "all", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "08:50", "course": "ACOL1101", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:30", "end": "11:50", "course": "AMEL1140", "room": "M4-0-021", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "17:00", "end": "18:50", "course": "ACOL2015", "room": "M3-0-004", "cohort": "y2cse", "group": "all", "kind": "lab"},
    {"day": "Friday", "start": "10:00", "end": "10:50", "course": "AESL2020", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "11:00", "end": "11:50", "course": "AESL2060", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "08:00", "end": "08:50", "course": "AESL2061", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "10:30", "end": "11:50", "course": "AMEL1140", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "10:00", "end": "10:50", "course": "AESL2020", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "AESL2060", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:50", "course": "AMLL1001", "room": "M2-2-031", "cohort": "y2een", "group": "G2", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:50", "course": "AMEL1140", "room": "M3-1-009", "cohort": "y2een", "group": "G1", "kind": "lab"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACML1002", "room": "M4-0-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "09:00", "end": "09:50", "course": "AESL2061", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:00", "end": "10:50", "course": "AESL2020", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "AESL2060", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:50", "course": "AMLL1001", "room": "M2-2-031", "cohort": "y2een", "group": "G1", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:50", "course": "AMEL1140", "room": "M3-1-009", "cohort": "y2een", "group": "G2", "kind": "lab"},
    {"day": "Tuesday", "start": "16:30", "end": "17:20", "course": "ACML1002", "room": "M2-2-007", "cohort": "y2een", "group": "all", "kind": "tutorial"},
    {"day": "Wednesday", "start": "08:00", "end": "08:50", "course": "AESL2061", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "09:00", "end": "09:50", "course": "AMLL1001", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "10:30", "end": "11:50", "course": "AMEL1140", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "AHSL2062", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:50", "course": "AHSL2675", "room": "M4-1-011", "cohort": "y2een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "17:00", "end": "17:50", "course": "AMLL1001", "room": "M4-0-019", "cohort": "y2een", "group": "all", "kind": "tutorial"},
    {"day": "Friday", "start": "09:00", "end": "09:50", "course": "ACOL351", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "10:00", "end": "11:50", "course": "ACOD310", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "res"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "ACOL331", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "11:00", "end": "11:50", "course": "ACOL333", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "AHUL256", "room": "M4-0-011", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "16:00", "end": "18:50", "course": "AGRL130", "room": "M4-0-011", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "08:00", "end": "08:50", "course": "ACOL351", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "10:00", "end": "10:50", "course": "ACOL331", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "11:50", "course": "ACOL333", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:20", "course": "AHUL261", "room": "M4-0-011", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "15:30", "end": "17:20", "course": "ACOL331", "room": "M3-0-004", "cohort": "y3cse", "group": "all", "kind": "lab"},
    {"day": "Tuesday", "start": "08:00", "end": "08:50", "course": "ACOL351", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "10:00", "end": "10:50", "course": "ACOL331", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "11:50", "course": "ACOL333", "room": "M4-1-017", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:20", "course": "AHUL261", "room": "M4-0-011", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:30", "end": "16:20", "course": "AHUL256", "room": "M4-1-017", "cohort": "y3cse", "group": "G2", "kind": "tutorial"},
    {"day": "Tuesday", "start": "16:30", "end": "18:20", "course": "ACOL333", "room": "M3-0-004", "cohort": "y3cse", "group": "all", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "09:50", "course": "ACOL331", "room": "M3-0-004", "cohort": "y3cse", "group": "all", "kind": "lab"},
    {"day": "Wednesday", "start": "10:00", "end": "10:50", "course": "ACOL351", "room": "M4-0-019", "cohort": "y3cse", "group": "all", "kind": "tutorial"},
    {"day": "Wednesday", "start": "11:00", "end": "11:50", "course": "AHUL261", "room": "M4-1-017", "cohort": "y3cse", "group": "G2", "kind": "tutorial"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "AHUL256", "room": "M4-0-011", "cohort": "y3cse", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "16:20", "course": "AHUL261", "room": "M4-1-017", "cohort": "y3cse", "group": "G1", "kind": "tutorial"},
    {"day": "Wednesday", "start": "17:00", "end": "17:50", "course": "AHUL256", "room": "M4-1-017", "cohort": "y3cse", "group": "G1", "kind": "tutorial"},
    {"day": "Friday", "start": "08:00", "end": "08:50", "course": "ASBL100", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Friday", "start": "10:00", "end": "11:50", "course": "ASBL100", "room": "M3-1-031", "cohort": "y3een", "group": "all", "kind": "lab"},
    {"day": "Monday", "start": "10:00", "end": "10:50", "course": "AENL226", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "11:00", "end": "11:50", "course": "AENL228", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "14:00", "end": "15:20", "course": "AHUL256", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Monday", "start": "16:00", "end": "18:50", "course": "AGRL130", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "09:00", "end": "09:50", "course": "AENL226", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "tutorial"},
    {"day": "Thursday", "start": "10:00", "end": "10:50", "course": "ASBL100", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "11:00", "end": "12:20", "course": "AENL226", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "14:00", "end": "15:20", "course": "AHUL261", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Thursday", "start": "16:00", "end": "17:50", "course": "AENL228", "room": "M2-2-031", "cohort": "y3een", "group": "G1", "kind": "lecture"},
    {"day": "Thursday", "start": "16:00", "end": "18:50", "course": "AENP225", "room": "M3-1-009", "cohort": "y3een", "group": "G2", "kind": "lab"},
    {"day": "Tuesday", "start": "10:00", "end": "10:50", "course": "ASBL100", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "11:00", "end": "12:20", "course": "AENL226", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "14:00", "end": "15:20", "course": "AHUL261", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Tuesday", "start": "15:30", "end": "16:20", "course": "AHUL256", "room": "M4-1-017", "cohort": "y3een", "group": "G2", "kind": "tutorial"},
    {"day": "Tuesday", "start": "16:00", "end": "18:50", "course": "AENP225", "room": "M3-1-009", "cohort": "y3een", "group": "G1", "kind": "lab"},
    {"day": "Wednesday", "start": "08:00", "end": "08:50", "course": "AENL228", "room": "M2-2-007", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "09:00", "end": "10:50", "course": "AENL228", "room": "M2-2-031", "cohort": "y3een", "group": "G2", "kind": "lecture"},
    {"day": "Wednesday", "start": "09:00", "end": "11:50", "course": "AENP200", "room": "M3-1-009", "cohort": "y3een", "group": "G1", "kind": "lab"},
    {"day": "Wednesday", "start": "11:00", "end": "11:50", "course": "AHUL261", "room": "M4-1-017", "cohort": "y3een", "group": "G2", "kind": "tutorial"},
    {"day": "Wednesday", "start": "14:00", "end": "15:20", "course": "AHUL256", "room": "M4-0-011", "cohort": "y3een", "group": "all", "kind": "lecture"},
    {"day": "Wednesday", "start": "15:30", "end": "18:20", "course": "AENP200", "room": "M3-1-009", "cohort": "y3een", "group": "G2", "kind": "lab"},
    {"day": "Wednesday", "start": "15:30", "end": "16:20", "course": "AHUL261", "room": "M4-1-017", "cohort": "y3een", "group": "G1", "kind": "tutorial"},
    {"day": "Wednesday", "start": "17:00", "end": "17:50", "course": "AHUL256", "room": "M4-1-017", "cohort": "y3een", "group": "G1", "kind": "tutorial"},
  ],
};
