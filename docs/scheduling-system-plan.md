---
title: "One Timetable"
subtitle: "A scheduling and room-booking system for IIT Delhi Abu Dhabi"
author: "Evan Johan Tobias"
date: "Draft 1 — 11 September 2026"
geometry: margin=2.3cm
fontsize: 10.5pt
linkcolor: "CrimsonIITD"
toccolor: "InkIITD"
toc: true
toc-depth: 2
numbersections: false
header-includes:
  - \usepackage{xcolor}
  - \definecolor{CrimsonIITD}{HTML}{A41E22}
  - \definecolor{DeepIITD}{HTML}{690F12}
  - \definecolor{InkIITD}{HTML}{191919}
  - \definecolor{MutedIITD}{HTML}{475569}
  - \definecolor{RuleIITD}{HTML}{E2E8F0}
  - \definecolor{TintIITD}{HTML}{FCE6E6}
  - \usepackage{titlesec}
  - \titleformat{\section}{\Large\bfseries\color{CrimsonIITD}}{\thesection}{0em}{}
  - \titleformat{\subsection}{\large\bfseries\color{DeepIITD}}{\thesubsection}{0em}{}
  - \titleformat{\subsubsection}{\normalsize\bfseries\color{InkIITD}}{\thesubsubsection}{0em}{}
  - \usepackage{tcolorbox}
  - \newtcolorbox{keybox}{colback=TintIITD,colframe=CrimsonIITD,boxrule=0.7pt,arc=1mm,left=2.5mm,right=2.5mm,top=1.5mm,bottom=1.5mm}
  - \usepackage{fancyhdr}
  - \pagestyle{fancy}
  - \fancyhead[L]{\footnotesize\color{MutedIITD}One Timetable}
  - \fancyhead[R]{\footnotesize\color{MutedIITD}IITD Abu Dhabi · Draft 1}
  - \fancyfoot[C]{\footnotesize\color{MutedIITD}\thepage}
  - \renewcommand{\headrulewidth}{0.4pt}
  - \usepackage{longtable}
  - \usepackage{booktabs}
---

\newpage

# Summary

**The ask.** Approval to build a scheduling and room-booking system for the
campus, starting with a two-to-three week read-only phase that costs the office
nothing and delivers something it has already asked for.

**Why.** The timetable is maintained in five Excel workbooks, exported to eleven
PDFs, and published with no step between that checks anything. Every published
sheet and every workbook, read mechanically on 10–11 September 2026:

| | |
|---|---|
| Rooms named inconsistently across sheets | **6** |
| Rooms double-booked across cohorts | **1** |
| Blocks whose end time precedes their start | **2** |
| Held sheets out of date against what was published | **5 of 11** |
| A room name contradicted by its own door plate | **1** |

None of that is carelessness. It is what happens when eleven documents are the
system of record and a spreadsheet is the only integrity check.

**What is proposed.** One authoritative schedule; room booking with approval;
publishing to web, calendar feeds and PDF; conflict prevention enforced by the
database rather than by care; change notification; utilisation reporting. Student
registration and add/drop are deliberately **out of scope for v1**.

**Build, not buy.** The products in this space — 25Live, CELCAT, Syllabus Plus —
are priced for institutions with tens of thousands of students. UniTime is free
but is a timetabling *solver* for a research university, and our schedule is
already built well by a person. What fails is everything after that.

**Cost.** One developer, part-time, roughly four months to a system that publishes,
validates and books. Much of the reading and publishing already exists and runs.

**What management must decide before Phase 2 (Part 11).** Where it runs and who
maintains it after I graduate; whether it becomes the system of record or stays a
publisher; who approves bookings for each room and who deputises; and whether
teaching may evict an approved booking.

**The honest risk is not the code.** It is that nobody is named to own this before
the institution starts depending on it.

\newpage

## Part 1 — The case

### 1.1 What the current process is

The schedule lives in five Excel workbooks maintained in the academic office. Those
are exported to PDF through Acrobat PDFMaker and uploaded to
`iitdabudhabi.ac.ae/timetable` as eleven separate files, one per cohort. Everything
downstream — students, faculty, room users — reads the PDFs.

There is no step between "someone edits a cell" and "eleven PDFs are correct and
everyone knows".

### 1.2 Defects this produces, measured

Running every published sheet and every workbook through a reader built for this
purpose, on 10–11 September 2026:

| Finding | Count | Example |
|---|---|---|
| Rooms called different names on different sheets | **6** | `M4-0-019` is "Classroom 3", "Classroom 5" and "Classroom 8" |
| Rooms double-booked across cohorts | **1** | Wed 17:00 `M4-0-019`: Masters `AAIL7024` vs Y2 EEN `AMLL1001` |
| Blocks whose end time precedes their start | **2** | Y1 ELE and Y1 EEN, Monday `AMTL1001`: "15:30 to 14:20" |
| One class described two ways | **1** | `AHUL261` Mon 09:00 — "Tutorial" on the CSE sheet, unlabelled on EEN |
| Room name contradicted by its own door plate | **1** | Y1 CHE calls `M4-0-011` "Lecture Hall"; the plate says Classroom 3 |

Two of these compound: the Y2 EEN row in the double-booking prints code
`M4-0-019` beside the name "Classroom 8", and Classroom 8 is `M4-1-011`
everywhere else. Either the code or the name is a typo, and which one it is
decides whether the clash is real. **Nobody can answer that from the documents.**

### 1.3 The distribution problem, separately

Sheets are reissued often — 23 Aug, 27 Aug, 7 Sep, 8 Sep, 9 Sep, 10 Sep for
various cohorts — and nothing announces it. A snapshot taken on 10 September found
**5 of 11 held copies out of date**, two of them by thirteen days. Those two carry
no revision stamp in the footer at all, so even a careful reader comparing stamps
sees nothing wrong.

The workbooks are also *ahead* of the website: Year 2 is dated 10 September while
the newest published Year 2 PDF is the 8th.

### 1.4 What this costs

- A student walks to the wrong room, because the name on the sheet is not the
  name on the door.
- Two classes arrive at the same room, and the more junior group leaves.
- A change is published and reaches nobody until someone happens to re-download.
- The office cannot answer "is M4-0-019 free on Thursday at 3?" without opening
  eleven files and reading them by eye.

None of this is carelessness. It is what happens when eleven documents are the
system of record and a spreadsheet is the only integrity check.

---

## Part 2 — What exists, and what we should do about it

### 2.1 The market

| System | Vendor | Shape | Fit here |
|---|---|---|---|
| **25Live** | CollegeNET | Cloud. Academic + event + resource scheduling, approval workflow, conflict checking. Market leader in North American HE. | Model is right, scale and cost are not |
| **Syllabus Plus / Granular** | Scientia | Capacity-aware section placement, automated timetabling | Enterprise; built for thousands of sections |
| **CELCAT** | CELCAT | Timetabling + room booking + SIS integration, strong UK presence | Same |
| **Untis** | Untis GmbH | Schools, mostly Europe, integrated SIS | Wrong segment |
| **UniTime** | Apereo Foundation | **Open source**, Java. Course + exam timetabling, student scheduling, room sharing, distributed departmental editing | Closest technical match; heavy |

### 2.2 Buy, adopt, or build

**Don't buy.** These are priced and scoped for institutions with tens of thousands
of students and dedicated scheduling offices. IITD-AD has eleven cohorts and one
person maintaining the workbooks.

**Don't adopt UniTime either, despite it being free.** It is a large Java/Hibernate
application designed for distributed departmental scheduling at a research
university, with an automatic timetabling solver at its centre. We do not have the
problem it solves. Our schedule is *already built* by a person who knows what she
is doing; what fails is everything after that.

