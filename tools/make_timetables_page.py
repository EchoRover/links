import os
import glob

html_top = """<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>All Timetables · linkCS</title>
    <link rel="icon" type="image/webp" href="assets/hacker.webp">
    <script src="js/theme-init.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@1,400;1,500;1,600&family=Familjen+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
    <style>
        .tt-wrap { max-width: 900px; margin: 0 auto; padding: 0 20px 80px; }
        .tt-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin: 34px 0 24px; flex-wrap: wrap; }
        .tt-title { font-family: var(--font-serif); font-style: italic; font-weight: 500; font-size: clamp(1.7rem, 4vw, 2.6rem); color: var(--fg); margin: 0; }
        .tt-title em { color: var(--coral); }
        .tt-sub { font-size: 0.86rem; color: var(--fg-soft); max-width: 560px; line-height: 1.45; margin: 6px 0 0; }
        
        .year-section { margin-bottom: 40px; }
        .year-title { font-family: var(--font-mono); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fg-faint); margin: 0 0 16px; border-bottom: 1px solid var(--rule-faint); padding-bottom: 8px; }
        .tt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
        
        .tt-card { background: var(--bg-card); border: 1px solid var(--rule); border-radius: 12px; padding: 18px 20px; cursor: pointer; box-shadow: var(--shadow-sm); transition: border-color 0.15s, transform 0.15s; display: block; text-decoration: none; color: inherit; }
        .tt-card:hover { border-color: var(--coral); transform: translateY(-2px); }
        .tt-name { font-family: var(--font-sans); font-weight: 600; font-size: 1.1rem; color: var(--fg); margin-bottom: 4px; display: block; }
        .tt-meta { font-family: var(--font-mono); font-size: 0.75rem; color: var(--fg-soft); display: block; }
    </style>
</head>

<body>
    <!-- Navigation included via JS or kept simple, let's keep it simple with a back link -->
    <header class="topbar">
        <div class="brand">
            <a href="index.html" style="text-decoration: none; color: inherit; display: flex; align-items: center; gap: 12px;">
                <div class="brand-logo">
                    <img src="assets/text.webp" class="text-img" alt="IIT Delhi Abu Dhabi">
                    <img src="assets/circle.webp" class="circle-img" alt="">
                </div>
                <span class="brand-name">
                    <span class="brand-part-link">link</span><span class="brand-part-cs">CS</span>
                </span>
            </a>
            <span class="brand-meta">sem v · 2026—27</span>
        </div>
        <div class="topbar-utils">
            <button class="button" id="theme-toggle" aria-label="Toggle theme">◐</button>
        </div>
    </header>

    <main class="page tt-wrap">
        <div class="tt-hero">
            <div>
                <h1 class="tt-title">All <em>Timetables</em></h1>
                <p class="tt-sub">Fall 2026 / August 27 Reissue</p>
            </div>
        </div>
"""

html_bottom = """
    </main>
    <script src="js/scripts.js"></script>
    <script src="js/ui.js"></script>
</body>
</html>
"""

from datetime import datetime

pdfs = sorted(glob.glob('/Users/evantobias/repos/links/data/timetables/*.pdf'))
by_branch = {}

for p in pdfs:
    name = os.path.basename(p)
    # e.g. 2026-09-07-year3-sem5-btech-cse.pdf
    parts = name.replace('.pdf', '').split('-')
    if len(parts) < 7:
        continue
    date_prefix = f"{parts[0]}-{parts[1]}-{parts[2]}"
    dt = datetime.strptime(date_prefix, "%Y-%m-%d")
    formatted_date = dt.strftime("%B %d, %Y").replace(" 0", " ")

    year_str = parts[3] # year1
    sem_str = parts[4] # sem1
    prog = parts[5].upper() # btech
    major = parts[6].upper() # cse
    
    y = year_str.replace('year', 'Year ')
    s = sem_str.replace('sem', 'Sem ')
    
    cat = f"{y} — {s}"
    title = f"{prog} {major}"
    key = (cat, title)
    
    # Only keep the latest pdf for this branch
    if key not in by_branch or date_prefix > by_branch[key]['date_prefix']:
        by_branch[key] = {
            'cat': cat,
            'title': title,
            'path': f"data/timetables/{name}",
            'date': formatted_date,
            'date_prefix': date_prefix
        }

years = {}
for item in by_branch.values():
    years.setdefault(item['cat'], []).append(item)

content = ""
for cat in sorted(years.keys()):
    content += f'        <div class="year-section">\n'
    content += f'            <h2 class="year-title">{cat}</h2>\n'
    content += f'            <div class="tt-grid">\n'
    for item in sorted(years[cat], key=lambda x: x['title']):
        content += f'''                <a href="{item['path']}" target="_blank" rel="noopener" class="tt-card">
                    <span class="tt-name">{item['title']}</span>
                    <span class="tt-meta">Updated: {item['date']}</span>
                </a>\n'''
    content += f'            </div>\n'
    content += f'        </div>\n'

with open('/Users/evantobias/repos/links/timetables.html', 'w') as f:
    f.write(html_top + content + html_bottom)

print("Created timetables.html")
