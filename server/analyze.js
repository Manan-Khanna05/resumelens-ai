// ResumeLens AI — on-device, rule-based analysis engine.
// No external API, no model call, no API key.
// Methods: tokenisation + stop-word removal, curated skill-keyword
// extraction, TF cosine similarity, heading-based section detection,
// length / readability checks, action-verb and quantified-result detection.

const { SKILLS, STOP_WORDS, ACTION_VERBS } = require("./skills");

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalise(text) {
  return (text || "").toLowerCase();
}

function tokenise(text) {
  return normalise(text)
    .replace(/[^a-z0-9+#. ]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function termFreq(tokens) {
  const map = new Map();
  for (const t of tokens) map.set(t, (map.get(t) || 0) + 1);
  return map;
}

function cosineSimilarity(aTokens, bTokens) {
  const a = termFreq(aTokens);
  const b = termFreq(bTokens);
  let dot = 0;
  for (const [term, count] of a) dot += count * (b.get(term) || 0);
  const norm = (m) => Math.sqrt([...m.values()].reduce((s, v) => s + v * v, 0));
  const denom = norm(a) * norm(b);
  return denom === 0 ? 0 : dot / denom;
}

function extractSkills(text) {
  const lower = ` ${normalise(text)} `;
  const found = [];
  for (const skill of SKILLS) {
    for (const alias of skill.aliases) {
      const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b`);
      if (pattern.test(lower)) {
        found.push(skill.name);
        break;
      }
    }
  }
  return [...new Set(found)];
}

const SECTION_PATTERNS = [
  { key: "contact", label: "Contact details", patterns: [/email/i, /phone|\+91|\+1/i, /linkedin/i, /github/i, /@[^ ]+\.[a-z]{2,}/i] },
  { key: "summary", label: "Summary / Profile", patterns: [/^\s*(summary|profile|objective|about\s+me)\b/im] },
  { key: "skills", label: "Skills", patterns: [/^\s*(skills|technical\s+skills|technologies|tech\s+stack)\b/im] },
  { key: "experience", label: "Experience", patterns: [/^\s*(experience|work\s+experience|work\s+history|employment|internship)\b/im] },
  { key: "education", label: "Education", patterns: [/^\s*(education|academic|degree|university|college)\b/im] },
  { key: "projects", label: "Projects", patterns: [/^\s*(projects|personal\s+projects)\b/im] },
];

function detectSections(resume) {
  return SECTION_PATTERNS.map((s) => {
    const present = s.patterns.some((p) => p.test(resume));
    return { key: s.key, label: s.label, present };
  });
}

function countActionVerbs(tokens) {
  const set = new Set(ACTION_VERBS);
  const found = new Set();
  for (const t of tokens) if (set.has(t)) found.add(t);
  return [...found];
}

function countQuantified(text) {
  const matches = text.match(/(\d+\s*%|\$\s?\d[\d,]*|\d+\s*(users|customers|clients|downloads|requests|hours|days))|increased[^.]{0,40}\d+|reduced[^.]{0,40}\d+/gi);
  return matches ? matches.length : 0;
}

function analyse(resume, jobDescription) {
  const resumeText = (resume || "").trim();
  const jdText = (jobDescription || "").trim();
  if (!resumeText || !jdText) {
    throw new Error("Both resume and job description are required.");
  }

  const resumeTokens = tokenise(resumeText);
  const jdTokens = tokenise(jdText);
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
  const jdWordCount = jdText.split(/\s+/).filter(Boolean).length;

  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jdText);
  const matched = jdSkills.filter((s) => resumeSkills.includes(s));
  const missing = jdSkills.filter((s) => !resumeSkills.includes(s));

  const cosine = cosineSimilarity(resumeTokens, jdTokens); // 0..1
  const skillScore = jdSkills.length === 0 ? 50 : Math.round((matched.length / jdSkills.length) * 100);
  const cosineScore = Math.round(cosine * 100);

  const sections = detectSections(resumeText);
  const presentSections = sections.filter((s) => s.present).length;
  const sectionScore = Math.round((presentSections / sections.length) * 100);

  // Length: 300–900 words is the healthy range for a 1–2 page resume.
  let lengthScore = 100;
  if (wordCount < 150) lengthScore = 35;
  else if (wordCount < 250) lengthScore = 60;
  else if (wordCount > 1200) lengthScore = 55;
  else if (wordCount > 900) lengthScore = 75;

  const actionVerbs = countActionVerbs(resumeTokens);
  const quantified = countQuantified(resumeText);
  const impactScore = Math.min(
    100,
    Math.round(actionVerbs.length * 12 + quantified * 15 + (actionVerbs.length >= 3 && quantified >= 1 ? 20 : 0))
  );

  // Weighted total: skills 40, wording overlap 25, sections 15, length 10, impact 10.
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        skillScore * 0.4 + cosineScore * 0.25 + sectionScore * 0.15 + lengthScore * 0.1 + impactScore * 0.1
      )
    )
  );

  const verdict =
    score >= 80 ? "Strong match — this resume speaks the job's language."
    : score >= 65 ? "Good match — a few targeted additions would lift it a lot."
    : score >= 50 ? "Partial match — several key skills and sections are missing."
    : "Weak match — rework the skills and experience sections for this role.";

  const suggestions = [];

  for (const skill of missing.slice(0, 8)) {
    suggestions.push({
      category: "Missing skill",
      text: `Add "${skill}" to your Skills section — and, if true, show it in a project or job bullet. It is in the job description but not in your resume.`,
      priority: "High",
    });
  }
  for (const section of sections.filter((s) => !s.present)) {
    suggestions.push({
      category: "Missing section",
      text: `Add a "${section.label}" section. Recruiters and parsers look for it, and its absence lowers your score.`,
      priority: section.key === "skills" || section.key === "experience" ? "High" : "Medium",
    });
  }
  if (wordCount < 250) {
    suggestions.push({
      category: "Length",
      text: `Your resume is only ${wordCount} words. Add 2–3 quantified experience bullets (what you built, for whom, and the result) to reach 300–600 words.`,
      priority: "High",
    });
  }
  if (wordCount > 900) {
    suggestions.push({
      category: "Length",
      text: `Your resume is ${wordCount} words — trim it to one page for this role. Cut older or unrelated bullets first.`,
      priority: "Medium",
    });
  }
  if (actionVerbs.length < 3) {
    suggestions.push({
      category: "Impact",
      text: "Start more bullets with strong action verbs — built, led, improved, shipped, automated — instead of 'responsible for' or 'worked on'.",
      priority: "Medium",
    });
  }
  if (quantified === 0) {
    suggestions.push({
      category: "Impact",
      text: "Add numbers to at least 2 bullets: users reached, time saved, % improved, or revenue affected. Numbers make claims believable.",
      priority: "Medium",
    });
  }
  if (matched.length > 0) {
    suggestions.push({
      category: "Keep doing",
      text: `Keep your strongest matches front and centre: ${matched.slice(0, 4).join(", ")}. Mirror the job description's wording for these skills.`,
      priority: "Low",
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({
      category: "Polish",
      text: "Strong coverage. Proofread once, check every link, and tailor the summary line to this exact role.",
      priority: "Low",
    });
  }

  const checklist = [
    ...missing.map((s) => `Add the skill "${s}" (with a real example of using it)`),
    ...sections.filter((s) => !s.present).map((s) => `Add a "${s.label}" section`),
    ...(wordCount < 250 ? ["Expand experience bullets to reach 300–600 words"] : []),
    ...(quantified === 0 ? ["Add numbers to at least 2 experience bullets"] : []),
    ...(actionVerbs.length < 3 ? ["Rewrite bullets to start with strong action verbs"] : []),
    "Mirror the job description's wording for your matched skills",
    "Proofread, then re-run this analysis",
  ];

  return {
    score,
    verdict,
    breakdown: [
      { label: "Skill match", value: skillScore, weight: "40%", detail: `${matched.length} of ${jdSkills.length} job skills found` },
      { label: "Wording overlap", value: cosineScore, weight: "25%", detail: "Cosine similarity of resume vs job description (stop-words removed)" },
      { label: "Sections present", value: sectionScore, weight: "15%", detail: `${presentSections} of ${sections.length} expected sections found` },
      { label: "Length", value: lengthScore, weight: "10%", detail: `${wordCount} words in resume` },
      { label: "Impact language", value: impactScore, weight: "10%", detail: `${actionVerbs.length} action verbs, ${quantified} quantified results` },
    ],
    matched,
    missing,
    requiredSkills: jdSkills,
    resumeSkills,
    counts: {
      resumeWords: wordCount,
      jdWords: jdWordCount,
      matchedSkills: matched.length,
      missingSkills: missing.length,
      requiredSkills: jdSkills.length,
      actionVerbs: actionVerbs.length,
      quantifiedResults: quantified,
    },
    sections,
    actionVerbs,
    suggestions,
    checklist,
    method:
      "On-device, rule-based analysis: tokenisation, stop-word removal, curated skill-keyword extraction, TF cosine similarity, heading-based section detection, length and action-verb checks. No external API or model was called.",
  };
}

module.exports = { analyse, extractSkills, tokenise, cosineSimilarity };
