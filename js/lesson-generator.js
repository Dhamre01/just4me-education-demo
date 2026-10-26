/**
 * lesson-generator.js
 * ---------------------------------------------------------------------------
 * Just4Me Education: Weekly Lesson Generator engine.
 *
 * This file turns four parent choices into a complete, fact-checked teaching
 * unit with the same structure as the "Grade 8 Geology Week: Rocks and
 * Minerals" unit:
 *
 *   1. Subjects       - one or more subjects, each with an optional topic
 *   2. Duration       - a single lesson, 1 day, 3 days, 1 week or 2 weeks
 *   3. Virtual Child  - the child the unit is written for
 *   4. References     - extra sources the parent wants the agents to use
 *
 * The work is split between the platform's agents, run in this order:
 *
 *   LPBot     plans the unit: goals, materials, and every lesson's timed plan
 *   CompBot   maps the unit to the subscriber's state standards (optional)
 *   TeachBot  writes each lesson's student reading, worksheet and answer key,
 *             and the end-of-unit quiz
 *   FactBot   checks everything for factual errors and misleading wording
 *   TeachBot  fixes what FactBot found (at most 2 check-and-fix rounds)
 *   SafetyBot screens the finished content for age-appropriateness
 *   PrincBot  applies the platform's decision rules, writes the accuracy
 *             notes, and decides whether a parent needs to review anything
 *
 * PrincBot is plain code, not an AI call, so its rules are predictable and
 * covered by tests (see tests/lesson-generator.test.js).
 *
 * The engine never talks to an AI service directly. It receives an "AI
 * client" object with one method, askJson(prompt, options), and calls that.
 * This keeps the engine the same everywhere:
 *   - In the demo inside Claude, the client wraps the page's Claude
 *     connection (createArtifactClient below).
 *   - In production, the client will call the platform's server, which holds
 *     the API key (see docs/weekly-lesson-generator.md).
 *   - In tests, the client is a fake that returns canned answers.
 *
 * The file works both in the browser (it adds window.J4M.LessonGenerator)
 * and in Node.js (module.exports), so the tests can load it directly.
 * ---------------------------------------------------------------------------
 */
