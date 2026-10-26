# Weekly Lesson Generator

The Weekly Lesson Generator lets a parent build a complete, fact-checked teaching unit for one Virtual Child from a single dialog in My Classroom. It produces the same kind of unit as the reference unit "Grade 8 Geology Week: Rocks and Minerals":

- an overview, a week-at-a-glance table, learning goals, a standards table, a materials list and a safety note
- for each lesson: objectives, vocabulary, materials, a reference, a timed lesson plan, an exit ticket, differentiation, adaptations for the child, a student reading and a worksheet
- for units of 3 or more lessons: a review day with a 25-point quiz and a short-answer rubric
- answer keys for every worksheet, exit ticket and the quiz
- sources and accuracy notes listing every correction the fact-checker made

## Where it appears

| Place | Control |
|---|---|
| My Classroom sidebar | **Lesson generator** button (every tab) |
| Overview | **Lesson generator** button next to Create content |
| Lesson plans | **Generate lessons for (child)** button, plus a **Generated units** card listing that child's units |

Every button opens the same dialog (`window.J4M.generatorUi.openDialog(childId)`).

## The dialog

| Choice | Options | Notes |
|---|---|---|
| 1. Who is it for? | Any Virtual Child | Grade, reading level and attention span are shown on each card. |
| 2. Subjects | Science, Math, English Language Arts, Social Studies, plus one typed-in subject; each with an optional topic | Up to 4. A blank topic lets LPBot choose one from the grade, standards and interests. |
| 3. How long? | Single lesson, 1 day, 3 days, 1 week, 2 weeks; start date; lesson length | Lesson length defaults from the attention span (Short 20, Average 30, Long 45 minutes). Weekends are skipped when dating lessons. |
| 4. Reference sources | Links, pasted text, uploaded text files (.txt, .md, .csv, .html); "also use trusted open references"; "align to New Jersey standards" | Pasted and uploaded text is sent to the agents (first 12,000 characters each). Links are cited by title only, because the agents cannot open web pages. |

How durations map to lessons:

| Duration | One subject | Several subjects |
|---|---|---|
| Single lesson | 1 lesson | 1 cross-curricular lesson covering all of them |
| 1 day | 1 lesson | 1 lesson per subject |
| 3 days, 1 week, 2 weeks | 3, 5 or 10 lessons | that many lessons per subject, one unit per subject |

The footer shows an estimate (number of AI steps and minutes) before the parent starts.

## The pipeline

`js/lesson-generator.js`, function `generate()`. Each subject's unit runs these steps:

1. **LPBot** plans the unit and every lesson's timed segments (1 request).
2. **CompBot** maps the unit to the subscriber's state standards (1 request; optional; a failure here never blocks the unit).
3. **TeachBot** writes each lesson's reading, worksheet and answer key (1 request per lesson, 2 at a time), then the quiz.
4. **FactBot** checks every claim and every answer key (round 1: everything).
5. **TeachBot** fixes what FactBot found, as exact find-and-replace patches.
6. **FactBot** round 2 re-checks only the parts that changed, then TeachBot fixes once more if needed. There are never more than 2 rounds (`MAX_FACT_ROUNDS`).
7. **SafetyBot** screens the finished unit for age-appropriateness (quick tier).
8. **PrincBot** applies the platform's rules (plain code, no AI):
   1. A SafetyBot "block" concern goes to the parent.
   2. An error that is still unfixed after the last round, or a fix TeachBot disputed, goes to the parent.
   3. Standards gaps are reported but never block a unit.
   4. Anything else the rules can't settle is flagged rather than guessed.

The unit's status is **Ready to assign** or **Needs your review**, and the Review log lists every step.

### Privacy

The agents receive only what each task needs: grade, reading level, attention span, learning needs and interests. The child's nickname is never sent (`learnerProfile()`; covered by a test).

## AI clients

The engine never calls an AI service directly. `generate(ai, request, hooks)` takes a client with one method:

```js
ai.askJson(prompt, { tier: "default" | "quick", signal }) // resolves to a parsed JSON object
```

| Where | Client | Behavior |
|---|---|---|
| Demo opened inside Claude | `createArtifactClient()` wraps the page's Claude connection (`sample` capability) | Live generation on the viewer's own Claude account. The first request asks the viewer's permission. |
| Demo outside Claude (GitHub Pages) | none available | The dialog explains this and offers the sample unit (`js/sample-unit.js`). |
| Production | a server endpoint, e.g. `POST /api/lesson-units`, that holds the API key and calls the model | Same prompts and the same `askJson` contract. In production, FactBot should also look sources up instead of relying on model knowledge. |
| Tests | `fakeAi()` in `tests/lesson-generator.test.js` | Canned replies per agent. |

## Output

`generate()` resolves to `{ id, createdAt, mode, childId, childNick, gradeLabel, durationLabel, lessonMinutes, references, units, status }`. Each unit holds `lessons`, `quiz`, `standards`, `sources`, `misconceptions` and `review`. `js/sample-unit.js` is a complete example of the shape.

The viewer (`js/generator-ui.js`) shows each unit in sections (Overview, each lesson, Unit quiz, Answer keys, Sources and accuracy, Review log). **Download Word** builds a .docx in the browser with the `docx` library (loaded on first use from jsDelivr, version 8.5.0). Inside Claude the file goes through Claude's download prompt; elsewhere it downloads directly.

Generated units are kept for the current visit only. Saving them to the subscriber's account is part of the production data model (Phase 2 of the build plan).

## Files

| File | Purpose |
|---|---|
| `js/lesson-generator.js` | Engine: request building, prompts, pipeline, fix patching, PrincBot rules, AI client |
| `js/generator-ui.js` | Dialog, progress view, unit viewer, Word export |
| `js/sample-unit.js` | Sample output adapted from the Grade 8 geology week |
| `tests/lesson-generator.test.js` | 16 tests; run `node --test tests/*.test.js` |
| `src/demo.html` | The demo page source; `python3 scripts/build-pages.py` builds `index.html` for GitHub Pages |

## Known limits

- In the demo, FactBot checks against the model's own knowledge and the parent's pasted text; it can't browse.
- Standards codes come from CompBot. Any code it isn't sure of is marked "Verify code".
- A 2-week unit across several subjects is many requests (the estimate shows how many), and each one counts toward the viewer's Claude usage.