**Build a focused tool, and copy 25Live's domain model rather than its software.**
That model is consistent across every serious product in the category:

```
request a space  ->  rules-based approval  ->  real-time conflict detection  ->  publish
```

Four stages. We need all four, at a scale one person can operate.

### 2.3 The one thing worth taking from the standards, not the products

**Emit iCalendar (RFC 5545). Do not implement CalDAV.** A read-only `.ics` feed
over HTTPS gets roughly 95% of interoperability value for a fraction of the work;
CalDAV (RFC 4791 plus RFC 6638 scheduling) is what a full two-way calendar *server*
implements and is enormous overkill for publishing.

**And a finding that changes the design:** Google Calendar refreshes subscribed ICS
feeds every **12 to 24 hours**, is not configurable, has no force-refresh, and
ignores both `REFRESH-INTERVAL` (RFC 7986) and Microsoft's `X-PUBLISHED-TTL`.
Apple Calendar and Thunderbird poll every 5–15 minutes; Outlook web about 3 hours.
Google is both the slowest and the most used.

> **An ICS feed can never be the notification channel.** A room change posted at
> 09:00 does not reach a Google subscriber until the next day. Split the
> responsibilities on day one: the feed is "what's on this month", the web app is
> the source of truth for "is this still on and where", and same-day changes go
> out through a separate push path.

---

## Part 3 — Scope

### 3.1 In scope for v1

1. One authoritative schedule for every cohort, every term.
2. Room booking: request, approve, and see availability.
3. Publishing: web views, per-cohort and per-room, plus ICS feeds.
4. Conflict prevention at write time, not discovery after the fact.
5. Change notification with a human-readable diff.
6. Utilisation reporting.

### 3.2 Explicitly out of scope for v1

- **Student course registration and add/drop.** Real, wanted, and a different
  system. Staged as v3 in Part 10.
- **Automatic timetable generation.** Constraint solvers are the most expensive
  part of every product above and solve a problem the office does not have.
- **Exam scheduling.** Separate cycle, separate constraints.
- **Attendance.** Different system entirely.

Saying no to these in v1 is what makes v1 shippable.

---

## Part 4 — The domain model

### 4.1 Entities

```
Term            2026-27 Sem 1, start/end, no-class days
Building        M1 M2 M3 M4
Room            code (identity), plate name, capacity, kind, building, floor
Course          code (identity), title, L-T-P-C, department
Cohort          24A1CSEBSEM5 -> "Y3 CSE Sem 5", size
Group           a cohort's teaching split: 1, 2, 3, 4, and sub-splits 1A, 2C
Section         a course taught to a cohort in a term, with an instructor
Meeting         a section in a room at a time, for a set of groups
Booking         a non-teaching use of a room, with a requester and a status
Person          staff, faculty, student; role-scoped
```

### 4.2 The rules that make it hold together

**A room's code is its identity. Every name is an attribute.**
`M4-0-019` is the room. "Classroom 5" is what the door says. "Classroom 3" is what
one sheet claims. Both are stored, neither is the key, and the disagreement stays
visible instead of being silently resolved. This single rule retires all six
naming defects in §1.2.

**Nothing references a course except by code.** Not by title, not by short name.
A course legitimately has several names — the official title, the everyday name,
the abbreviation on a timetable pill — and each is a field on one object.

**A meeting names its groups explicitly.** `[]` means the whole cohort. `[1]` means
group 1 only. This is exactly what the workbooks already encode as merged cell
spans, and exactly what the PDF export destroys.

**Every published state is versioned.** A revision has a stamp, an author, and a
diff against its predecessor. "What changed between the 7th and the 8th" must be a
query, not an archaeology exercise.

---

## Part 5 — The five flows

### 5.1 Build a term

The office keeps working in Excel. That is not a compromise, it is correct: the
workbook is where the thinking happens, and forcing a grid editor on someone who is
fluent in Excel buys nothing.

```
1  scheduler uploads the term workbook
2  system reads it: cohorts, meetings, groups from merge spans, the L-T-P-C table
3  system validates BEFORE accepting:
     - every course in the grid appears in the credit table, and vice versa
     - contact hours reconcile against L-T-P-C, per group
     - no end time precedes its start
     - every room code exists
     - no two meetings occupy one room at one time
4  clean       -> staged, with a diff against the current published term
   not clean   -> rejected, with the exact cells listed. Nothing is written.
5  scheduler reviews the diff and publishes
```

Step 3 is the whole value. Both "15:30 to 14:20" errors and the double-booking
would have been refused at upload.

### 5.2 Publish

One publish writes every view at once:

- per-cohort week (web)
- per-room week (web) — *what Priya asked for on 11 September, and does not exist today*
- per-instructor week (web)
- ICS feed per cohort, per room, per instructor
- a PDF export per cohort, byte-for-byte the layout people already know

The PDF export matters politically. It means adopting the system costs nobody
their familiar artefact, and it removes the argument "but we need the PDF".

### 5.3 Book a room

```
requester picks a room and a time
   -> system shows availability live, from the same table teaching uses
   -> submit creates a request in PENDING
   -> routing rule sends it to the approver for that room
   -> approver sees the request beside that room's day
   -> APPROVE writes a booking; the exclusion constraint refuses an overlap
   -> requester is notified; the room's views and feeds update
```

A booking and a class are **the same kind of row**. If they are separate tables,
they will overlap eventually.

But they are **not the same priority**, and draft 1 of this document got that
wrong. Treating them as equals means the exclusion constraint refuses a *publish*
that collides with an approved booking — so a student society's room request can
block the institution from publishing its own timetable. That is obviously the
wrong answer, and it is a policy decision with a technical consequence, so it has
to be stated rather than inherited from whichever row happened to be written
first.

**Precedence, highest first:**

```
1  exam                  fixed by a separate calendar, immovable
2  teaching              the institution's core function
3  maintenance hold      estates has taken the room out of service
4  approved booking      someone was told they had it
5  provisional / hold    not yet promised to anyone
```

Precedence never silently overwrites. It decides *who is asked to move*, not who
is moved without being told.

### 5.4 Change a published schedule

```
edit -> validate -> diff -> publish -> notify
```

The notification is a sentence, not a file:

> *Revision 6, 11 September 14:20. ACOL351's Wednesday tutorial moved from
> M4-0-019 to M4-0-011, same time. One other change: AHUL261's Monday tutorial is
> now 09:00, was 15:30. Nothing else changed.*

The office already writes these by hand in email. Generate them: sets in, sets out,
sets moved.

### 5.5 Report utilisation

The standard measures, which are what management actually asks for:

- **Frequency rate** — share of available hours a room is timetabled
- **Occupancy rate** — expected heads against room capacity while in use
- **Utilisation** — the two multiplied; the headline estate figure
- **Show rate** — expected against actually present, where attendance data exists

\begin{keybox}
\textbf{Occupancy rate is the one that is easy to get wrong, and v1 of this
document did.} It needs expected attendance per \emph{meeting}, not cohort size.
A group-1 tutorial is half a cohort. An elective marked "Applicable if
registered" might be a fifth of it. A shared HUL lecture is two cohorts at once.
Divide room capacity into cohort headcount and every elective and every
group-split tutorial reports as a near-empty room, which is exactly the finding
that would get an estates decision wrong. The \texttt{expected} column on
\texttt{meeting} exists for this and must be populated before any occupancy
figure is published.
\end{keybox}

**Frequency rate needs none of that** and should ship first. It answers "do we
need more rooms" and "which rooms are never used" from the timetable alone, and
both are live questions on a campus this size. Occupancy and utilisation wait
for enrolment data; publishing them early with cohort headcount as a stand-in
would be worse than not publishing them.

---

