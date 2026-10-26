/**
 * Tests for js/lesson-generator.js
 * Run with:  node --test tests/
 *
 * A fake AI client stands in for Claude. It recognizes which agent a prompt
 * is for (from the "ROLE:" line) and returns a canned reply, so these tests
 * check the engine's own logic: request building, the order of agents, the
 * 2-round fact-check limit, how fixes are applied, and PrincBot's rules.
 */
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const LG = require("../js/lesson-generator.js");
const SAMPLE = require("../js/sample-unit.js");

const JUNIPER = {
  id: "juniper", nick: "Juniper", grade: "8", gradeLabel: "Grade 8", attention: "Long",
  reading: "9th-grade level", needs: ["ADHD"], interests: ["Horses", "Sketching"],
};

/** A plan reply with `count` lessons. */
function planReply(count) {
  return {
    title: "Rocks and Minerals", subtitle: "A test unit", overview: "Overview.", goals: ["Goal"], materials: ["Paper"],
    safetyNote: "", misconceptions: ["Rocks never change."],
    lessons: Array.from({ length: count }, (_, i) => ({
      title: "Lesson " + (i + 1), summary: "Summary", bigQuestion: "Why?", objectives: ["Objective"], vocabulary: ["mineral"],
      materials: "Reading", reference: "CK-12", segments: [{ time: "0:00 to 0:45", name: "All", activity: "Do it" }],
      exitTicket: "Question?", differentiation: { support: "Help", challenge: "Stretch" }, adaptations: ["Short chunks"],
    })),
  };
}

const LESSON_REPLY = {
  reading: { title: "Reading", sections: [{ heading: "Minerals", paragraphs: ["Scientists have named more than 4,000 minerals."], bullets: [] }], keyIdeas: ["Idea"] },
  worksheet: { title: "Worksheet", instructions: "Do it", parts: [{ heading: "Part A", items: ["1. Q"] }] },
  answerKey: { worksheet: ["1. A"], exitTicket: "Answer" },
};

/**
 * Builds a fake AI client.
 * @param {object} overrides  Replies by agent name; a function receives (prompt, callNumber).
 */
function fakeAi(overrides) {
  const calls = [];
  const counts = {};
  const replies = Object.assign({
    LPBot: (p) => planReply(Number((p.match(/unit of (\d+) lesson/) || [0, 5])[1])),
    CompBot: { framework: "NJSLS", items: [{ code: "MS-ESS2-1", text: "Cycling of Earth's materials", where: "All" }], practices: "Models", gaps: [] },
    TeachBotLesson: LESSON_REPLY,
    TeachBotQuiz: { title: "Quiz", instructions: "Go", sections: [{ heading: "Part A", items: [{ n: 1, prompt: "Q", choices: ["a) x", "b) y"] }] }], answers: [{ n: 1, answer: "a" }], rubric: [], shortAnswerExamples: [] },
    FactBot: (p, n) => (n === 1
      ? { issues: [{ path: "lessons.0.reading", quote: "more than 4,000 minerals", problem: "Out of date", replacement: "more than 6,000 minerals", severity: "error", source: "IMA" }] }
      : { issues: [] }),
    TeachBotFix: (p) => ({ patches: [{ issue: 0, path: "lessons.0.reading", find: "more than 4,000 minerals", replace: "more than 6,000 minerals", disagree: false }] }),
    SafetyBot: { concerns: [] },
  }, overrides || {});

  function agentFor(prompt) {
    if (prompt.includes("You are LPBot")) return "LPBot";
    if (prompt.includes("You are CompBot")) return "CompBot";
    if (prompt.includes("You are FactBot")) return "FactBot";
    if (prompt.includes("You are SafetyBot")) return "SafetyBot";
    if (prompt.includes("writing the unit quiz")) return "TeachBotQuiz";
    if (prompt.includes("fact-checker found problems")) return "TeachBotFix";
    return "TeachBotLesson";
  }

  return {
    mode: "test",
    calls,
    async askJson(prompt, options) {
      const agent = agentFor(prompt);
      counts[agent] = (counts[agent] || 0) + 1;
      calls.push({ agent, tier: options && options.tier, prompt });
      const reply = replies[agent];
      return JSON.parse(JSON.stringify(typeof reply === "function" ? reply(prompt, counts[agent]) : reply));
    },
  };
}

