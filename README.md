# ResumeLens AI

AI resume analyser — paste a resume and a job description, get an ATS-style
match score, matched vs missing skills, section-by-section feedback, and
concrete rewrite suggestions. Includes a downloadable improved-skills
checklist and two built-in sample pairs so it works instantly.

**Live demo:** run it locally (see below) — no account, no API key.

## What it does

1. **ATS match score (0–100)** with a weighted breakdown:
   - Skill match — 40%
   - Wording overlap (TF cosine similarity) — 25%
   - Sections present — 15%
   - Length — 10%
   - Impact language (action verbs + quantified results) — 10%
2. **Matched vs missing skills** — skills from the job description that are
   (and are not) in the resume, with counts.
3. **Section-by-section feedback** — contact, summary, skills, experience,
   education, projects: found or missing.
4. **Concrete rewrite suggestions** — one per missing skill / missing
   section / length / impact gap, with a priority.
5. **Downloadable checklist** — `resumelens-checklist.md` with the exact
   next steps for this resume.

## AI honesty note

**This is on-device, rule-based AI — no external API, no key needed.**
The analysis is real text analysis, implemented in `server/analyze.js`:
tokenisation, stop-word removal, skill-keyword extraction from a curated
skills list, TF cosine similarity between resume and job description,
heading-based section detection, readability / length checks, and
action-verb + quantified-result detection.

It does **not** call GPT, OpenAI, or any ATS vendor, and it does not claim
their accuracy. The score is a guide for tailoring a resume, not a
guarantee of shortlisting. The same note is shown in the UI.

## UI — Apple Light System

The interface follows the Apple Light System reference
(`apple.com-design.md`): primary `#0071e3`, secondary `#2997ff`,
tertiary `#0066cc`, neutral `#f5f5f7`, surface `#ffffff`,
on-surface `#1d1d1f`, error `#d92d20`, border `#e5e7eb`. SF Pro
Display/Text with system fallbacks, large headlines, 17px body at
1.47 line-height, pill buttons (9999px, 44px high), white cards with a
1px border and 4–8px radius, no heavy shadows, no gradients — clean,
airy, professional.

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript (`src/`)
- **Backend:** Node.js + Express (`server/`), REST API
- **Analysis:** local, rule-based — `server/analyze.js`, `server/skills.js`
- **No database, no external services.**

## How to run

```bash
npm install
npm run dev        # server on :3001, client on :5173 — open http://localhost:5173
```

Production:

```bash
npm run build      # tsc + vite build → dist/
npm start          # Express serves the API and the built frontend on :3001
```

Or run the parts separately: `npm run dev:server` and `npm run dev:client`.

## API

### `GET /api/health`

```json
{ "ok": true, "service": "resumelens-ai", "method": "on-device, rule-based — no external API" }
```

### `POST /api/analyze`

Request:

```json
{ "resume": "…resume text…", "jobDescription": "…job description text…" }
```

Response (abridged):

```json
{
  "score": 82,
  "verdict": "Strong match — this resume speaks the job's language.",
  "breakdown": [
    { "label": "Skill match", "value": 92, "weight": "40%", "detail": "12 of 13 job skills found" }
  ],
  "matched": ["React", "TypeScript"],
  "missing": ["Next.js"],
  "requiredSkills": ["React", "TypeScript", "Next.js"],
  "counts": { "resumeWords": 312, "matchedSkills": 12, "missingSkills": 1 },
  "sections": [{ "key": "skills", "label": "Skills", "present": true }],
  "suggestions": [{ "category": "Missing skill", "text": "…", "priority": "High" }],
  "checklist": ["Add the skill \"Next.js\" (with a real example of using it)"]
}
```

Both fields must be strings of at least 50 characters; otherwise the API
returns `400` with an `error` message.

## Sample pairs

Load them from the buttons on the page — no typing needed:

1. **Frontend Developer** — Aarav Mehta's resume vs a Nova Retail
   Frontend Developer JD.
2. **Data Analyst** — Priya Nair's resume vs a Meridian Analytics Data
   Analyst JD.

Sample people are fictional, written for demonstration.

## Project structure

```
resumelens-ai/
├── src/
│   ├── App.tsx          # UI: inputs, gauge, breakdown, chips, suggestions
│   ├── App.css          # Apple Light System tokens
│   ├── samples.ts       # 2 sample resume + JD pairs
│   ├── types.ts
│   └── main.tsx
├── server/
│   ├── index.js         # Express: /api/health, /api/analyze, serves dist/
│   ├── analyze.js       # Scoring engine (tokenise, cosine, sections…)
│   └── skills.js        # Curated skill catalogue + stop-words + action verbs
├── scripts/dev.mjs      # Runs server + Vite together for `npm run dev`
└── index.html
```

## Limitations

- Skill detection is keyword-based against a curated list (~65 skills);
  a skill phrased unusually, or a skill not in the list, will not be counted.
- Cosine similarity measures wording overlap, not meaning — synonyms
  (e.g. "JS" vs "JavaScript" is handled, but most synonyms are not).
- Section detection relies on headings; a resume with no headings scores
  lower on sections even if the content is present.
- Scores are relative to the pasted job description — change the JD and
  the score changes. That is the point: tailor per role.

## License

MIT — see `LICENSE`. Copyright 2026 Manan Khanna.