## Part 6 — How it should look

### 6.1 Principles

**Show state in form, not only in colour.** Provisional, confirmed, cancelled and
pending must each be distinguishable without relying on hue.

**Colour encodes kind, not identity.** Lecture, tutorial, lab, reserved. Colouring
by course produces a rainbow that means nothing at a glance and breaks with more
than about eight courses.

**Never render an unverified value as though it were verified.** If a room name is
disputed across sources, the view says so rather than picking silently.

### 6.2 The views

**Cohort week — horizontal.** Days down the side, time across the top, matching the
orientation of the printed sheet people already know. Group badges on any block
that does not apply to the whole cohort. This is the default landing view.

**Room day — the booking surface.** One room, one day, time across. Existing
teaching in solid blocks, bookings in a lighter fill, free time genuinely empty and
clickable. Dragging across free time opens a request pre-filled.

**Room week grid — the office view.** Rooms down the side, days across, each cell a
compressed bar of what is in it. This is the one that makes a clash visible without
anyone looking for it.

**Availability finder.** "I need a room for 90 minutes on Tuesday afternoon that
seats 40." Returns rooms, ranked by how well the capacity fits, because sending a
seminar of 12 into a 120-seat lecture hall is a real cost.

**Utilisation heatmap.** Rooms against hours, colour by frequency. Dead rooms and
pressure points both become obvious in one screen.

**Mobile.** Single column, and the top of the screen answers one question: what is
next, where, and how long until it starts.

### 6.3 Showing a room, five ways

A room is not one thing on a screen. It is a row in a list, a shape on a plan, a
volume in a building, a sign on a door, and a line on a phone held while walking.
Each answers a different question and they are not substitutes.

**As a row — "what is in it this week".**
The dense view. Room down the side, time across, every booking a bar. This is the
office's working surface and the only one that shows a clash without anyone
looking for it.

**As a shape on a floor plan — "which door".**
The plan of one level, rooms filled by live status: in use, free, free-but-booked-soon,
unbookable. A person who does not know the building does not think in room codes;
they think "the corner one past the stairs". LinkCS already carries redrawn floor
plans for M3 and M4 ground and level 1, with room polygons keyed to codes. This is
the largest existing asset and it is currently attached to nothing.

**As a volume — "which building, which floor".**
The 3D view, already built. Its job is orientation, not detail: a newcomer seeing
M3 and M4 side by side with the busy floors lit. It should never be the primary
booking surface — 3D is worse than a plan for picking a target — but it is the best
answer to "I have never been in this building".

**As a sign on the door — "am I in the right place, now".**
A small always-on display, or at minimum a printed QR, at each teaching room.
Shows the current class, the next one, and the time until the room frees. This is
where the institution's naming problem becomes visible to everyone: the sign and
the door plate must agree, and today across eleven sheets six rooms do not.

**In the hand — "where am I going and can I get there".**
Phone. Room, floor, walking direction from where the person is standing, and the
time budget. This is the view that should know the campus bus runs, because a
09:00 in M3 is a different proposition if the bus arrives at 08:55.

\begin{keybox}
\textbf{Every one of these reads the same occupancy table.} The moment a floor
plan has its own copy of "which rooms are busy", the copies drift, and this whole
document exists because of drift between copies.
\end{keybox}

### 6.4 Status, precisely

Five states, each needing a distinct form and not only a colour:

| State | Means | Form |
|---|---|---|
| Free | Nothing scheduled, bookable now | Empty, outlined, clickable |
| In use | Teaching or an approved booking | Solid fill, with what and until when |
| Reserved soon | Free now, booked within 30 min | Outlined with a countdown |
| Pending | Requested, not yet approved | Hatched |
| Unavailable | Maintenance, exam hold, not bookable | Diagonal grey, no click target |

"Free" must mean *free*, not "nothing on the sheet I happened to read". A room the
system has no data for is **unknown**, not free, and says so. That distinction is
the honest version of the Free Rooms page that exists today.

---

### 6.5 Theming

The institution's own palette, taken from `iitdabudhabi.ac.ae`:

```
Primary        #A41E22    IITD crimson, the dominant brand colour on their site
Deep           #690F12    headers, hover states
Tint           #FCE6E6    selected rows, soft emphasis
Ink            #191919    primary text
Ink secondary  #2C2A2E    headings
Muted          #475569    labels, metadata
Rule           #E2E8F0    borders, grid lines
Ground         #F7F7F7    page background
Surface        #FFFFFF    cards, panels
```

Semantic colours are deliberately **not** crimson, so that "needs attention" never
competes with brand:

```
OK        #2E7D5B
Warning   #B4770F
Critical  #B3261E     (distinct from brand crimson, used only for real errors)
```

**Typography.** Their site uses Inter and Matter. Inter is freely available and
should carry the interface. Matter is a commercial licence — if the institution
holds one, use it for headings; if not, Inter alone is correct and consistent.

A monospaced face for room codes, times and L-T-P-C values. These are data, they
line up in columns, and `M4-0-019` in proportional type is harder to scan.

**Bilingual.** Door plates are Arabic and English. Room labels in the interface
should carry both.

---

---

## Part 7 — The wider system

Beyond v1, in rough order of value per unit of work. Nothing here is required for
the first four phases to be worth doing, and none of it should be built before
the schedule is trustworthy.

### 7.1 Wayfinding

Room code to a route: building, entrance, floor, turn. The floor plans exist and
carry room polygons; the missing piece is a walkable graph — corridors, doors,
stairs, lifts — over the same geometry.

**Step-free routing is not a nice-to-have.** The door plates carry Braille, so the
institution has already committed to physical accessibility; a wayfinding feature
that routes everyone up stairs undoes that commitment digitally.

### 7.2 Door signage

E-paper or small panels outside teaching rooms, driven by the same feed as
everything else. Cheap version first: a printed QR per door linking to that
room's live day. The QR costs nothing, needs no hardware budget, and tests whether
anyone actually wants it before panels are purchased.

### 7.3 Equipment as a bookable attribute

Rooms differ by what is in them — projector, whiteboard, lab benches, power at
every seat, a camera for hybrid teaching. Model equipment as room attributes and
the availability finder answers "a room for 40 with a camera", which is the query
people actually have.

### 7.4 Maintenance and cleaning holds

Estates needs to take a room out of service. Today that is an email. As a `hold`
row it is enforced by the same constraint that stops double-booking, and it
appears in every view automatically.

### 7.5 Events, with RSVP

Club events, talks, workshops. A booking with a public face: capacity, a
registration list, a reminder. The Coding Club's quiz night is a booking, a
capacity, and a list of who is coming; today it is a room request plus a WhatsApp
thread plus a spreadsheet.

### 7.6 Exams and invigilation

A separate cycle with harder constraints: no student in two exams at once,
invigilator ratios, seat spacing that cuts effective capacity. Worth building
only once teaching schedules are stable, and worth building because it is the
single most painful scheduling task in any academic year.

### 7.7 Instructor preferences, collected before the term is built

The office currently discovers constraints by being told them, often late. A
short form before timetabling opens — unavailable slots, preferred rooms,
equipment needed — turns a class of late changes into an input.

**This is the highest-leverage item in this list.** Every late change costs a
revision, a republish, and a room already booked by someone else.

### 7.8 Term-over-term planning

"Show me last year's Sem 1 against this one." Room pressure, course growth,
which rooms were never used. Estates decisions are made on this comparison and
it currently cannot be made at all.

### 7.9 Occupancy sensing

Last, deliberately. Sensors answer "was the booked room actually used", which is
a real question — but only once booking is reliable enough that the answer means
something. Buying sensors before that measures noise.

### 7.10 Integration with the campus bus