(function attachLessonGenerator(root) {
  "use strict";

  // =========================================================================
  // Settings parents can choose from
  // =========================================================================

  /**
   * Duration choices shown in the dialog.
   * lessonsPerSubject: how many lessons each subject gets.
   * integrated: when true and several subjects are chosen, they are combined
   *             into one cross-curricular lesson instead of one per subject.
   */
  const DURATIONS = {
    lesson: { label: "Single lesson", lessonsPerSubject: 1, integrated: true },
    day: { label: "1 day", lessonsPerSubject: 1, integrated: false },
    threeDays: { label: "3 days", lessonsPerSubject: 3, integrated: false },
    week: { label: "1 week", lessonsPerSubject: 5, integrated: false },
    twoWeeks: { label: "2 weeks", lessonsPerSubject: 10, integrated: false },
  };

  /** Subjects offered as checkboxes. Parents can also type their own. */
  const SUBJECTS = ["Science", "Math", "English Language Arts", "Social Studies"];

  /** Default lesson length, in minutes, for each attention span. */
  const MINUTES_BY_ATTENTION = { Short: 20, Average: 30, Long: 45 };

  /** A unit of 3 or more lessons ends with a review day and a quiz. */
  const MIN_LESSONS_FOR_QUIZ = 3;

  /** FactBot and TeachBot get at most this many check-and-fix rounds. */
  const MAX_FACT_ROUNDS = 2;

  /** How many lesson-writing requests may run at the same time. */
  const PARALLEL_LESSON_REQUESTS = 2;

  /** Rough seconds per AI request, used only for the time estimate. */
  const SECONDS_PER_REQUEST = 45;

  /** Longest pasted or uploaded reference text we send, in characters. */
  const MAX_REFERENCE_CHARS = 12000;

  // =========================================================================
  // Small helpers
  // =========================================================================

  /** Returns a copy of a value that can be changed without touching the original. */
  function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  /** Turns anything into an array, so code can safely loop over it. */
  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === "") return [];
    return [value];
  }

  /** Turns anything into a trimmed string ("" for missing values). */
  function asText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  /**
   * Builds the list of school-day labels ("Mon, Oct 26") starting from a
   * date, skipping Saturdays and Sundays.
   * @param {string} startIso  Start date as "YYYY-MM-DD".
   * @param {number} count     How many school days are needed.
   * @returns {string[]}
   */
  function schoolDayLabels(startIso, count) {
    const labels = [];
    // Noon avoids daylight-saving edge cases when adding days.
    const date = new Date(startIso + "T12:00:00");
    if (isNaN(date.getTime())) {
      for (let i = 1; i <= count; i++) labels.push("Day " + i);
      return labels;
    }
    while (labels.length < count) {
      const weekday = date.getDay();
      if (weekday !== 0 && weekday !== 6) {
        labels.push(
          date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        );
      }
      date.setDate(date.getDate() + 1);
    }
    return labels;
  }

  /**
   * Runs async jobs with a limit on how many run at once.
   * @param {Array<Function>} jobs  Functions that each return a promise.
   * @param {number} limit          Maximum jobs running together.
   * @returns {Promise<Array>}      Results in the same order as the jobs.
   */
  async function runWithLimit(jobs, limit) {
    const results = new Array(jobs.length);
    let next = 0;
    async function worker() {
      while (next < jobs.length) {
        const index = next++;
        results[index] = await jobs[index]();
      }
    }
    const workers = [];
    for (let i = 0; i < Math.min(limit, jobs.length); i++) workers.push(worker());
    await Promise.all(workers);
    return results;
  }

  /** Throws a standard "cancelled" error if the parent pressed Stop. */
  function stopIfCancelled(signal) {
    if (signal && signal.aborted) {
      const error = new Error("Generation stopped.");
      error.code = "cancelled";
      throw error;
    }
  }

  // =========================================================================
  // Step 1: turn the dialog's choices into a validated request
  // =========================================================================

  /**
   * Checks the parent's choices and fills in defaults.
   * Returns { ok: true, request } or { ok: false, errors: [...] } with
   * messages written for the parent.
   *
   * @param {object} choices
   * @param {object} choices.child       Virtual Child profile.
   * @param {Array}  choices.subjects    [{ name, topic }]
   * @param {string} choices.duration    A key of DURATIONS.
   * @param {Array}  choices.references  [{ kind: "link"|"text", title, url, content }]
   * @param {number} [choices.lessonMinutes]  Override for lesson length.
   * @param {string} [choices.startDate]      "YYYY-MM-DD".
   * @param {boolean} [choices.useStandards]  Run CompBot.
   * @param {boolean} [choices.useOpenReferences]  Allow well-known open sources.
   * @param {object} [choices.standards]      { state, framework }
   */
  function buildRequest(choices) {
    const errors = [];
    const child = choices && choices.child;
    if (!child) errors.push("Choose which child this unit is for.");

    const subjects = asArray(choices && choices.subjects)
      .map((s) => ({ name: asText(s.name), topic: asText(s.topic) }))
      .filter((s) => s.name);
    if (subjects.length === 0) errors.push("Choose at least one subject.");
    if (subjects.length > 4) errors.push("Choose up to 4 subjects at a time.");

    const durationKey = choices && choices.duration;
    const duration = DURATIONS[durationKey];
    if (!duration) errors.push("Choose how long the unit should run.");

    const references = asArray(choices && choices.references)
      .map((r) => ({
        kind: r.kind === "link" ? "link" : "text",
        title: asText(r.title) || asText(r.url) || "Parent reference",
        url: asText(r.url),
        content: asText(r.content).slice(0, MAX_REFERENCE_CHARS),
      }))
      .filter((r) => r.url || r.content);

    if (errors.length) return { ok: false, errors };

    const minutes =
      Number(choices.lessonMinutes) || MINUTES_BY_ATTENTION[child.attention] || 30;

    // Several subjects in a single lesson become one cross-curricular unit.
    const integrated = duration.integrated && subjects.length > 1;
    const unitPlans = integrated
      ? [{
          name: subjects.map((s) => s.name).join(" + "),
          topic: subjects.map((s) => s.topic).filter(Boolean).join("; "),
          integratedSubjects: subjects.map((s) => s.name),
        }]
      : subjects.map((s) => ({ name: s.name, topic: s.topic, integratedSubjects: null }));

    return {
      ok: true,
      request: {
        child,
        unitPlans,
        durationKey,
        durationLabel: duration.label,
        lessonCount: duration.lessonsPerSubject,
        lessonMinutes: minutes,
        dayLabels: schoolDayLabels(choices.startDate || "", duration.lessonsPerSubject),
        references,
        useStandards: choices.useStandards !== false,
        useOpenReferences: choices.useOpenReferences !== false,
        standards: choices.standards || { state: "New Jersey", framework: "New Jersey Student Learning Standards (NJSLS)" },
      },
    };
  }

  /**
   * Estimates how many AI requests a request needs and roughly how long it
   * will take, so the dialog can tell the parent before they start.
   */
  function estimateWork(request) {
    let requests = 0;
    for (let i = 0; i < request.unitPlans.length; i++) {
      requests += 1; // LPBot plan
      if (request.useStandards) requests += 1; // CompBot
      requests += request.lessonCount; // TeachBot, one per lesson
      if (request.lessonCount >= MIN_LESSONS_FOR_QUIZ) requests += 1; // quiz
      requests += 2; // FactBot round 1 + TeachBot fixes (typical)
      requests += 1; // SafetyBot
    }
    const parallelSaving = Math.max(0, request.unitPlans.length * (request.lessonCount - 1)) / PARALLEL_LESSON_REQUESTS;
    const minutes = Math.max(1, Math.round(((requests - parallelSaving) * SECONDS_PER_REQUEST) / 60));
    return { requests, minutes };
  }

  // =========================================================================
  // Prompts: what each agent is asked to do
  // =========================================================================

  /**
   * The child details the agents need. The nickname is deliberately left
   * out: the AI never needs to know who the child is, only how they learn.
   */
  function learnerProfile(child) {
    return {
      grade: child.grade,
      readingLevel: child.reading,
      attentionSpan: child.attention,
      learningNeeds: asArray(child.needs),
      interests: asArray(child.interests),
    };
  }

  /** Describes the parent's references in a form the agents can use. */
  function describeReferences(request) {
    const lines = [];
    request.references.forEach((ref, i) => {
      const id = "R" + (i + 1);
      if (ref.content) {
        lines.push(`[${id}] "${ref.title}" (text supplied by the parent):\n"""\n${ref.content}\n"""`);
      } else {
        lines.push(
          `[${id}] "${ref.title}" ${ref.url ? "(" + ref.url + ")" : ""}. ` +
          "You cannot open this link. Cite it by title where it fits the lesson, but do not claim anything about its contents."
        );
      }
    });
    if (request.useOpenReferences) {
      lines.push(
        "You may also rely on well-known open educational references (for example CK-12, OpenStax, " +
        "NASA, USGS, NOAA, the Smithsonian, Khan Academy, the Library of Congress). Cite them by name; " +
        "never invent URLs, page numbers or quotations."
      );
    }
    if (!lines.length) lines.push("No outside references: rely on standard, well-established knowledge.");
    return lines.join("\n\n");
  }

  /** Shared ground rules included in every content prompt. */
  const HOUSE_RULES = [
    "You write for Just4Me Education, a homeschool platform. The adult teaching is a parent, not a classroom teacher: write instructions for one parent and one child.",
    "Be accurate first. Simplify, but never say anything a subject expert would call false or misleading.",
    "Pitch student-facing text at the learner's reading level, and use their interests for examples where it fits naturally.",
    "Plain, warm, direct language. No emoji.",
  ].join("\n");

  function planPrompt(request, unitPlan) {
    const profile = learnerProfile(request.child);
    const quiz = request.lessonCount >= MIN_LESSONS_FOR_QUIZ;
    return `${HOUSE_RULES}

ROLE: You are LPBot, the lesson planner.

TASK: Plan a ${request.durationLabel.toLowerCase()} ${unitPlan.name} unit of ${request.lessonCount} lesson(s), ${request.lessonMinutes} minutes each.
${unitPlan.integratedSubjects ? "This is ONE cross-curricular lesson that teaches all of these subjects together: " + unitPlan.integratedSubjects.join(", ") + "." : ""}
Topic: ${unitPlan.topic || "Choose a strong, grade-appropriate topic that fits the learner's interests and their state standards."}
${quiz ? "The last lesson must be a review followed by a unit quiz (the quiz itself is written later)." : "There is no unit quiz; each lesson ends with an exit ticket."}
Every lesson follows the same rhythm: a short warm-up, a focused reading with discussion, an activity or worksheet, and a quick exit ticket. Segment times must add up to exactly ${request.lessonMinutes} minutes.
Adapt for the learner's attention span and learning needs (for example shorter segments, movement breaks, read-aloud support).

LEARNER: ${JSON.stringify(profile)}

REFERENCES:
${describeReferences(request)}

REPLY with only one JSON object of this shape:
{
  "title": "Unit title",
  "subtitle": "One line, e.g. A one-week geology unit",
  "overview": "2-3 sentences on what the learner will learn and how the days are structured",
  "goals": ["By the end the learner will be able to ...", "..."],
  "materials": ["Item needed for the unit, marking optional items as Optional", "..."],
  "safetyNote": "Safety guidance for any hands-on work, or an empty string",
  "lessons": [
    {
      "title": "Lesson title",
      "summary": "One sentence",
      "bigQuestion": "The question the lesson answers",
      "objectives": ["The learner will ..."],
      "vocabulary": ["term", "term"],
      "materials": "What this lesson needs",
      "reference": "Which reference(s) support this lesson, e.g. [R1] or CK-12 Earth Science, Lesson 3.1",
      "segments": [{ "time": "0:00 to 0:04", "name": "Warm-up", "activity": "What the parent and learner do" }],
      "exitTicket": "One question",
      "differentiation": { "support": "Extra support idea", "challenge": "Challenge idea" },
      "adaptations": ["How this lesson is adapted for this learner's needs and attention span"]
    }
  ],
  "misconceptions": ["Common misconception to listen for, with the correct idea"]
}
The "lessons" array must have exactly ${request.lessonCount} item(s).`;
  }

  function standardsPrompt(request, unit) {
    const outline = unit.lessons.map((l, i) => ({ lesson: i + 1, title: l.title, objectives: l.objectives }));
    return `ROLE: You are CompBot, the standards checker for Just4Me Education.

TASK: Map this ${unit.subject} unit for a grade ${request.child.grade} learner to the ${request.standards.framework} for ${request.standards.state}.
List the 1-4 standards the unit builds toward most directly. Use only standard codes you are confident exist in that framework (for science, New Jersey uses NGSS performance expectations such as MS-ESS2-1; for math and ELA, NJSLS codes follow the Common Core style such as 8.EE.C.7). If you are not sure a code exists, write the standard's description and set "code" to "Verify code".
Then list any lesson objective that maps to no standard.

UNIT OUTLINE: ${JSON.stringify(outline)}

REPLY with only one JSON object:
{ "framework": "${request.standards.framework}",
  "items": [{ "code": "MS-ESS2-1", "text": "Full wording of the standard", "where": "Lessons 2 to 5" }],
  "practices": "One sentence naming the practices or skills the unit uses",
  "gaps": ["Objective with no matching standard"] }`;
  }

  function lessonPrompt(request, unit, lessonIndex) {
    const lesson = unit.lessons[lessonIndex];
    const isReviewDay = unit.hasQuiz && lessonIndex === unit.lessons.length - 1;
    const earlier = unit.lessons.slice(0, lessonIndex).map((l) => l.title);
    return `${HOUSE_RULES}

ROLE: You are TeachBot, who writes the learner's materials.

UNIT: "${unit.title}" (${unit.subject}), lesson ${lessonIndex + 1} of ${unit.lessons.length}.
EARLIER LESSONS: ${earlier.length ? earlier.join("; ") : "none"}
THIS LESSON'S PLAN: ${JSON.stringify(lesson)}
LEARNER: ${JSON.stringify(learnerProfile(request.child))}
REFERENCES:
${describeReferences(request)}

TASK: Write ${isReviewDay ? "a short review worksheet that pulls the whole unit together (the quiz is written separately, so do not write quiz questions here)" : "the student reading for this lesson (about " + Math.round(request.lessonMinutes * 18) + " words, with headings), a worksheet the learner completes during the activity segment"}, and the answer key.
Use **double asterisks** around key vocabulary words the first time they appear. Worksheet items must be answerable from the reading. The answer key must give a correct, complete answer for every worksheet item and for the exit ticket: "${lesson.exitTicket}".

REPLY with only one JSON object:
{
  "reading": ${isReviewDay ? "null" : '{ "title": "Reading title", "sections": [{ "heading": "Heading", "paragraphs": ["..."], "bullets": ["optional"] }], "keyIdeas": ["..."] }'},
  "worksheet": { "title": "Worksheet title", "instructions": "One line", "parts": [{ "heading": "Part A: ...", "instructions": "optional", "items": ["1. Question ...", "2. Question ..."] }] },
  "answerKey": { "worksheet": ["Part A. 1. Answer ...", "..."], "exitTicket": "Answer to the exit ticket" }
}`;
  }

  function quizPrompt(request, unit) {
    const outline = unit.lessons.map((l) => ({ title: l.title, objectives: l.objectives, vocabulary: l.vocabulary }));
    return `${HOUSE_RULES}

ROLE: You are TeachBot, writing the unit quiz.

UNIT: "${unit.title}" (${unit.subject}) for a grade ${request.child.grade} learner.
LESSONS: ${JSON.stringify(outline)}
LEARNER: ${JSON.stringify(learnerProfile(request.child))}

TASK: Write a 25-point unit quiz the learner can finish in about ${Math.max(10, request.lessonMinutes - 10)} minutes: 12 multiple-choice questions (1 point each, choices a-d, exactly one correct), a 4-term matching section with 6 definitions (1 point each), and 3 short-answer questions (3 points each) that ask for explanations using evidence. Cover every lesson. Then write the answer key and a 0-3 point rubric for the short answers.

REPLY with only one JSON object:
{
  "title": "Quiz title",
  "instructions": "One line",
  "sections": [
    { "heading": "Part A: Multiple choice (1 point each)", "items": [{ "n": 1, "prompt": "...", "choices": ["a) ...", "b) ...", "c) ...", "d) ..."] }] },
    { "heading": "Part B: Matching (1 point each)", "instructions": "...", "items": [{ "n": 13, "prompt": "Term", "choices": [] }], "definitions": ["A. ...", "B. ..."] },
    { "heading": "Part C: Short answer (3 points each)", "items": [{ "n": 17, "prompt": "...", "choices": [] }] }
  ],
  "answers": [{ "n": 1, "answer": "c" }],
  "rubric": ["3: ...", "2: ...", "1: ...", "0: ..."],
  "shortAnswerExamples": [{ "n": 17, "answer": "Model answer" }]
}`;
  }

  /**
   * The content FactBot reviews: every text a learner or parent will rely on,
   * labeled with a "path" so fixes can be applied to the right place.
   */
  function reviewableContent(unit, onlyPaths) {
    const items = [];
    unit.lessons.forEach((lesson, i) => {
      items.push({ path: `lessons.${i}.plan`, content: { title: lesson.title, objectives: lesson.objectives, segments: lesson.segments, exitTicket: lesson.exitTicket, differentiation: lesson.differentiation } });
      if (lesson.reading) items.push({ path: `lessons.${i}.reading`, content: lesson.reading });
      items.push({ path: `lessons.${i}.worksheet`, content: lesson.worksheet });
      items.push({ path: `lessons.${i}.answerKey`, content: lesson.answerKey });
    });
    if (unit.quiz) items.push({ path: "quiz", content: unit.quiz });
    if (!onlyPaths) return items;
    return items.filter((item) => onlyPaths.indexOf(item.path) !== -1);
  }

  function factCheckPrompt(request, unit, round, items, earlierFixes) {
    return `ROLE: You are FactBot, an independent fact-checker for Just4Me Education. You did not write this material.

TASK (round ${round} of ${MAX_FACT_ROUNDS}): Check every factual claim in the ${unit.subject} unit below, written for a grade ${request.child.grade} learner. Simplification for the grade is fine; anything false, out of date, or misleading in a way a subject expert would object to is not. Also check that every answer in each answer key is actually correct for its question and that multiple-choice questions have exactly one correct answer.
Check against well-established knowledge and these references:
${describeReferences(request)}
${earlierFixes.length ? "Fixes already made in round 1 (confirm they are now correct): " + JSON.stringify(earlierFixes) : ""}

Report only real problems. "error" means false or misleading; "precision" means true but worth tightening. Quote the exact words to change so they can be found, and give the replacement wording. Name the kind of source that supports your fix (for example "USGS, Igneous Rocks").

CONTENT: ${JSON.stringify(items)}

REPLY with only one JSON object:
{ "issues": [{ "path": "lessons.1.reading", "quote": "exact words from the content", "problem": "What is wrong", "replacement": "Corrected words", "severity": "error", "source": "Supporting source" }] }
Reply { "issues": [] } if everything checks out.`;
  }

  function revisionPrompt(unit, issues, items) {
    return `ROLE: You are TeachBot. An independent fact-checker found problems in the ${unit.subject} materials you wrote.

TASK: Fix each issue with the smallest change that makes the text correct, keeping the reading level and style. For each issue give the exact text to find (copied from CONTENT, at most one sentence) and its replacement. If you disagree with an issue, set "disagree" to true and explain why in "note"; the principal will decide.

ISSUES: ${JSON.stringify(issues)}
CONTENT: ${JSON.stringify(items)}

REPLY with only one JSON object:
{ "patches": [{ "issue": 0, "path": "lessons.1.reading", "find": "exact text", "replace": "new text", "disagree": false, "note": "" }] }`;
  }

  function safetyPrompt(request, unit) {
    const items = reviewableContent(unit);
    return `ROLE: You are SafetyBot for Just4Me Education, a children's learning platform.

TASK: Screen this unit for a grade ${request.child.grade} learner. Flag anything that is not age-appropriate, frightening without purpose, biased or stereotyping, unsafe to try at home without adult supervision noted, or that asks the child for personal information.
Learner profile: ${JSON.stringify(learnerProfile(request.child))}

CONTENT: ${JSON.stringify(items)}

REPLY with only one JSON object:
{ "concerns": [{ "path": "lessons.2.plan", "concern": "What the problem is", "severity": "block" }] }
"block" means a parent must review before the child sees it; "note" means a minor suggestion. Reply { "concerns": [] } if it is all appropriate.`;
  }

  // =========================================================================
  // Applying FactBot fixes
  // =========================================================================

  /** Finds the object at a path like "lessons.2.reading" inside a unit. */
  function objectAtPath(unit, path) {
    const parts = String(path || "").split(".");
    if (parts[0] === "quiz") return unit.quiz;
    if (parts[0] !== "lessons") return null;
    const lesson = unit.lessons[Number(parts[1])];
    if (!lesson) return null;
    if (parts[2] === "plan") return lesson;
    return lesson[parts[2]] || null;
  }

  /**
   * Replaces the first occurrence of `find` with `replace` in any string
   * inside an object (searching nested arrays and objects).
   * @returns {boolean} true if a replacement was made.
   */
  function replaceTextInObject(target, find, replace) {
    if (!target || !find) return false;
    const keys = Object.keys(target);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = target[key];
      if (typeof value === "string" && value.indexOf(find) !== -1) {
        target[key] = value.replace(find, replace);
        return true;
      }
      if (value && typeof value === "object" && replaceTextInObject(value, find, replace)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Applies TeachBot's patches to the unit.
   * @returns {{ applied: Array, failed: Array, disputed: Array }}
   */
  function applyPatches(unit, issues, patches) {
    const applied = [];
    const failed = [];
    const disputed = [];
    const handled = {};
    asArray(patches).forEach((patch) => {
      const issue = issues[Number(patch.issue)] || null;
      const path = patch.path || (issue && issue.path);
      handled[Number(patch.issue)] = true;
      if (patch.disagree) {
        disputed.push({ issue, path, note: asText(patch.note) });
        return;
      }
      const target = objectAtPath(unit, path);
      const ok = replaceTextInObject(target, asText(patch.find), asText(patch.replace));
      (ok ? applied : failed).push({ issue, path, find: patch.find, replace: patch.replace });
    });
    // An issue TeachBot skipped entirely counts as not fixed.
    issues.forEach((issue, i) => {
      if (!handled[i]) failed.push({ issue, path: issue.path, find: issue.quote, replace: issue.replacement });
    });
    return { applied, failed, disputed };
  }

  // =========================================================================
  // PrincBot: the platform's decision rules (plain code)
  // =========================================================================

  /**
   * Decides the unit's final status and writes the review log.
   * Rules, in priority order (from the Just4Me build prompt):
   *   1. Child safety wins: any "block" safety concern goes to the parent.
   *   2. Accuracy wins over style: an error that is still unfixed after the
   *      last round, or that TeachBot disputed, goes to the parent.
   *   3. Standards alignment is reported but never blocks a unit.
   *   4. Anything the rules cannot settle is flagged, not guessed.
   */
  function princBotDecision(review) {
    const flags = [];
    review.safety.filter((c) => c.severity === "block").forEach((c) => {
      flags.push({ kind: "Age-appropriateness", where: c.path, message: c.concern });
    });
    review.unresolved.filter((u) => !u.issue || u.issue.severity !== "precision").forEach((u) => {
      flags.push({
        kind: "Accuracy",
        where: u.path,
        message: (u.issue ? u.issue.problem : "A correction could not be applied.") +
          (u.issue && u.issue.replacement ? " Suggested wording: \"" + u.issue.replacement + "\"" : ""),
      });
    });
    review.disputed.forEach((d) => {
      flags.push({
        kind: "Accuracy (disputed)",
        where: d.path,
        message: (d.issue ? d.issue.problem : "Disputed correction") + " TeachBot's view: " + (d.note || "no reason given"),
      });
    });
    return {
      status: flags.length ? "needs_review" : "ready",
      flags,
      summary: flags.length
        ? flags.length + " item(s) need a parent's decision before the child sees them."
        : "Passed fact-check and safety screening. Ready to assign.",
    };
  }

  /** Writes a readable place name, like "Lesson 2 reading", for a path. */
  function describePath(unit, path) {
    const parts = String(path || "").split(".");
    if (parts[0] === "quiz") return "Unit quiz";
    const n = Number(parts[1]) + 1;
    const names = { plan: "plan", reading: "reading", worksheet: "worksheet", answerKey: "answer key" };
    return "Lesson " + n + " " + (names[parts[2]] || "");
  }

  // =========================================================================
  // Normalizing AI replies so the page can trust the shape
  // =========================================================================

  function normalizeLessonPlan(raw, index, request) {
    const l = raw || {};
    return {
      n: index + 1,
      dayLabel: request.dayLabels[index] || "Day " + (index + 1),
      title: asText(l.title) || "Lesson " + (index + 1),
      summary: asText(l.summary),
      bigQuestion: asText(l.bigQuestion),
      objectives: asArray(l.objectives).map(asText),
      vocabulary: asArray(l.vocabulary).map(asText),
      materials: asText(l.materials),
      reference: asText(l.reference),
      segments: asArray(l.segments).map((s) => ({ time: asText(s.time), name: asText(s.name), activity: asText(s.activity) })),
      exitTicket: asText(l.exitTicket),
      differentiation: {
        support: asText(l.differentiation && l.differentiation.support),
        challenge: asText(l.differentiation && l.differentiation.challenge),
      },
      adaptations: asArray(l.adaptations).map(asText),
      reading: null,
      worksheet: { title: "", instructions: "", parts: [] },
      answerKey: { worksheet: [], exitTicket: "" },
    };
  }

  function normalizeLessonContent(raw) {
    const c = raw || {};
    const reading = c.reading && typeof c.reading === "object"
      ? {
          title: asText(c.reading.title),
          sections: asArray(c.reading.sections).map((s) => ({
            heading: asText(s.heading),
            paragraphs: asArray(s.paragraphs).map(asText),
            bullets: asArray(s.bullets).map(asText),
          })),
          keyIdeas: asArray(c.reading.keyIdeas).map(asText),
        }
      : null;
    const w = c.worksheet || {};
    return {
      reading,
      worksheet: {
        title: asText(w.title),
        instructions: asText(w.instructions),
        parts: asArray(w.parts).map((p) => ({ heading: asText(p.heading), instructions: asText(p.instructions), items: asArray(p.items).map(asText) })),
      },
      answerKey: {
        worksheet: asArray(c.answerKey && c.answerKey.worksheet).map(asText),
        exitTicket: asText(c.answerKey && c.answerKey.exitTicket),
      },
    };
  }

  function normalizeQuiz(raw) {
    const q = raw || {};
    return {
      title: asText(q.title) || "Unit Quiz",
      instructions: asText(q.instructions),
      points: 25,
      sections: asArray(q.sections).map((s) => ({
        heading: asText(s.heading),
        instructions: asText(s.instructions),
        items: asArray(s.items).map((it) => ({ n: Number(it.n) || 0, prompt: asText(it.prompt), choices: asArray(it.choices).map(asText) })),
        definitions: asArray(s.definitions).map(asText),
      })),
      answers: asArray(q.answers).map((a) => ({ n: Number(a.n) || 0, answer: asText(a.answer) })),
      rubric: asArray(q.rubric).map(asText),
      shortAnswerExamples: asArray(q.shortAnswerExamples).map((a) => ({ n: Number(a.n) || 0, answer: asText(a.answer) })),
    };
  }

  // =========================================================================
  // The pipeline
  // =========================================================================

  /**
   * Generates one subject's unit.
   * @param {object} ai        AI client with askJson(prompt, { tier, signal }).
   * @param {object} request   From buildRequest().
   * @param {object} unitPlan  { name, topic, integratedSubjects }
   * @param {object} hooks     { onStep(step), signal }
   */
  async function generateUnit(ai, request, unitPlan, hooks) {
    const signal = hooks.signal;
    const step = (agent, message, state) => hooks.onStep({ unit: unitPlan.name, agent, message, state: state || "working" });
    const ask = (prompt, tier) => ai.askJson(prompt, { tier: tier || "default", signal });

    // --- LPBot: plan ------------------------------------------------------
    step("LPBot", `Planning ${request.lessonCount} lesson(s) of ${request.lessonMinutes} minutes`);
    const plan = await ask(planPrompt(request, unitPlan), "default");
    stopIfCancelled(signal);
    const lessonsRaw = asArray(plan.lessons).slice(0, request.lessonCount);
    if (lessonsRaw.length === 0) throw Object.assign(new Error("LPBot returned no lessons."), { code: "bad_plan" });

    const unit = {
      subject: unitPlan.name,
      topic: unitPlan.topic,
      title: asText(plan.title) || unitPlan.name + " unit",
      subtitle: asText(plan.subtitle),
      overview: asText(plan.overview),
      goals: asArray(plan.goals).map(asText),
      materials: asArray(plan.materials).map(asText),
      safetyNote: asText(plan.safetyNote),
      misconceptions: asArray(plan.misconceptions).map(asText),
      lessons: lessonsRaw.map((l, i) => normalizeLessonPlan(l, i, request)),
      hasQuiz: lessonsRaw.length >= MIN_LESSONS_FOR_QUIZ,
      quiz: null,
      standards: null,
    };
    step("LPBot", `Planned "${unit.title}"`, "done");

    // --- CompBot: standards (never blocks the unit) -----------------------
    if (request.useStandards) {
      step("CompBot", `Mapping to ${request.standards.framework}`);
      try {
        const s = await ask(standardsPrompt(request, unit), "default");
        unit.standards = {
          framework: asText(s.framework) || request.standards.framework,
          items: asArray(s.items).map((it) => ({ code: asText(it.code), text: asText(it.text), where: asText(it.where) })),
          practices: asText(s.practices),
          gaps: asArray(s.gaps).map(asText),
        };
        step("CompBot", `${unit.standards.items.length} standard(s) mapped`, "done");
      } catch (error) {
        if (error.code === "cancelled") throw error;
        unit.standards = { framework: request.standards.framework, items: [], practices: "", gaps: ["Standards could not be mapped this time."] };
        step("CompBot", "Standards could not be mapped; the unit continues without them", "warn");
      }
      stopIfCancelled(signal);
    }

    // --- TeachBot: lesson materials, two at a time --------------------------
    step("TeachBot", `Writing readings, worksheets and answer keys`);
    let written = 0;
    const jobs = unit.lessons.map((lesson, i) => async () => {
      stopIfCancelled(signal);
      const content = normalizeLessonContent(await ask(lessonPrompt(request, unit, i), "default"));
      Object.assign(unit.lessons[i], content);
      written++;
      step("TeachBot", `Wrote lesson ${written} of ${unit.lessons.length}`);
    });
    await runWithLimit(jobs, PARALLEL_LESSON_REQUESTS);
    if (unit.hasQuiz) {
      step("TeachBot", "Writing the unit quiz and answer key");
      unit.quiz = normalizeQuiz(await ask(quizPrompt(request, unit), "default"));
    }
    stopIfCancelled(signal);
    step("TeachBot", "All materials written", "done");

    // --- FactBot and TeachBot: at most MAX_FACT_ROUNDS rounds ----------------
    const review = { rounds: 0, fixes: [], unresolved: [], disputed: [], safety: [], precisionNotes: [] };
    let pathsToCheck = null; // null = check everything in round 1
    for (let round = 1; round <= MAX_FACT_ROUNDS; round++) {
      review.rounds = round;
      step("FactBot", `Round ${round}: checking ${pathsToCheck ? "the corrected parts" : "every claim and answer"}`);
      const items = reviewableContent(unit, pathsToCheck);
      const earlier = review.fixes.map((f) => ({ path: f.path, nowReads: f.replace }));
      const result = await ask(factCheckPrompt(request, unit, round, items, earlier), "default");
      stopIfCancelled(signal);
      const issues = asArray(result.issues).filter((i) => i && i.quote);
      // Paths this round looked at; earlier failures elsewhere stay open.
      const checkedPaths = items.map((item) => item.path);
      const stillOpen = review.unresolved.filter((u) => checkedPaths.indexOf(u.path) === -1);
      if (issues.length === 0) {
        step("FactBot", `Round ${round}: no problems found`, "done");
        review.unresolved = stillOpen;
        break;
      }
      const errors = issues.filter((i) => i.severity !== "precision").length;
      step("FactBot", `Round ${round}: ${errors} error(s), ${issues.length - errors} precision note(s)`, "warn");

      step("TeachBot", `Fixing round ${round} issues`);
      const patchReply = await ask(revisionPrompt(unit, issues, items), "default");
      stopIfCancelled(signal);
      const outcome = applyPatches(unit, issues, patchReply.patches);
      outcome.applied.forEach((a) => review.fixes.push({ round, path: a.path, find: a.find, replace: a.replace, issue: a.issue }));
      review.disputed = review.disputed.concat(outcome.disputed);
      review.unresolved = stillOpen.concat(outcome.failed);
      step("TeachBot", `Applied ${outcome.applied.length} fix(es)`, "done");

      // Round 2 only re-checks the parts that changed.
      pathsToCheck = outcome.applied.map((a) => a.path).filter((p, i, all) => all.indexOf(p) === i);
      if (pathsToCheck.length === 0) break;
    }

    // --- SafetyBot ------------------------------------------------------------
    step("SafetyBot", `Screening for a grade ${request.child.grade} learner`);
    try {
      const safety = await ask(safetyPrompt(request, unit), "quick");
      review.safety = asArray(safety.concerns).map((c) => ({ path: asText(c.path), concern: asText(c.concern), severity: c.severity === "block" ? "block" : "note" }));
      step("SafetyBot", review.safety.length ? review.safety.length + " note(s)" : "No concerns", review.safety.some((c) => c.severity === "block") ? "warn" : "done");
    } catch (error) {
      if (error.code === "cancelled") throw error;
      review.safety = [{ path: "", concern: "Safety screening could not run, so a parent should look over this unit first.", severity: "block" }];
      step("SafetyBot", "Screening could not run; flagged for parent review", "warn");
    }

    // --- PrincBot ---------------------------------------------------------------
    const decision = princBotDecision(review);
    unit.review = {
      rounds: review.rounds,
      fixes: review.fixes.map((f) => ({
        round: f.round,
        where: describePath(unit, f.path),
        problem: f.issue ? f.issue.problem : "",
        fix: f.replace,
        source: f.issue ? f.issue.source : "",
        severity: f.issue ? f.issue.severity : "error",
      })),
      flags: decision.flags.map((f) => Object.assign({}, f, { where: describePath(unit, f.where) })),
      safety: review.safety,
      status: decision.status,
      summary: decision.summary,
    };
    unit.sources = buildSources(request, unit);
    step("PrincBot", decision.summary, decision.status === "ready" ? "done" : "warn");
    return unit;
  }

  /** Lists the references the unit used, for the "Sources" section. */
  function buildSources(request, unit) {
    const sources = [];
    request.references.forEach((ref, i) => {
      sources.push({ citation: `[R${i + 1}] ${ref.title}${ref.url ? " — " + ref.url : ""}`, note: ref.content ? "Supplied by the parent as text." : "Supplied by the parent as a link (cited by title)." });
    });
    const cited = {};
    unit.lessons.forEach((l) => { if (l.reference && !/^\[R\d+\]$/.test(l.reference)) cited[l.reference] = true; });
    Object.keys(cited).forEach((c) => sources.push({ citation: c, note: "Cited in the lesson plan." }));
    if (unit.standards && unit.standards.items.length) {
      sources.push({ citation: unit.standards.framework, note: unit.standards.items.map((s) => s.code).join(", ") });
    }
    return sources;
  }

  /**
   * Runs the whole generator.
   * @param {object} ai       AI client (askJson).
   * @param {object} request  From buildRequest().
   * @param {object} hooks    { onStep(step), signal }
   * @returns {Promise<object>} The generated plan: { id, createdAt, child, units, ... }
   */
  async function generate(ai, request, hooks) {
    const safeHooks = { onStep: (hooks && hooks.onStep) || function () {}, signal: hooks && hooks.signal };
    const units = [];
    // Subjects run one after another so progress is easy to follow and the
    // parent's AI usage is not spent in a burst.
    for (let i = 0; i < request.unitPlans.length; i++) {
      stopIfCancelled(safeHooks.signal);
      units.push(await generateUnit(ai, request, request.unitPlans[i], safeHooks));
    }
    return {
      id: "unit-" + Date.now().toString(36),
      createdAt: new Date().toISOString(),
      mode: ai.mode || "live",
      childId: request.child.id,
      childNick: request.child.nick,
      gradeLabel: request.child.gradeLabel,
      durationLabel: request.durationLabel,
      lessonMinutes: request.lessonMinutes,
      references: deepCopy(request.references),
      units,
      status: units.every((u) => u.review.status === "ready") ? "ready" : "needs_review",
    };
  }

  // =========================================================================
  // AI clients
  // =========================================================================

  /**
   * Wraps the Claude connection a published Just4Me page gets inside Claude
   * (the "sample" capability). Returns null when the page is not running
   * inside Claude, so the caller can fall back to the sample unit.
   */
  async function createArtifactClient() {
    const runtime = root && root.claude;
    if (!runtime || typeof runtime.use !== "function") return null;
    const sample = await runtime.use("sample");
    if (!sample || typeof sample.json !== "function") return null;
    return {
      mode: "live",
      async askJson(prompt, options) {
        try {
          return await sample.json(prompt, {
            modelTier: (options && options.tier) || "default",
            signal: options && options.signal,
          });
        } catch (error) {
          // The platform rejects with a plain {code, message} object.
          const wrapped = new Error((error && error.message) || "The AI request failed.");
          wrapped.code = (error && error.code) || "upstream_error";
          throw wrapped;
        }
      },
    };
  }

  /** Parent-facing text for an AI error code. */
  function messageForError(code) {
    const messages = {
      cancelled: "Generation stopped.",
      not_granted: "Claude wasn't allowed to run for this page, so the unit couldn't be generated. You can still view the sample unit.",
      sampling_disabled: "AI generation isn't available on this account. You can still view the sample unit.",
      rate_limited: "Too many requests right now. Wait a few minutes, then try again.",
      session_expired: "Your session expired. Sign in again, then try again.",
      prompt_too_large: "The references are too long. Shorten the pasted text, then try again.",
      invalid_json: "The AI's answer came back in an unexpected format. Try again.",
      refused: "The AI declined this request. Try a different topic or reference.",
      bad_plan: "The lesson plan came back empty. Try again.",
    };
    return messages[code] || "Something went wrong while generating. Try again.";
  }

  // =========================================================================
  // Public interface
  // =========================================================================

  const LessonGenerator = {
    DURATIONS,
    SUBJECTS,
    MINUTES_BY_ATTENTION,
    MAX_FACT_ROUNDS,
    MIN_LESSONS_FOR_QUIZ,
    buildRequest,
    estimateWork,
    generate,
    createArtifactClient,
    messageForError,
    schoolDayLabels,
    // Exposed for tests:
    _internal: { applyPatches, princBotDecision, replaceTextInObject, objectAtPath, reviewableContent, learnerProfile, runWithLimit },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LessonGenerator;
  } else {
    root.J4M = root.J4M || {};
    root.J4M.LessonGenerator = LessonGenerator;
  }
})(typeof window !== "undefined" ? window : globalThis);