function request(extra) {
  const built = LG.buildRequest(Object.assign({
    child: JUNIPER, subjects: [{ name: "Science", topic: "Rocks" }], duration: "week", references: [], startDate: "2026-10-26",
  }, extra || {}));
  assert.equal(built.ok, true, JSON.stringify(built.errors));
  return built.request;
}

// --- Building the request ----------------------------------------------------

test("buildRequest reports every missing choice in plain language", () => {
  const result = LG.buildRequest({ subjects: [], duration: "forever" });
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    "Choose which child this unit is for.",
    "Choose at least one subject.",
    "Choose how long the unit should run.",
  ]);
});

test("buildRequest uses the attention span for lesson length unless overridden", () => {
  assert.equal(request().lessonMinutes, 45); // Long attention span
  assert.equal(request({ lessonMinutes: 20 }).lessonMinutes, 20);
});

test("a week gives each subject five school days, skipping the weekend", () => {
  const r = request({ subjects: [{ name: "Science" }, { name: "Math" }], startDate: "2026-10-29" });
  assert.equal(r.unitPlans.length, 2);
  assert.equal(r.lessonCount, 5);
  assert.deepEqual(r.dayLabels, ["Thu, Oct 29", "Fri, Oct 30", "Mon, Nov 2", "Tue, Nov 3", "Wed, Nov 4"]);
});

test("several subjects in a single lesson become one cross-curricular unit", () => {
  const r = request({ subjects: [{ name: "Science" }, { name: "Math" }], duration: "lesson" });
  assert.equal(r.unitPlans.length, 1);
  assert.equal(r.unitPlans[0].name, "Science + Math");
  assert.deepEqual(r.unitPlans[0].integratedSubjects, ["Science", "Math"]);
});

test("references are trimmed, empty ones dropped, and long text capped", () => {
  const r = request({ references: [
    { kind: "link", title: "", url: "https://example.org/a" },
    { kind: "text", title: "Notes", content: "x".repeat(20000) },
    { kind: "text", title: "Empty", content: "   " },
  ] });
  assert.equal(r.references.length, 2);
  assert.equal(r.references[0].title, "https://example.org/a");
  assert.equal(r.references[1].content.length, 12000);
});

test("the learner profile sent to the AI never includes the nickname", () => {
  const profile = LG._internal.learnerProfile(JUNIPER);
  assert.equal(JSON.stringify(profile).includes("Juniper"), false);
  assert.deepEqual(Object.keys(profile), ["grade", "readingLevel", "attentionSpan", "learningNeeds", "interests"]);
});

// --- The pipeline ---------------------------------------------------------------

test("a week unit runs the agents in order and applies FactBot's fix", async () => {
  const ai = fakeAi();
  const steps = [];
  const plan = await LG.generate(ai, request(), { onStep: (s) => steps.push(s.agent) });
  const unit = plan.units[0];

  const order = ai.calls.map((c) => c.agent);
  assert.equal(order[0], "LPBot");
  assert.equal(order[1], "CompBot");
  assert.equal(order.filter((a) => a === "TeachBotLesson").length, 5);
  assert.ok(order.indexOf("TeachBotQuiz") > order.lastIndexOf("TeachBotLesson"));
  assert.equal(order[order.length - 1], "SafetyBot");

  assert.equal(unit.lessons.length, 5);
  assert.ok(unit.quiz, "a week ends with a quiz");
  assert.match(unit.lessons[0].reading.sections[0].paragraphs[0], /more than 6,000 minerals/);
  assert.equal(unit.review.rounds, 2);
  assert.equal(unit.review.fixes.length, 1);
  assert.equal(unit.review.fixes[0].where, "Lesson 1 reading");
  assert.equal(unit.review.status, "ready");
  assert.equal(plan.status, "ready");
  assert.equal(steps[steps.length - 1], "PrincBot");
  // Round 2 only re-checks the part that changed.
  const round2 = ai.calls.filter((c) => c.agent === "FactBot")[1].prompt;
  assert.ok(round2.includes('"path":"lessons.0.reading"'));
  assert.equal(round2.includes('"path":"lessons.1.reading"'), false);
});