The institution already runs a shuttle on a published schedule, and LinkCS
already carries it, verified against the transport office's own workbook. A
student's real question is not "when is my class" but "when do I need to leave".
Joining the two is a small piece of work against data that already exists on both
sides, and no commercial product in Part 2 can do it, because none of them knows
this campus has a bus.

## Part 8 — Failure modes

Parts 5 and 7 describe what happens when things go right. A booking system is
mostly the other case, and every row here is a decision someone has to make before
the code is written.

### 8.1 Publishing over a booking

A scheduler publishes a revision. One of its classes lands on a room at a time
someone already has an approved booking for.

**What must not happen:** the publish fails, and the timetable cannot go out
because of a club meeting. Also must not happen: the booking silently vanishes and
the requester finds out by turning up.

**The flow:**

```
stage the revision
  -> compute evictions: approved bookings the new schedule would displace
  -> if any, the scheduler sees each one: who booked it, what for, when
  -> publish requires explicit acknowledgement of each eviction
  -> inside ONE transaction:
       1. cancel the evicted bookings, with a reason and the revision number
       2. insert the new occupancy rows
     (order matters: the partial index only releases the slot once the
      booking is cancelled, so a reversed order fails on its own constraint)
  -> each evicted requester is notified, with the reason and the three
     nearest alternative rooms at the same time
```

The alternatives matter. "Your booking was cancelled" is an email that generates
a reply; "your booking was cancelled, here are three rooms free at that hour" is
one that does not.

### 8.2 Rolling back a revision that bookings were made against

Between publishing revision 6 and discovering it was wrong, people booked rooms
around it. Rolling back to revision 5 may re-open slots those bookings now sit in,
or may collide with them.

**Rule:** rollback is a publish. It goes through §8.1 identically, including the
eviction report. There is no separate rollback path, because a separate path is a
path with fewer checks.

### 8.3 The approver is unavailable

Requests age silently while someone is on leave. This is the most common way a
booking system quietly stops being used.

- Every room has a **named approver and a named deputy**. Not a role, people.
- A request unanswered for **48 hours** escalates to the deputy and appears on the
  scheduler's dashboard.
- Unanswered after **5 days** it auto-refuses with that reason, so the requester
  gets an answer rather than silence. A refusal can be appealed; an unanswered
  request cannot.

### 8.4 Two people request the same slot at the same moment

Both see it free, both submit. Both requests are valid — pending requests do not
reserve anything, deliberately, because a system where requesting holds a room
gets used to hoard rooms.

The **approval** is what serialises. The first approval writes; the second fails
on the exclusion constraint and the approver is told, in that moment, that the
slot has just gone and which request took it.

### 8.5 The first import, before any room exists

A bootstrap problem draft 1 walked straight past. Validation rule **B3** requires
every room code to exist in the `room` table. The only source of room codes is the
imports. Nothing can ever be imported.

**Resolution:** the first import of a term runs in **discover mode**. Unknown room
codes are collected and presented to an admin as proposals — code, the names the
sheets give it, which cohorts use it — to confirm, merge, or reject. After the
first term, an unknown room code is an error, because by then it means a typo.

### 8.6 A booking beyond the end of term

Recurring bookings must be clamped to the term, or a society books a weekly slot
that silently extends into a term whose timetable does not exist yet.

Rule: a recurring booking's `until_date` cannot exceed the term end. Wanting next
term means asking again once next term is published, which is also when the room
situation is actually known.

### 8.7 Time, stated explicitly rather than got away with

**Asia/Dubai does not observe daylight saving.** That is why a naive
implementation would work here and break the moment anyone reuses it. Store local
time with an explicit `tz`, and derive UTC instants; never store bare UTC and
reconstruct local. If the term shifts, the *local* time is what was meant.

Related: the sheets print `12:00-14:00` as a lunch band and a few blocks run past
19:00. The teaching day is not 08:00–18:00 and validation rule B2 must not assume
it is.

### 8.8 Concurrent edits to one meeting

Two schedulers open the same meeting. Last write wins is wrong; it loses an edit
silently.

Every meeting carries a version. A save sends the version it was loaded at, and a
stale version is refused with a diff of what changed underneath. This is
cheap and it is the difference between "someone else changed this, here is what
they did" and a half-applied timetable.

### 8.9 The import parses but is wrong

Every validation rule in Appendix D passes and the schedule is still wrong,
because the workbook itself was wrong.

There is no technical answer to this. What the system owes is **traceability**:
every meeting records the revision, the source file, and its hash. "Where did this
Wednesday 15:30 come from" is answerable in one query, which is what turns an
argument into a lookup.

### 8.10 Nobody uses it

The realistic failure. The office keeps using email because the new thing is one
more place to check.

The mitigations are product decisions, not technical ones, and they are why the
phasing in Part 9 is ordered the way it is:

- Phase 0 gives the office something it asked for (the room-wise view) before
  asking it to change anything.
- The PDF export means adoption costs nobody their familiar artefact.
- Full Excel export at any time means the institution is never trapped.
- Approvals arrive by email with approve and refuse links in the message, so an
  approver never has to visit the system to use it.

---

## Part 9 — Architecture

### 7.1 Stack

```
Database    PostgreSQL
Backend     one application server; Python/FastAPI or Node/Fastify
Frontend    server-rendered pages plus light client JS
Auth        institutional SSO (Microsoft 365; campus already runs
            Outlook and Teams)
Hosting     on campus, on institution-owned infrastructure
```

Postgres is not interchangeable here. The core guarantee is a database constraint
only it provides.

### 7.2 The constraint that does the real work

```sql
CREATE EXTENSION btree_gist;

CREATE TABLE occupancy (
  id        bigserial PRIMARY KEY,
  room_id   text        NOT NULL REFERENCES room(code),
  during    tstzrange   NOT NULL,
  kind      text        NOT NULL,        -- 'class' | 'booking' | 'hold'
  status    text        NOT NULL DEFAULT 'confirmed',
  EXCLUDE USING gist (room_id WITH =, during WITH &&)
    WHERE (status <> 'cancelled')
);
```

Two requests arriving in the same millisecond both pass an application-level
check; the constraint refuses the second row. This is the difference between
"we try not to double-book" and "we cannot double-book". Making it **partial**
(`WHERE status <> 'cancelled'`) matters, or cancelled events hold their slots
forever.

### Pieces the failure modes require

Part 8 added three moving parts the draft-1 architecture did not have. Naming them
matters, because each is a thing that can be down.

**A job runner.** Escalation at 48 hours, auto-refuse at five days, nightly feed
regeneration, backup. One scheduled worker, not a queue cluster — but something has
to run on a timer, and "a cron entry calling a management command" is a legitimate
answer at this scale as long as it is *written down* rather than discovered later.

**A mail path.** Approvals, eviction notices, escalations. Sent through the
institution's own mail, not a third-party service — these carry student names and
room bookings, and routing them via an external provider is a data question nobody
asked for. **Approve and refuse links go in the message body**, so an approver
never has to visit the system to use it (§8.10).

**Observability, at the level this actually needs.** Not a dashboard stack. Three
things: a health endpoint that checks the database, a log of every publish and
every approval, and one alert — *the job runner has not run in 24 hours*. That
single alert catches escalations silently stopping, which is the failure that
would otherwise be discovered by a complaint.

### Hosting, said plainly

One virtual machine on institution infrastructure, with Postgres on the same host.
At eleven cohorts and about three hundred meetings, that is ample, and pretending
otherwise would be architecture theatre.

**The consequence, stated rather than hidden:** one machine means one point of
failure. If it is down, nobody can book or publish. Published views should be
servable from static snapshots regenerated on each publish, so an outage degrades
to "you cannot change anything" instead of "nobody can see their timetable" —
which is the difference between an inconvenience and an incident.

**Someone must patch it.** That is part of Part 11's ownership question and not a
separate one.

### Data, retention, and what the system knows about people

The system holds: names and institutional email for staff and faculty; cohort
membership for students; and who booked which room for what. That last one is a
record of people's movements, and should be treated as such.

- Booking history is retained for the academic year, then reduced to
  counts for utilisation reporting with the requester removed.
- The audit log is retained for two years, because it exists to answer "who
  changed this" and a one-term window makes it useless.
- No student is individually identifiable in any published view.
- Full export belongs to the institution at any time.

Worth confirming against whatever policy the institution already has, rather than
inventing one here.

### 7.3 Roles

```
Viewer      public. Published schedules, room availability. No login.
Student     their own cohort surfaced first; subscribe to feeds.
Faculty     their own teaching; request rooms.
Approver    approve or refuse requests for rooms they own.
Scheduler   upload a term, edit meetings, publish revisions.
Admin       rooms, users, terms, approval routing.
```

### 7.4 Operational requirements

- Every write is attributed and timestamped. "Who moved this and when" must always
  have an answer.
- Nightly database backup, restore tested at least once before go-live.
- Read-only mode that keeps published views serving if the admin side is down.
- Full export to Excel at any time. **The institution must never be locked into
  this tool**, and saying so in writing is what makes it adoptable.

---

## Part 10 — Rollout

Each phase is independently useful. If the project stops after any one of them,
what was delivered still stands on its own.

\begin{keybox}
\textbf{These estimates are revised upward from draft 1}, because drafts 2 and 3
found work that was not in the plan: the pattern/occurrence split, room discovery
mode, shared sections, and the whole of Part 8. An estimate that does not move
when the design moves is not an estimate.
\end{keybox}

### Phase 0 — Publish what already exists (3 weeks, was 2)

Read-only. Import the current workbooks, publish cohort views, room views, and ICS
feeds. No booking, no editing, no login.

Now also includes, from later drafts: the `meeting` / `occupancy` split and its
transactional regeneration (§Appendix C), **room discovery mode** so the first
import is possible at all (§8.5), and `section_shares` so co-taught classes do not
read as clashes (248 cohort entries are 161 bookings).

*Delivers:* the room-wise schedule the office has already asked for; one URL that
is always current; the end of the eleven-stale-PDFs problem.
*Risk:* near zero. Nothing is written, nothing is replaced.

### Phase 1 — Upload with validation (3 weeks)

The scheduler uploads a workbook; the system validates, shows a diff, publishes on
approval. SSO and roles land here.

*Delivers:* the class of errors in §1.2 becomes impossible to publish.
*Also lands here:* version-checked concurrent edits (§8.8), and traceability from
every meeting back to its source file and hash (§8.9).

### Phase 2 — Room booking (6 weeks, was 4)

Requests, approval routing, the availability finder, the exclusion constraint.

**The increase is Part 8, and it is not padding.** Precedence and eviction with
acknowledgement (§8.1), deputies and 48-hour escalation (§8.3), auto-refuse at
five days, recurring bookings clamped to term end (§8.6), and the first background
job runner — which nothing before this phase needed.

*Delivers:* booking stops being an email thread.
*This is the phase where the institution starts depending on the system*, which is
why Part 11's ownership question must be answered before it starts, not after.

### Phase 3 — Change notification (2 weeks)

Generated diff paragraphs, email and web push to affected cohorts. Separate from
the ICS path, for the reason in §2.3.

### Phase 4 — Utilisation reporting (2 weeks, frequency only)

Frequency rate ships here. **Occupancy and utilisation do not**, because they need
real enrolment per meeting and publishing them on cohort headcount would report
every elective and every split tutorial as a near-empty room (§5.5).

### Phase 5 — Course pages and add/drop (a term of work, decided separately)

Only once the schedule is trustworthy. The standard pattern is well established:
a **shopping cart** students fill before registration opens, a **validation** pass
checking prerequisites, credit limits, time conflicts and consent, then enrolment
with **waitlists** where a section is full. This needs a decision about whether it
integrates with the existing ERP or replaces part of it, which is Part 11.

---

## Part 11 — Decisions management must make

These block design, not implementation. Each needs an owner and an answer.

**1. Where does it run, and who owns it after I graduate?**
The requirement is campus-local, which rules out the public cloud. It needs a
maintainer named before go-live. A system nobody can maintain in two years is
worse than the spreadsheet.

**2. Does it become the system of record?**
If the office keeps editing workbooks and the system imports them, it is a
publisher and the workbook stays authoritative. If the office edits in the system,
it is the record and the workbook becomes an export. Phase 0 and 1 work either way;
Phase 2 onward assumes the second.

**3. Who approves a booking, per room, and who deputises?**
Approval routing is a policy question, not a technical one, and it cannot be
guessed. Every room needs a named approver *and* a named deputy, or requests rot
whenever someone takes leave (§8.3).

**3b. Does teaching evict an approved booking?**
The precedence order in §5.3 says yes, with acknowledgement and notification.
The alternative is that a society booking can block the timetable being published.
Management should confirm this explicitly, because the first time it happens
someone will be unhappy and the answer needs to have been decided in advance
rather than in the moment.

**3c. May students request rooms?**
The permission exists and is switched off in v1 (Appendix I). Turning it on is a
policy call about who may commit institutional space.

**4. What integrates?**
Blackboard, the ERP, Outlook room resources. Each is a separate piece of work and
none is required for Phase 0 to 3.

**5. Who may see what?**
Are schedules public, campus-only, or role-scoped? This determines whether Phase 0
needs authentication at all.

**6. Data ownership and exit.**
The institution owns the data and can export it in full at any time. Worth stating
explicitly in the proposal rather than leaving implied.

---

## Part 12 — What is already built

Not a greenfield proposal. Working today, in `github.com/EchoRover/links`:

- A reader that pulls every cohort's schedule out of the office workbooks, taking
  group membership from merged cell spans. Verified **exact** against a
  hand-checked week on day, time, course, room, kind and group.
- A reader for the published PDFs, for the case where only a PDF exists, that
  refuses rather than guesses when a file is not machine-readable.
- The room-wise pivot in §5.2, which found the defects in §1.2.
- A live student-facing site (`linkcs.vercel.app`) carrying the Sem 5 timetable,
  free-room finder, campus bus times and a wall-display board.

Phase 0 is largely a matter of connecting what exists to a database and a URL.

---

## Appendix A — Sources

- CollegeNET 25Live — `collegenet.com/scheduling/25live`
- UniTime, Apereo Foundation — `apereo.org/programs/software/unitime`, `github.com/UniTime/unitime`
- RFC 5545 iCalendar · RFC 4791 CalDAV · RFC 6638 CalDAV scheduling · RFC 7986 `REFRESH-INTERVAL`
- RFC 8984 JSCalendar, and `draft-ietf-calext-jscalendar-icalendar` — the two formats are expected to coexist; emit iCalendar
- Registration UX patterns: Johns Hopkins SIS, Michigan State SIS, Case Western SIS, Tufts SIS public documentation
- Space utilisation measures: standard HE frequency/occupancy/utilisation definitions
- Brand values read from `iitdabudhabi.ac.ae/assets/css/new-style.css`

## Appendix B — Reproducing the findings

```
python3 tools/read_xlsx.py                 every cohort, from the workbooks
python3 tools/room_schedule.py             the room pivot, clashes, naming conflicts
python3 tools/parse_sheet.py --all         the published PDFs
python3 tools/review.py                    a parse, laid out like the sheet
```

\newpage

# Technical appendices

Everything below is implementation detail. Part 1 to 10 can be read without it.