test("FactBot gets at most two rounds, even if it keeps finding issues", async () => {
  const ai = fakeAi({
    FactBot: () => ({ issues: [{ path: "lessons.0.reading", quote: "minerals", problem: "Still wrong", replacement: "minerals!", severity: "error" }] }),
    TeachBotFix: () => ({ patches: [{ issue: 0, path: "lessons.0.reading", find: "minerals", replace: "minerals!" }] }),
  });
  const plan = await LG.generate(ai, request(), {});
  assert.equal(ai.calls.filter((c) => c.agent === "FactBot").length, LG.MAX_FACT_ROUNDS);
  assert.equal(plan.units[0].review.rounds, 2);
});

test("a correction that cannot be applied is sent to the parent", async () => {
  const ai = fakeAi({ TeachBotFix: () => ({ patches: [{ issue: 0, path: "lessons.0.reading", find: "text that is not there", replace: "x" }] }) });
  const plan = await LG.generate(ai, request(), {});
  const review = plan.units[0].review;
  assert.equal(review.status, "needs_review");
  assert.equal(review.flags[0].kind, "Accuracy");
  assert.equal(plan.status, "needs_review");
});

test("a disputed correction is flagged, not guessed", async () => {
  const ai = fakeAi({ TeachBotFix: () => ({ patches: [{ issue: 0, disagree: true, note: "The source is newer" }] }) });
  const review = (await LG.generate(ai, request(), {})).units[0].review;
  assert.equal(review.flags[0].kind, "Accuracy (disputed)");
  assert.match(review.flags[0].message, /The source is newer/);
});

test("precision notes that are not applied do not block the unit", async () => {
  const ai = fakeAi({
    FactBot: () => ({ issues: [{ path: "lessons.0.reading", quote: "nope", problem: "Could be tighter", severity: "precision" }] }),
    TeachBotFix: () => ({ patches: [] }),
  });
  const review = (await LG.generate(ai, request(), {})).units[0].review;
  assert.equal(review.status, "ready");
});

test("SafetyBot's block concern sends the unit to the parent (rule 1)", async () => {
  const ai = fakeAi({ SafetyBot: { concerns: [{ path: "lessons.2.plan", concern: "Uses a hot stove without supervision noted", severity: "block" }] } });
  const review = (await LG.generate(ai, request(), {})).units[0].review;
  assert.equal(review.status, "needs_review");
  assert.equal(review.flags[0].kind, "Age-appropriateness");
  assert.equal(review.flags[0].where, "Lesson 3 plan");
  // SafetyBot uses the quick tier.
  assert.equal(ai.calls.find((c) => c.agent === "SafetyBot").tier, "quick");
});

test("CompBot can be turned off, and a single lesson has no quiz", async () => {
  const ai = fakeAi();
  const plan = await LG.generate(ai, request({ duration: "lesson", useStandards: false }), {});
  assert.equal(ai.calls.some((c) => c.agent === "CompBot"), false);
  assert.equal(plan.units[0].lessons.length, 1);
  assert.equal(plan.units[0].quiz, null);
});

test("parent references are passed to the agents, and links are not treated as read", async () => {
  const ai = fakeAi();
  await LG.generate(ai, request({ references: [
    { kind: "link", title: "Field guide", url: "https://example.org/guide" },
    { kind: "text", title: "Our notes", content: "Quartz is common in sand on many beaches." },
  ] }), {});
  const lpPrompt = ai.calls[0].prompt;
  assert.match(lpPrompt, /\[R1\] "Field guide"/);
  assert.match(lpPrompt, /You cannot open this link/);
  assert.match(lpPrompt, /Quartz is common in sand/);
});

test("Stop cancels the run", async () => {
  const controller = new AbortController();
  const ai = fakeAi({ LPBot: (p) => { controller.abort(); return planReply(5); } });
  await assert.rejects(LG.generate(ai, request(), { signal: controller.signal }), (e) => e.code === "cancelled");
});

// --- Sample unit -------------------------------------------------------------------

test("the sample unit has the same shape the viewer expects", () => {
  assert.equal(SAMPLE.mode, "sample");
  const unit = SAMPLE.units[0];
  assert.equal(unit.lessons.length, 5);
  unit.lessons.forEach((l) => {
    assert.ok(l.title && l.segments.length && l.worksheet.parts.length && l.answerKey.worksheet.length);
  });
  assert.equal(unit.quiz.answers.length, 16);
  assert.equal(unit.quiz.sections.reduce((n, s) => n + s.items.length, 0), 19);
});