## Appendix C — Schema

Postgres. Written out because the constraints are the design, not an afterthought.

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------- estate ----------

CREATE TABLE building (
  code        text PRIMARY KEY,              -- 'M4'
  name        text NOT NULL,
  name_ar     text
);

CREATE TABLE room (
  code        text PRIMARY KEY,              -- 'M4-0-019'. THE identity.
  deputy_id   bigint REFERENCES person(id),  -- so a request cannot rot on leave
  building    text NOT NULL REFERENCES building(code),
  floor       text NOT NULL,                 -- 'G', '1F'
  plate_en    text,                          -- what the door says
  plate_ar    text,
  capacity    integer,
  kind        text NOT NULL                  -- classroom | lab | hall | seminar
                CHECK (kind IN ('classroom','lab','hall','seminar','other')),
  bookable    boolean NOT NULL DEFAULT true,
  approver_id bigint REFERENCES person(id),
  plate_photo text,                          -- evidence beats every document
  verified_on date
);

-- A name a SOURCE claims for a room. Kept so disagreements stay visible
-- instead of one source silently winning.
CREATE TABLE room_name_claim (
  room_code   text NOT NULL REFERENCES room(code),
  source      text NOT NULL,        -- '24A1CSEBSEM5', 'door plate'
  claimed     text NOT NULL,
  seen_on     date NOT NULL,
  PRIMARY KEY (room_code, source, claimed)
);

-- ---------- calendar ----------

CREATE TABLE term (
  id          text PRIMARY KEY,              -- '2026-27-sem1'
  label       text NOT NULL,
  starts      date NOT NULL,
  ends        date NOT NULL,
  CHECK (ends > starts)
);

CREATE TABLE no_class_day (
  term_id     text NOT NULL REFERENCES term(id),
  day         date NOT NULL,
  reason      text NOT NULL,
  PRIMARY KEY (term_id, day)
);

-- ---------- curriculum ----------

CREATE TABLE course (
  code        text PRIMARY KEY,              -- 'ACOL351'
  title       text NOT NULL,                 -- official, off the sheet
  short       text,                          -- what a pill shows
  dept        text,
  l           integer NOT NULL DEFAULT 0,    -- L-T-P-C, stored apart so it
  t           integer NOT NULL DEFAULT 0,    -- can be reconciled against
  p           integer NOT NULL DEFAULT 0,    -- scheduled minutes
  credits     numeric(4,2) NOT NULL DEFAULT 0
);

CREATE TABLE cohort (
  code        text PRIMARY KEY,              -- '24A1CSEBSEM5'
  label       text NOT NULL,                 -- 'Y3 CSE Sem 5'
  term_id     text NOT NULL REFERENCES term(id),
  headcount   integer,
  n_groups    integer NOT NULL DEFAULT 2     -- Year 1 runs four
);

CREATE TABLE section (
  id          bigserial PRIMARY KEY,
  term_id     text NOT NULL REFERENCES term(id),
  course_code text NOT NULL REFERENCES course(code),
  cohort_code text NOT NULL REFERENCES cohort(code),
  instructor  bigint REFERENCES person(id),

  -- Not every course is taken by the whole cohort. The sheets print
  -- "Applicable if registered" on electives, and a v1 model that assumes
  -- cohort size = attendance produces utilisation figures that are simply
  -- wrong for every elective in the estate.
  enrolment   text NOT NULL DEFAULT 'whole-cohort'
                CHECK (enrolment IN ('whole-cohort','elective','shared')),
  registered  integer,          -- actual heads, once registration freezes
  UNIQUE (term_id, course_code, cohort_code)
);

-- A course taught once to several cohorts at the same hour in the same room.
-- AHUL256, AHUL261 and AGRL130 are each taught to Y3 CSE and Y3 EEN together,
-- and most of Year 1 is shared across all four branches. Without this, a room
-- pivot reports every shared class as a clash: 248 cohort entries in the
-- current term are 161 real bookings.
CREATE TABLE section_shares (
  section_id  bigint NOT NULL REFERENCES section(id),
  cohort_code text   NOT NULL REFERENCES cohort(code),
  groups      int[]  NOT NULL DEFAULT '{}',
  PRIMARY KEY (section_id, cohort_code)
);

-- ---------- pattern and occurrence ----------
-- A weekly class is ONE editable fact ("Wednesdays 15:30, M4-0-019, from
-- 20 Aug to 16 Dec") and SIXTEEN things that occupy a room. Store only the
-- first and the exclusion constraint cannot see overlaps. Store only the
-- second and moving a class means rewriting sixteen rows and losing the fact
-- that they were ever one thing.
--
-- So: both. `meeting` is the editable truth and what the interface edits.
-- `occupancy` is the materialised enforcement surface, regenerated inside the
-- same transaction whenever its meeting changes. This is the RFC 5545 model
-- (RRULE + EXDATE + modified instances) with the expansion persisted so the
-- database can police it.

CREATE TABLE meeting (
  id          bigserial PRIMARY KEY,
  revision_id bigint NOT NULL REFERENCES revision(id),
  section_id  bigint REFERENCES section(id),
  booking_id  bigint REFERENCES booking(id),
  room_code   text NOT NULL REFERENCES room(code),
  weekday     integer NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  starts      time NOT NULL,
  ends        time NOT NULL,
  tz          text NOT NULL DEFAULT 'Asia/Dubai',   -- never store bare UTC
  from_date   date NOT NULL,
  until_date  date NOT NULL,
  kind        text NOT NULL,
  groups      int[] NOT NULL DEFAULT '{}',          -- {} = whole cohort
  expected    integer,                              -- heads, for utilisation
  CHECK (ends > starts),
  CHECK (until_date >= from_date),
  CHECK (num_nonnulls(section_id, booking_id) = 1)
);

-- One instance. Generated from a meeting, then editable in its own right so a
-- single week can move or be cancelled without touching the pattern - which is
-- exactly what a room change for one session is.
CREATE TABLE occupancy (
  id          bigserial PRIMARY KEY,
  meeting_id  bigint  NOT NULL REFERENCES meeting(id) ON DELETE CASCADE,
  room_code   text    NOT NULL REFERENCES room(code),
  during      tstzrange NOT NULL,
  kind        text    NOT NULL
                CHECK (kind IN ('lecture','tut','lab','proj','help',
                                'booking','hold','exam','maintenance')),
  status      text    NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed','provisional','cancelled')),
  detached    boolean NOT NULL DEFAULT false,   -- edited away from its pattern
  precedence  smallint NOT NULL,               -- 1 exam .. 5 provisional; see 5.3
  note        text,

  CHECK (upper(during) > lower(during)),

  EXCLUDE USING gist (room_code WITH =, during WITH &&)
    WHERE (status <> 'cancelled')
);

-- Pending requests deliberately reserve NOTHING, so they are not in occupancy.
-- A system where asking holds a room gets used to hoard rooms.

CREATE INDEX ON occupancy USING gist (during);
CREATE INDEX ON occupancy (meeting_id);
CREATE INDEX ON meeting (revision_id);
CREATE INDEX ON meeting (section_id);

-- ---------- bookings ----------

CREATE TABLE booking (
  id           bigserial PRIMARY KEY,
  requester_id bigint NOT NULL REFERENCES person(id),
  purpose      text   NOT NULL,
  attendees    integer,
  status       text   NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','refused',
                                  'withdrawn','cancelled')),
  decided_by   bigint REFERENCES person(id),
  decided_at   timestamptz,
  reason       text,                          -- required on refusal
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ---------- versioning ----------

CREATE TABLE revision (
  id          bigserial PRIMARY KEY,
  term_id     text NOT NULL REFERENCES term(id),
  n           integer NOT NULL,               -- 1, 2, 3...
  source      text,                           -- uploaded filename
  source_hash text,                           -- sha256 of the workbook
  stamp       text,                           -- the sheet's own footer stamp
  author_id   bigint NOT NULL REFERENCES person(id),
  published_at timestamptz,
  summary     text,                           -- the generated diff paragraph
  UNIQUE (term_id, n)
);

CREATE TABLE person (
  id          bigserial PRIMARY KEY,
  sso_subject text UNIQUE NOT NULL,           -- from institutional SSO
  name        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL
                CHECK (role IN ('student','faculty','approver','scheduler','admin')),
  cohort_code text REFERENCES cohort(code),
  active      boolean NOT NULL DEFAULT true
);

CREATE TABLE audit (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    bigint REFERENCES person(id),
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text NOT NULL,
  before      jsonb,
  after       jsonb
);
```

\begin{keybox}
\textbf{Regenerating occurrences is not a background job.} A meeting edit
deletes and re-inserts its occurrences \emph{inside the same transaction}, so
the exclusion constraint refuses the edit if any generated instance would
collide. Do it asynchronously and there is a window where the database holds a
double-booking. The one exception is an occurrence marked
\texttt{detached}: it was deliberately moved away from its pattern and
regeneration must leave it alone.
\end{keybox}

\begin{keybox}
\textbf{Why \texttt{meeting} carries \texttt{revision\_id}.} Publishing a revision
writes a new set of rows rather than mutating the old ones. "What did the timetable
say on 8 September" is then a query, and a bad publish is reverted by pointing the
term at the previous revision rather than by restoring a backup.
\end{keybox}

## Appendix D — The validation catalogue

Every rule an upload must pass. The numbering is the error code the interface shows.

### Structural (the file itself)

| Code | Rule | Caught in the real data? |
|---|---|---|
| S1 | Every sheet has a recognisable day column | — |
| S2 | Every day band has group labels in column B | — |
| S3 | A parsed sheet yields more than zero blocks | **Yes.** Both MTech sheets yielded zero and an earlier checker called that "ok" |
| S4 | The workbook carries a term the system knows | — |

### Per block

| Code | Rule | Caught? |
|---|---|---|
| B1 | End time is strictly after start time | **Yes.** Y1 ELE and Y1 EEN: "15:30 to 14:20" |
| B2 | Times fall inside the institution's teaching day (07:00–21:00) | — |
| B3 | Room code parses and exists in `room` | — |
| B4 | Course code exists in `course` | — |
| B5 | The block's groups are a subset of its cohort's groups | — |
| B6 | Duration is a plausible multiple (50 / 80 / 110 / 170 min) | — |

### Cross-block

| Code | Rule | Caught? |
|---|---|---|
| X1 | No room holds two different courses at overlapping times | **Yes.** Wed 17:00, `M4-0-019` |
| X2 | No cohort-group is in two places at once | — |
| X3 | No instructor is in two places at once | — |
| X4 | A course taught to several cohorts at one time and place is ONE entry | **Yes.** 248 cohort entries collapse to 161 bookings; without this, 87 false clashes |

### Curriculum

| Code | Rule | Caught? |
|---|---|---|
| C1 | Every course on the grid appears in the L-T-P-C table | — |
| C2 | Every course in the L-T-P-C table appears on the grid | — |
| C3 | Scheduled contact hours reconcile against L-T-P-C, **per group** | **Yes.** This is what proves group membership |
| C4 | Declared exceptions are listed, not inferred | `ACOD310` is 0-0-6-3 with one slot reserved |
| C5 | Non-contact blocks are excluded from C3 | **Yes.** "Help Session if required" broke the reconciliation until excluded |

### Naming

| Code | Rule | Caught? |
|---|---|---|
| N1 | A room code maps to one plate name across all sheets | **Yes. Six rooms fail this** |
| N2 | A plate name maps to one room code | **Yes.** "Classroom 8" is both `M4-0-019` and `M4-1-011` |
| N3 | Where a photographed plate exists, it wins, and disagreement is reported | **Yes.** Y1 CHE calls `M4-0-011` "Lecture Hall"; the plate says Classroom 3 |

\begin{keybox}
\textbf{Severity matters.} S and B failures \emph{reject} the upload. X and C
failures reject unless the scheduler explicitly acknowledges each one, because a
genuine timetable can carry a deliberate overlap. N failures are \emph{warnings}
that publish: a naming disagreement should be visible, not blocking.
\end{keybox}

## Appendix E — API surface

REST, JSON, thin. Public reads need no auth; everything else is SSO-gated.

### Public reads

```
GET  /api/terms                             the terms, current first
GET  /api/cohorts                           every cohort, with labels
GET  /api/cohorts/{code}/week?revision=     meetings, grouped by day
GET  /api/rooms                             every room, plate names, capacity
GET  /api/rooms/{code}/week?from=           occupancy for a room
GET  /api/rooms/free?day=&from=&to=&seats=  the availability finder
GET  /api/instructors/{id}/week
GET  /ics/cohort/{code}.ics                 RFC 5545 feed
GET  /ics/room/{code}.ics
GET  /ics/instructor/{id}.ics
GET  /api/revisions?term=                   revision history with diff summaries
GET  /api/revisions/{n}/diff                sets in, out, moved
```

### Authenticated

```
POST /api/bookings                          create a request
     {room_code, during, purpose, attendees}
GET  /api/bookings?status=&mine=
POST /api/bookings/{id}/approve
POST /api/bookings/{id}/refuse              {reason}  -- required
POST /api/bookings/{id}/withdraw

POST /api/terms/{id}/uploads                multipart, the workbook
     -> 202 {upload_id}
GET  /api/uploads/{id}                      {status, findings[], diff}
POST /api/uploads/{id}/publish              {acknowledge: [...]}

GET  /api/reports/utilisation?term=&from=&to=
GET  /api/reports/naming-conflicts
GET  /api/export/term/{id}.xlsx             full export, any time
```

### Response shape, `/api/cohorts/{code}/week`

```json
{
  "cohort": {"code": "24A1CSEBSEM5", "label": "Y3 CSE Sem 5", "n_groups": 2},
  "term":   {"id": "2026-27-sem1", "starts": "2026-08-20", "ends": "2026-12-16"},
  "revision": {"n": 6, "published_at": "2026-09-08T09:30:00Z",
               "stamp": "8th September 2026 - 1:30pm"},
  "meetings": [
    {"day": "Wednesday", "start": "15:30", "end": "16:20",
     "course": {"code": "ACOL351", "short": "Algos"},
     "room": {"code": "M4-0-019", "plate": "Classroom 5",
              "plate_disputed": true, "also_called": ["Classroom 3", "Classroom 8"]},
     "kind": "tut", "groups": [], "status": "confirmed"}
  ]
}
```

`plate_disputed` is not decoration. It is the interface's licence to show the
reader that the documents disagree, instead of picking one and being confidently
wrong.

## Appendix F — State machines

### Booking

```
                 withdraw
        ┌─────────────────────────┐
        v                         │
   [pending] ──approve──> [approved] ──cancel──> [cancelled]
        │                    │
        └───refuse──> [refused]
```

- `approve` writes an `occupancy` row inside the same transaction. If the
  exclusion constraint fires, the approval fails and the approver is told which
  booking holds the slot.
- `refuse` requires a reason. A refusal with no reason generates a follow-up email
  to the approver anyway, so the field may as well be mandatory.
- `cancelled` keeps the row. The slot is released by the partial index, and the
  history survives.

### Revision

```
[uploading] ──parse ok──────> [validating]
     │                              │
     └──parse failed──> [rejected] <┘  (findings unacknowledged)
                                    │
                    clean or acknowledged
                                    │
                                    v
                               [staged] ──publish──> [published]
                                                          │
                                                     superseded
                                                          │
                                                          v
                                                     [archived]
```

Only one revision per term is `published`. Rolling back is publishing an older
revision, which creates a new revision row recording that it happened.

## Appendix G — Screen specifications

### G1 — Cohort week (the landing view)

- **Layout.** Days as rows, time 08:00–19:00 across. Matches the printed sheet's
  orientation, which is the artefact everyone already reads.
- **Block.** Course code in mono at 11px; kind badge; group badge only when the
  block does not apply to the whole cohort; room plate; time. When a block is
  narrow, the badges survive and the room is what truncates — the badges are what
  the reader is checking.
- **Overlap.** Blocks that overlap stack into lanes. Nothing is ever hidden behind
  anything else.
- **State.** `provisional` draws a dashed outline plus a marker; colour alone never
  carries it.
- **Now.** A hairline at the current time on today's row, and only on today's row.
- **Empty.** A term with no published revision says so and links to the upload
  screen if the viewer is a scheduler. It never renders an empty grid.

### G2 — Room day (the booking surface)

- One room, one day, time across the full width.
- Teaching in solid fill, approved bookings in a lighter fill of the same hue,
  pending requests hatched.
- Free time is genuinely empty and is the click target. Drag across it to open a
  request with times pre-filled.
- A right rail shows the room: plate name, capacity, kind, approver, and — if the
  plate is disputed — every name the documents give it.

### G3 — Room week grid (the office view)

- Rooms down the side, weekdays across, each cell a compressed strip.
- This is the screen where a clash is visible without anyone searching for one.
- Sort by building, then floor, then code. Not alphabetically: physical adjacency
  is what the reader is thinking about.

### G4 — Availability finder

```
I need a room   [ 90 ] minutes   on [ Tuesday ]   after [ 14:00 ]
for [ 40 ] people   in [ any building ▾ ]         [ Find ]
```

Results ranked by **capacity fit**, closest first, not alphabetically. Putting a
seminar of twelve into a 120-seat lecture hall is a real cost, and a list sorted
by room code invites exactly that.

### G5 — Utilisation

- Rooms against hours, cell colour by frequency rate.
- A sequential ramp, not a rainbow. Dark equals busy.
- Below it, the three headline numbers per building: frequency, occupancy,
  utilisation.
- A "never used" list, which is the finding management acts on.

### G6 — Mobile

Single column. The top of the screen answers one question: **what is next, where,
and how long until it starts.** Everything else is below the fold and that is
correct — the phone case is a person walking between buildings.

## Appendix H — Emitting iCalendar

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//IITD Abu Dhabi//One Timetable//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Y3 CSE Sem 5
REFRESH-INTERVAL;VALUE=DURATION:PT1H
X-PUBLISHED-TTL:PT1H
BEGIN:VEVENT
UID:meet-8842@timetable.iitdabudhabi.ac.ae
DTSTAMP:20260908T093000Z
DTSTART;TZID=Asia/Dubai:20260909T153000
DTEND;TZID=Asia/Dubai:20260909T162000
RRULE:FREQ=WEEKLY;BYDAY=WE;UNTIL=20261216T235900Z
EXDATE;TZID=Asia/Dubai:20261028T153000
SUMMARY:ACOL351 Tutorial
LOCATION:M4-0-019 (Classroom 5)
DESCRIPTION:Analysis and Design of Algorithms\nTutorial\nAll groups
CATEGORIES:TUTORIAL
SEQUENCE:3
END:VEVENT
END:VCALENDAR
```

Points that are easy to get wrong:

- **`UID` is stable for the life of the meeting.** Regenerating it on every publish
  makes every subscriber's calendar duplicate the entire term.
- **`SEQUENCE` increments on change**, so clients update rather than duplicate.
- **Store local time with `TZID`, never bare UTC.** `15:30 Asia/Dubai` and its UTC
  instant are different facts, and if the term shifts the local time is what was
  meant. This is the specific mistake JSCalendar (RFC 8984) was designed to fix.
- **No-class days become `EXDATE`**, not deleted occurrences.
- **Set `REFRESH-INTERVAL` and `X-PUBLISHED-TTL` anyway.** They cost nothing and
  the clients that honour them are the ones that poll fast. Google ignores both.

## Appendix I — Permissions

| Action | Viewer | Student | Faculty | Approver | Scheduler | Admin |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| See published schedules | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} |
| Subscribe to a feed | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} |
| See room availability | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} |
| Request a room | | | \textbullet{} | \textbullet{} | \textbullet{} | \textbullet{} |
| See who requested | | | | \textbullet{} | \textbullet{} | \textbullet{} |
| Approve or refuse | | | | \textbullet{}¹ | \textbullet{} | \textbullet{} |
| Upload a term | | | | | \textbullet{} | \textbullet{} |
| Publish a revision | | | | | \textbullet{} | \textbullet{} |
| Roll back a revision | | | | | | \textbullet{} |
| Edit rooms and people | | | | | | \textbullet{} |
| Read the audit log | | | | | \textbullet{} | \textbullet{} |

\* Only for rooms where they are the named approver.

Students cannot request rooms in v1. That is a policy question for Part 11, not a
technical limit — the row exists, the permission is simply off.

## Appendix J — Testing

Scale here is tiny: eleven cohorts, about 300 meetings, nineteen rooms. **Load is
not the risk. Correctness is.** The test effort goes almost entirely into the
validator and the importer.

**Golden-file tests.** The Sem 5 CSE week is hand-verified against the sheet and
against its own credit table. It is the fixture: import it, assert 23 meetings
exactly, on day, time, course, room, kind and group. Any importer change that
breaks it is wrong.

**Property tests.** For any generated set of meetings, publishing then exporting
then re-importing returns the same set. Round-tripping is where importers rot.

**Constraint tests.** Two concurrent approvals for the same slot: exactly one
succeeds. Run it against a real Postgres, not a mock — the guarantee is the
database's, so a mock tests nothing.

**Regression corpus.** Every defective sheet found this week becomes a fixture:
the "15:30 to 14:20" file, the zero-block MTech sheets, the `M4-0-019` clash, the
"Classroom 8" mislabel. Each asserts the specific code from Appendix D.

**What not to test.** Rendering. Screenshot tests on a timetable grid are famously
brittle and catch almost nothing that matters here.

## Appendix K — Effort

Assuming one developer, part-time alongside coursework. Ranges, not promises.

| Phase | Work | Estimate |
|---|---|---|
| 0 | Schema, importer, discover mode, public read views, ICS | 3 weeks |
| 1 | SSO, roles, upload with validation, diff, publish, versioned edits | 3 weeks |
| 2 | Bookings, precedence and eviction, deputies, escalation, job runner | 6 weeks |
| 3 | Change notification, generated diff paragraphs, mail path | 2 weeks |
| 4 | Frequency-rate reporting (occupancy needs enrolment) | 2 weeks |
| 5 | Course pages, add/drop | a term, scoped separately |

**Sixteen weeks to a system that publishes, validates and books**, at part-time
pace. Drafts 2 and 3 moved this up from thirteen, and the increase is Part 8 —
the failure modes that were missing from the first plan, not scope that was added
to it.

**Phase 0 is short because much of it exists.** The importer that reads the
office workbooks — including group membership from merged cell spans — is written
and verified. The room pivot is written. A student-facing site carrying the Sem 5
timetable, a free-room finder and a wall-display board is live.

**The honest risk is not the code.** It is Part 11, question 1: who owns this after
I graduate. Every estimate above assumes that gets answered before Phase 2, because
Phase 2 is where the institution starts depending on it.
