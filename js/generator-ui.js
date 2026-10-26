/**
 * generator-ui.js
 * ---------------------------------------------------------------------------
 * The My Classroom side of the Weekly Lesson Generator:
 *   - the "Lesson generator" buttons that open the dialog
 *   - the dialog where the parent picks the child, subjects, duration and
 *     references
 *   - the progress view while the agents work
 *   - the unit viewer that shows the finished unit
 *   - the Word (.docx) download
 *
 * The generating itself lives in lesson-generator.js. This file only
 * collects choices, shows progress and renders results.
 *
 * It relies on these names defined by the main page script:
 *   KIDS, state, renderTab, toast, esc, avatar, $
 * ---------------------------------------------------------------------------
 */
(function attachGeneratorUi() {
  "use strict";

  const LG = window.J4M.LessonGenerator;

  /** Units generated in this visit, newest first. */
  const savedPlans = [];
  window.J4M.savedPlans = savedPlans;

  /** Working state of the open dialog. */
  const form = {
    childId: null,
    subjects: [],          // chosen subjects, in order: [{ name, topic }]
    subjectQuery: "",      // what is typed in the subject search box
    durationMode: "days",  // "lesson" or "days"
    days: 5,               // slider value, 1 to LG.MAX_DAYS
    lessonMinutes: "",
    startDate: nextSchoolDay(),
    references: [],
    refKind: "link",
    useOpenReferences: true,
    useStandards: true,
  };

  let controller = null;   // AbortController for the running generation

  // =========================================================================
  // Small helpers
  // =========================================================================

  /** Today if it is a weekday, otherwise the next Monday, as "YYYY-MM-DD". */
  function nextSchoolDay() {
    const d = new Date();
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  /** Escapes text, then turns **word** into bold. */
  function rich(text) {
    return esc(text || "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /** Renders a list of strings as <li> items (empty strings skipped). */
  function listItems(items) {
    return (items || []).filter(Boolean).map((t) => `<li>${rich(t)}</li>`).join("");
  }

  /** Shows a short message; inside the open dialog it appears in the footer. */
  function notify(message) {
    const notice = document.getElementById("genNotice");
    const dialog = document.getElementById("genDialog");
    if (notice && dialog && dialog.open) { notice.textContent = message; return; }
    toast(message);
  }

  function selectedChild() {
    return KIDS.find((k) => k.id === form.childId) || null;
  }

  /** Converts the dialog state into the choices object the engine expects. */
  function currentChoices() {
    return {
      child: selectedChild(),
      subjects: form.subjects.map((s) => ({ name: s.name, topic: s.topic })),
      duration: form.durationMode,
      days: form.days,
      lessonMinutes: form.lessonMinutes ? Number(form.lessonMinutes) : undefined,
      startDate: form.startDate,
      references: form.references,
      useOpenReferences: form.useOpenReferences,
      useStandards: form.useStandards,
      standards: { state: "New Jersey", framework: "New Jersey Student Learning Standards (NJSLS)" },
    };
  }

  // =========================================================================
  // The dialog
  // =========================================================================

  /** Creates the <dialog> element once and keeps it in the page. */
  function ensureDialog() {
    let dialog = document.getElementById("genDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "genDialog";
    dialog.className = "gen-dialog";
    dialog.setAttribute("aria-labelledby", "genTitle");
    document.body.appendChild(dialog);
    dialog.addEventListener("cancel", (e) => {
      // Escape during a run would hide the progress; ask them to use Stop.
      if (controller) e.preventDefault();
    });
    dialog.addEventListener("click", onDialogClick);
    dialog.addEventListener("input", onDialogInput);
    dialog.addEventListener("change", onDialogInput);
    dialog.addEventListener("submit", onDialogSubmit);
    dialog.addEventListener("keydown", onSubjectKeydown);
    // Keep the list open while an option is being clicked.
    dialog.addEventListener("mousedown", (e) => { if (e.target.closest("[data-subject-pick]")) e.preventDefault(); });
    dialog.addEventListener("focusout", (e) => {
      if (e.target.id === "genSubjectSearch") { activeOption = -1; renderSubjectOptions(false); }
    });
    return dialog;
  }

  /** Opens the dialog, optionally with a child already chosen. */
  function openDialog(childId) {
    if (childId) form.childId = childId;
    if (!form.childId && state && state.kid) form.childId = state.kid;
    const dialog = ensureDialog();
    renderForm();
    if (!dialog.open) dialog.showModal();
  }

  function closeDialog() {
    const dialog = document.getElementById("genDialog");
    if (dialog && dialog.open) dialog.close();
  }

  /** Draws the choices form. */
  function renderForm(errors) {
    const dialog = ensureDialog();
    const child = selectedChild();
    const autoMinutes = child ? LG.MINUTES_BY_ATTENTION[child.attention] || 30 : 30;
    dialog.innerHTML = `
    <form method="dialog" class="gen-form" id="genForm" novalidate>
      <header class="gen-head">
        <div><span class="eyebrow">My Classroom</span><h2 id="genTitle">Lesson generator</h2>
        <p class="slots">Plans, readings, worksheets, a quiz and answer keys, fact-checked before your child sees them.</p></div>
        <button type="button" class="gen-x" data-gen-close aria-label="Close">×</button>
      </header>

      ${errors && errors.length ? `<div class="gen-errors" role="alert"><b>Before you generate:</b><ul>${errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>` : ""}

      <fieldset class="gen-field">
        <legend>1. Who is it for?</legend>
        <div class="gen-kids">${KIDS.map((k) => `
          <label class="gen-kid">
            <input type="radio" name="genChild" value="${k.id}" ${form.childId === k.id ? "checked" : ""}>
            ${avatar(k)}<span><b>${esc(k.nick)}</b><small>${k.gradeLabel} · ${esc(k.reading)} · ${k.attention} attention</small></span>
          </label>`).join("")}</div>
      </fieldset>

      <fieldset class="gen-field">
        <legend>2. Subjects <span class="opt">add one or more</span></legend>
        <div class="gen-combo">
          <input type="text" id="genSubjectSearch" class="gen-combo-input" role="combobox" autocomplete="off"
            aria-autocomplete="list" aria-expanded="false" aria-controls="genSubjectList"
            aria-label="Search subjects" value="${esc(form.subjectQuery)}"
            ${form.subjects.length >= MAX_SUBJECTS ? "disabled placeholder=\"Up to " + MAX_SUBJECTS + " subjects per unit\"" : `placeholder="${form.subjects.length ? "Add another subject" : "Type to search, e.g. geology, algebra, Spanish"}"`}>
          <svg class="gen-combo-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <ul class="gen-options" id="genSubjectList" role="listbox" aria-label="Subjects" hidden></ul>
        </div>
        ${form.subjects.length ? `<ol class="gen-chosen" aria-label="Chosen subjects">${form.subjects.map((sub, i) => `
          <li>
            <span class="gen-chosen-name">${esc(sub.name)}</span>
            <input type="text" class="gen-topic" id="genTopic${i}" data-topic-index="${i}" value="${esc(sub.topic)}"
              placeholder="Topic (optional), e.g. ${esc(topicExample(sub.name))}" aria-label="${esc(sub.name)} topic">
            <button type="button" class="gen-ref-x" data-subject-remove="${i}" aria-label="Remove ${esc(sub.name)}">Remove</button>
          </li>`).join("")}</ol>` : ""}
        <p class="slots">Leave a topic blank and LPBot picks one from ${child ? esc(child.nick) + "'s" : "the child's"} grade, standards and interests.</p>
      </fieldset>

      <fieldset class="gen-field">
        <legend>3. How long?</legend>
        <div class="gen-length">
          <button type="button" class="gen-lesson-btn" id="genLessonBtn" aria-pressed="${form.durationMode === "lesson"}">Single lesson</button>
          <div class="gen-slider ${form.durationMode === "lesson" ? "is-off" : ""}" id="genSliderBox">
            <div class="gen-slider-top">
              <label for="genDays">Or plan by the day</label>
              <output id="genDaysOut" for="genDays">${esc(daysSummary())}</output>
            </div>
            <input type="range" id="genDays" min="1" max="${LG.MAX_DAYS}" step="1" value="${form.days}" style="--pct:${sliderPercent()}%" aria-valuetext="${esc(LG.describeDuration("days", form.days).label)}">
            <div class="gen-ticks" aria-hidden="true">${Array.from({ length: LG.MAX_DAYS }, (_, i) => `<span class="${i + 1 === 5 || i + 1 === 10 ? "major" : ""}">${i + 1}</span>`).join("")}</div>
          </div>
        </div>
        <div class="gen-row">
          <label class="field" for="genStart">Start on<input type="date" id="genStart" value="${esc(form.startDate)}"></label>
          <label class="field" for="genMinutes">Lesson length
            <select id="genMinutes">
              <option value="" ${!form.lessonMinutes ? "selected" : ""}>Auto: ${autoMinutes} min${child ? " (" + child.attention.toLowerCase() + " attention span)" : ""}</option>
              ${[20, 30, 45, 60].map((m) => `<option value="${m}" ${String(form.lessonMinutes) === String(m) ? "selected" : ""}>${m} minutes</option>`).join("")}
            </select></label>
        </div>
        <p class="slots" id="genDurationNote">${esc(durationNote())}</p>
      </fieldset>

      <fieldset class="gen-field">
        <legend>4. Reference sources <span class="opt">optional</span></legend>
        ${form.references.length ? `<ul class="gen-refs">${form.references.map((r, i) => `
          <li><span class="chip ${r.kind === "link" ? "chip-sky" : "chip-leaf"}">${r.kind === "link" ? "Link" : "Text"}</span>
            <span class="gen-ref-title">${esc(r.title)}${r.url ? `<small>${esc(r.url)}</small>` : `<small>${r.content.length.toLocaleString()} characters</small>`}</span>
            <button type="button" class="gen-ref-x" data-ref-remove="${i}" aria-label="Remove ${esc(r.title)}">Remove</button></li>`).join("")}</ul>` : ""}
        <div class="gen-tabs" role="tablist">
          ${[["link", "Add a link"], ["text", "Paste text"], ["file", "Upload a file"]].map(([k, l]) => `<button type="button" role="tab" aria-selected="${form.refKind === k}" data-ref-kind="${k}">${l}</button>`).join("")}
        </div>
        <div class="gen-refadd">
          ${form.refKind === "link" ? `
            <input type="text" id="refTitle" placeholder="Title, e.g. CK-12 Earth Science, Chapter 4" aria-label="Reference title">
            <input type="url" id="refUrl" placeholder="https://..." aria-label="Reference link">
            <button type="button" class="btn btn-ghost" data-ref-add>Add link</button>
            <p class="slots">The agents cite links by title. To have a page's actual content used, paste the passage instead.</p>` : ""}
          ${form.refKind === "text" ? `
            <input type="text" id="refTitle" placeholder="Title, e.g. Our field guide, pages 12 to 15" aria-label="Reference title">
            <textarea id="refText" rows="4" placeholder="Paste the passage you want the lessons built on"></textarea>
            <button type="button" class="btn btn-ghost" data-ref-add>Add text</button>` : ""}
          ${form.refKind === "file" ? `
            <input type="file" id="refFile" accept=".txt,.md,.markdown,.csv,.html,.htm,text/plain,text/markdown,text/csv,text/html">
            <p class="slots">Text files (.txt, .md, .csv, .html). For a PDF or Word file, copy the passage and use Paste text.</p>` : ""}
        </div>
        <label class="gen-check"><input type="checkbox" id="genOpenRefs" ${form.useOpenReferences ? "checked" : ""}> Also use trusted open references (CK-12, OpenStax, NASA, USGS, Smithsonian, Khan Academy)</label>
        <label class="gen-check"><input type="checkbox" id="genStandards" ${form.useStandards ? "checked" : ""}> Align to New Jersey standards (CompBot)</label>
      </fieldset>

      <footer class="gen-foot">
        <span class="gen-notice" id="genNotice" role="status"></span><span class="slots" id="genEstimate">${esc(estimateText())}</span>
        <div class="gen-actions">
          <button type="button" class="btn btn-ghost" data-gen-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Generate</button>
        </div>
      </footer>
    </form>`;
  }

  /** A sample topic for the placeholder next to each chosen subject. */
  function topicExample(subject) {
    const examples = {
      "Science": "rocks and minerals", "Earth Science": "the water cycle", "Life Science": "food webs",
      "Physical Science": "forces and motion", "Biology": "cells", "Chemistry": "the periodic table", "Physics": "simple machines",
      "Math": "fractions", "Pre-Algebra": "ratios and rates", "Algebra": "linear equations", "Geometry": "area and volume",
      "Statistics and Probability": "mean, median and mode", "English Language Arts": "mystery story structure",
      "Reading": "main idea and details", "Writing": "persuasive paragraphs", "Literature": "poetry",
      "Social Studies": "communities", "U.S. History": "the Constitution", "World History": "ancient Egypt",
      "Geography": "map projections", "Civics and Government": "the three branches", "Economics": "supply and demand",
      "Spanish": "greetings", "French": "numbers and colors", "Art": "color theory", "Music": "rhythm",
      "Computer Science": "algorithms", "Health": "nutrition", "Physical Education": "teamwork games",
    };
    return examples[subject] || "a focus area";
  }

  /** The slider's readout, e.g. "5 days · 1 week · Mon, Oct 26 to Fri, Oct 30". */
  function daysSummary() {
    const label = LG.describeDuration("days", form.days).label;
    const dates = LG.schoolDayLabels(form.startDate, form.days);
    const count = form.days + (form.days === 1 ? " day" : " days");
    const span = dates.length > 1 ? dates[0] + " to " + dates[dates.length - 1] : dates[0];
    return (label === count ? count : count + " · " + label) + (span ? " · " + span : "");
  }

  function durationNote() {
    const subjectCount = form.subjects.length;
    if (form.durationMode === "lesson") {
      return subjectCount > 1
        ? "One cross-curricular lesson that teaches all your subjects together, ending with an exit ticket."
        : "One lesson with an exit ticket.";
    }
    const start = subjectCount > 1 ? "Each subject gets one lesson a day" : "One lesson a day";
    const span = form.days === 1 ? "1 school day" : form.days + " school days";
    if (form.days >= LG.MIN_LESSONS_FOR_QUIZ) {
      return `${start} for ${span}; the last day is a review with a 25-point quiz.`;
    }
    return `${start} for ${span}, each ending with an exit ticket.`;
  }

  /** The footer line: what will be made and roughly how long it takes. */
  function estimateText() {
    const built = LG.buildRequest(currentChoices());
    if (!built.ok) return "Choose a child, at least one subject and a length.";
    const r = built.request;
    const e = LG.estimateWork(r);
    return `${r.unitPlans.length} unit${r.unitPlans.length > 1 ? "s" : ""} · ${r.lessonCount} lesson${r.lessonCount > 1 ? "s" : ""} each · about ${e.requests} AI steps, roughly ${e.minutes} min`;
  }

  /** How far along the slider track the thumb sits, for the filled part. */
  function sliderPercent() {
    return ((form.days - 1) / (LG.MAX_DAYS - 1)) * 100;
  }

  /** Updates the length readouts in place, so dragging the slider is smooth. */
  function refreshLength() {
    const out = document.getElementById("genDaysOut");
    const slider = document.getElementById("genDays");
    const box = document.getElementById("genSliderBox");
    const button = document.getElementById("genLessonBtn");
    if (out) out.textContent = daysSummary();
    if (slider) {
      slider.setAttribute("aria-valuetext", LG.describeDuration("days", form.days).label);
      slider.style.setProperty("--pct", sliderPercent() + "%");
    }
    if (box) box.classList.toggle("is-off", form.durationMode === "lesson");
    if (button) button.setAttribute("aria-pressed", String(form.durationMode === "lesson"));
    const note = document.getElementById("genDurationNote");
    if (note) note.textContent = durationNote();
    const estimate = document.getElementById("genEstimate");
    if (estimate) estimate.textContent = estimateText();
  }

  // --- subject search box ----------------------------------------------------

  const MAX_SUBJECTS = 4;
  let activeOption = -1;   // highlighted option in the open list

  /** The options to show for the current search text. */
  function subjectOptions() {
    const typed = form.subjectQuery.trim();
    const chosen = form.subjects.map((s) => s.name);
    const matches = LG.searchSubjects(typed, chosen).slice(0, 8).map((name) => ({ name, custom: false }));
    const exact = matches.some((m) => m.name.toLowerCase() === typed.toLowerCase()) ||
      chosen.some((n) => n.toLowerCase() === typed.toLowerCase());
    if (typed && !exact) matches.push({ name: typed, custom: true });
    return matches;
  }

  /** Draws (or hides) the dropdown under the search box. */
  function renderSubjectOptions(open) {
    const input = document.getElementById("genSubjectSearch");
    const list = document.getElementById("genSubjectList");
    if (!input || !list) return;
    const options = open ? subjectOptions() : [];
    if (activeOption >= options.length) activeOption = options.length - 1;
    list.innerHTML = options.length
      ? options.map((o, i) => `<li role="option" id="genOpt${i}" class="${i === activeOption ? "active" : ""}" aria-selected="${i === activeOption}" data-subject-pick="${esc(o.name)}">${o.custom ? `Add “<b>${esc(o.name)}</b>” as a subject` : highlight(o.name, form.subjectQuery.trim())}</li>`).join("")
      : "";
    list.hidden = !options.length;
    input.setAttribute("aria-expanded", String(!!options.length));
    if (activeOption >= 0 && options.length) input.setAttribute("aria-activedescendant", "genOpt" + activeOption);
    else input.removeAttribute("aria-activedescendant");
    const active = list.querySelector(".active");
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  /** Bolds the typed letters inside a subject name. */
  function highlight(name, typed) {
    const at = typed ? name.toLowerCase().indexOf(typed.toLowerCase()) : -1;
    if (at < 0) return esc(name);
    return esc(name.slice(0, at)) + "<b>" + esc(name.slice(at, at + typed.length)) + "</b>" + esc(name.slice(at + typed.length));
  }

  /** Adds a subject to the list and puts the cursor back in the search box. */
  function addSubject(name) {
    const clean = String(name || "").trim();
    if (!clean) return;
    if (form.subjects.length >= MAX_SUBJECTS) { notify("Choose up to " + MAX_SUBJECTS + " subjects per unit."); return; }
    if (form.subjects.some((s) => s.name.toLowerCase() === clean.toLowerCase())) { notify(clean + " is already on the list."); return; }
    form.subjects.push({ name: clean, topic: "" });
    form.subjectQuery = "";
    activeOption = -1;
    renderForm();
    const input = document.getElementById("genSubjectSearch");
    if (input && !input.disabled) input.focus();
  }

  function onSubjectKeydown(e) {
    if (e.target.id !== "genSubjectSearch") return;
    const options = subjectOptions();
    const list = document.getElementById("genSubjectList");
    const isOpen = list && !list.hidden;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeOption = isOpen ? Math.min(activeOption + 1, options.length - 1) : 0;
      renderSubjectOptions(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeOption = Math.max(activeOption - 1, 0);
      renderSubjectOptions(true);
    } else if (e.key === "Enter") {
      e.preventDefault(); // never submit the form from the search box
      const pick = options[activeOption >= 0 ? activeOption : 0];
      if (pick) addSubject(pick.name);
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      e.stopPropagation(); // close the list, not the dialog
      activeOption = -1;
      renderSubjectOptions(false);
    }
  }

  // --- dialog events --------------------------------------------------------

  function onDialogInput(e) {
    const t = e.target;
    if (t.name === "genChild") { form.childId = t.value; renderForm(); return; }
    if (t.id === "genSubjectSearch") {
      form.subjectQuery = t.value;
      activeOption = t.value.trim() ? 0 : -1;
      renderSubjectOptions(true);
      return;
    }
    if (t.dataset.topicIndex !== undefined) {
      const sub = form.subjects[Number(t.dataset.topicIndex)];
      if (sub) sub.topic = t.value;
      return; // no re-render while typing
    }
    if (t.id === "genDays") {
      form.days = Number(t.value);
      form.durationMode = "days";
      refreshLength();
      return;
    }
    if (t.id === "genStart") { form.startDate = t.value; refreshLength(); return; }
    if (t.id === "genMinutes") { form.lessonMinutes = t.value; refreshLength(); return; }
    if (t.id === "genOpenRefs") { form.useOpenReferences = t.checked; return; }
    if (t.id === "genStandards") { form.useStandards = t.checked; refreshLength(); return; }
    if (t.id === "refFile" && t.files && t.files[0]) { readReferenceFile(t.files[0]); }
  }

  function onDialogClick(e) {
    const pick = e.target.closest("[data-subject-pick]");
    if (pick) { addSubject(pick.dataset.subjectPick); return; }
    if (e.target.id === "genSubjectSearch") { renderSubjectOptions(true); return; }
    const t = e.target.closest("button");
    if (!t) return;
    if (t.id === "genLessonBtn") {
      form.durationMode = form.durationMode === "lesson" ? "days" : "lesson";
      refreshLength();
      return;
    }
    if (t.dataset.subjectRemove !== undefined) {
      form.subjects.splice(Number(t.dataset.subjectRemove), 1);
      renderForm();
      const input = document.getElementById("genSubjectSearch");
      if (input) input.focus();
      return;
    }
    if (t.hasAttribute("data-gen-close")) { closeDialog(); return; }
    if (t.dataset.refKind) { form.refKind = t.dataset.refKind; renderForm(); return; }
    if (t.hasAttribute("data-ref-add")) { addReferenceFromInputs(); return; }
    if (t.dataset.refRemove !== undefined) { form.references.splice(Number(t.dataset.refRemove), 1); renderForm(); return; }
    if (t.hasAttribute("data-gen-stop")) { if (controller) controller.abort(); return; }
    if (t.hasAttribute("data-gen-sample")) { finishWith(window.J4M.SAMPLE_UNIT, true); return; }
    if (t.hasAttribute("data-gen-back")) { renderForm(); return; }
  }

  function addReferenceFromInputs() {
    const title = (document.getElementById("refTitle") || {}).value || "";
    if (form.refKind === "link") {
      const url = ((document.getElementById("refUrl") || {}).value || "").trim();
      if (!/^https?:\/\/\S+\.\S+/.test(url)) { notify("Enter a full link starting with https://"); return; }
      form.references.push({ kind: "link", title: title.trim() || url, url, content: "" });
    } else {
      const text = ((document.getElementById("refText") || {}).value || "").trim();
      if (text.length < 40) { notify("Paste at least a few sentences"); return; }
      form.references.push({ kind: "text", title: title.trim() || "Pasted passage", url: "", content: text });
    }
    renderForm();
  }

  function readReferenceFile(file) {
    if (file.size > 400000) { notify("That file is too large. Paste the part you need instead."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      let text = String(reader.result || "");
      if (/\.html?$/i.test(file.name)) {
        const doc = new DOMParser().parseFromString(text, "text/html");
        text = doc.body ? doc.body.textContent : text;
      }
      text = text.replace(/\s+\n/g, "\n").trim();
      if (!text) { notify("That file has no readable text."); return; }
      form.references.push({ kind: "text", title: file.name, url: "", content: text });
      form.refKind = "text";
      renderForm();
      if (text.length > 12000) notify("Only the first 12,000 characters will be used.");
    };
    reader.onerror = () => notify("That file couldn't be read.");
    reader.readAsText(file);
  }

  function onDialogSubmit(e) {
    e.preventDefault();
    const built = LG.buildRequest(currentChoices());
    if (!built.ok) { renderForm(built.errors); return; }
    runGeneration(built.request);
  }

  // =========================================================================
  // Running and progress
  // =========================================================================

  async function runGeneration(request) {
    const dialog = ensureDialog();
    const steps = [];
    dialog.innerHTML = `
      <div class="gen-form">
        <header class="gen-head"><div><span class="eyebrow">Lesson generator</span><h2 id="genTitle">Building ${esc(request.child.nick)}'s ${esc(request.durationLabel.toLowerCase())} of ${esc(request.unitPlans.map((u) => u.name).join(", "))}</h2>
          <p class="slots" id="genMode">Connecting to Claude…</p></div></header>
        <ol class="gen-log" id="genLog" aria-live="polite"></ol>
        <footer class="gen-foot"><span class="slots">You can keep this open; it works through each agent in turn.</span>
          <div class="gen-actions"><button type="button" class="btn btn-ghost" data-gen-stop>Stop</button></div></footer>
      </div>`;

    const log = document.getElementById("genLog");
    const onStep = (s) => {
      // One line per agent per unit: update it in place as work continues.
      const key = s.unit + "|" + s.agent;
      let entry = steps.find((x) => x.key === key && x.state === "working");
      if (!entry) { entry = { key, el: document.createElement("li") }; steps.push(entry); log.appendChild(entry.el); }
      entry.state = s.state;
      entry.el.className = "gen-step " + s.state;
      entry.el.innerHTML = `<span class="dot" aria-hidden="true">${s.state === "done" ? "✓" : s.state === "warn" ? "!" : ""}</span><span class="who">${esc(s.agent)}</span><span class="what">${request.unitPlans.length > 1 ? `<b>${esc(s.unit)}:</b> ` : ""}${esc(s.message)}</span>`;
      entry.el.scrollIntoView({ block: "nearest" });
    };

    const ai = await LG.createArtifactClient().catch(() => null);
    const mode = document.getElementById("genMode");
    if (!ai) {
      showUnavailable(request);
      return;
    }
    mode.textContent = "Live: each step is a request to Claude. Your first one may ask permission.";

    controller = new AbortController();
    try {
      const plan = await LG.generate(ai, request, { onStep, signal: controller.signal });
      controller = null;
      finishWith(plan, false);
    } catch (error) {
      controller = null;
      const code = error && error.code;
      const message = LG.messageForError(code);
      const offerSample = code === "not_granted" || code === "sampling_disabled" || code === "capability_disabled" || code === "not_declared";
      const foot = dialog.querySelector(".gen-foot");
      foot.innerHTML = `<span class="slots gen-err" role="alert">${esc(message)}</span>
        <div class="gen-actions"><button type="button" class="btn btn-ghost" data-gen-back>Back to choices</button>
        ${offerSample ? `<button type="button" class="btn btn-primary" data-gen-sample>View the sample unit</button>` : `<button type="button" class="btn btn-primary" data-gen-retry>Try again</button>`}</div>`;
      const retry = foot.querySelector("[data-gen-retry]");
      if (retry) retry.addEventListener("click", (e) => { e.preventDefault(); runGeneration(request); });
    }
  }

  /** Outside Claude (e.g. GitHub Pages) there is no AI: offer the sample. */
  function showUnavailable(request) {
    const dialog = ensureDialog();
    const isSampleMatch = request.child.id === "juniper";
    dialog.querySelector("#genMode").textContent = "Live generation isn't available here.";
    dialog.querySelector("#genLog").innerHTML = `
      <li class="gen-note">
        <b>This copy of the demo isn't connected to an AI service.</b>
        In the full product, and in the demo opened inside Claude, the agents write a new unit from your choices.
        Here you can open the finished sample: a one-week Grade 8 geology unit written for Juniper${isSampleMatch ? "" : " (it won't match the child or subjects you picked)"}.
      </li>`;
    dialog.querySelector(".gen-foot").innerHTML = `<span class="slots"></span><div class="gen-actions">
      <button type="button" class="btn btn-ghost" data-gen-back>Back to choices</button>
      <button type="button" class="btn btn-primary" data-gen-sample>View the sample unit</button></div>`;
  }

  /** Saves the plan, closes the dialog and opens the viewer. */
  function finishWith(plan, isSample) {
    const copy = JSON.parse(JSON.stringify(plan));
    if (isSample) copy.id = "sample-" + Date.now().toString(36);
    savedPlans.unshift(copy);
    closeDialog();
    openViewer(copy.id);
    if (typeof renderTab === "function" && state.tab === "plans") renderTab();
    toast(isSample ? "Sample unit opened" : "Unit saved to " + copy.childNick + "'s lesson plans");
  }

  // =========================================================================
  // Unit viewer
  // =========================================================================

  const viewer = { planId: null, unitIndex: 0, section: "overview" };

  function openViewer(planId) {
    viewer.planId = planId;
    viewer.unitIndex = 0;
    viewer.section = "overview";
    let el = document.getElementById("unitViewer");
    if (!el) {
      el = document.createElement("div");
      el.id = "unitViewer";
      el.className = "uv";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-labelledby", "uvTitle");
      document.body.appendChild(el);
      el.addEventListener("click", onViewerClick);
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) closeViewer(); });
    }
    el.hidden = false;
    document.body.classList.add("uv-open");
    renderViewer();
    const close = el.querySelector("[data-uv-close]");
    if (close) close.focus();
  }

  function closeViewer() {
    const el = document.getElementById("unitViewer");
    if (el) el.hidden = true;
    document.body.classList.remove("uv-open");
  }

  function currentPlan() {
    return savedPlans.find((p) => p.id === viewer.planId) || null;
  }

  function onViewerClick(e) {
    const t = e.target.closest("button");
    if (!t) return;
    if (t.hasAttribute("data-uv-close")) { closeViewer(); return; }
    if (t.dataset.uvUnit !== undefined) { viewer.unitIndex = Number(t.dataset.uvUnit); viewer.section = "overview"; renderViewer(); return; }
    if (t.dataset.uvSection) { viewer.section = t.dataset.uvSection; renderViewer(); document.querySelector(".uv-body").scrollTop = 0; return; }
    if (t.hasAttribute("data-uv-word")) { downloadWord(currentPlan(), t); return; }
  }

  function sectionList(unit) {
    const list = [["overview", "Overview"]];
    unit.lessons.forEach((l, i) => list.push(["lesson-" + i, `${l.dayLabel ? l.dayLabel.split(",")[0] + " · " : ""}${l.title}`]));
    if (unit.quiz) list.push(["quiz", "Unit quiz"]);
    list.push(["keys", "Answer keys"], ["sources", "Sources and accuracy"], ["review", "Review log"]);
    return list;
  }

  function renderViewer() {
    const plan = currentPlan();
    const el = document.getElementById("unitViewer");
    if (!plan || !el) return;
    const unit = plan.units[viewer.unitIndex];
    const sections = sectionList(unit);
    const kid = KIDS.find((k) => k.id === plan.childId);
    el.innerHTML = `
      <div class="uv-top">
        <div class="uv-id">${kid ? avatar(kid) : ""}<div><span class="eyebrow">${esc(plan.childNick)} · ${esc(plan.gradeLabel)} · ${esc(plan.durationLabel)} · ${plan.lessonMinutes} min lessons</span>
          <h2 id="uvTitle">${esc(unit.title)}</h2></div></div>
        <div class="uv-actions">
          <span class="chip ${plan.mode === "sample" ? "chip-sun" : unit.review.status === "ready" ? "chip-leaf" : "chip-berry"}">${plan.mode === "sample" ? "Sample unit" : unit.review.status === "ready" ? "Ready to assign" : "Needs your review"}</span>
          <button type="button" class="btn btn-ghost" data-uv-word>Download Word</button>
          <button type="button" class="btn btn-primary" data-uv-close>Close</button>
        </div>
      </div>
      ${plan.units.length > 1 ? `<div class="uv-units" role="tablist">${plan.units.map((u, i) => `<button type="button" role="tab" aria-selected="${i === viewer.unitIndex}" data-uv-unit="${i}">${esc(u.subject)}</button>`).join("")}</div>` : ""}
      <div class="uv-main">
        <nav class="uv-nav" aria-label="Unit sections">${sections.map(([id, label]) => `<button type="button" data-uv-section="${id}" aria-current="${viewer.section === id}">${esc(label)}</button>`).join("")}</nav>
        <article class="uv-body">${renderSection(plan, unit)}</article>
      </div>`;
  }

  function renderSection(plan, unit) {
    const s = viewer.section;
    if (s === "overview") return renderOverview(plan, unit);
    if (s.indexOf("lesson-") === 0) return renderLesson(unit, unit.lessons[Number(s.slice(7))]);
    if (s === "quiz") return renderQuiz(unit.quiz);
    if (s === "keys") return renderKeys(unit);
    if (s === "sources") return renderSources(unit);
    if (s === "review") return renderReview(plan, unit);
    return "";
  }

  function renderOverview(plan, unit) {
    return `
      ${plan.mode === "sample" ? `<p class="uv-banner">This is the sample unit, adapted from the Grade 8 geology week. In the full product the agents write a new unit from your choices.</p>` : ""}
      <p class="uv-kicker">${esc(unit.subtitle || unit.subject)}</p>
      <p class="uv-lede">${rich(unit.overview)}</p>
      <h3>Week at a glance</h3>
      <div class="tscroll"><table class="uv-table"><thead><tr><th>Day</th><th>Lesson</th><th>Big question</th><th>Work</th></tr></thead><tbody>
        ${unit.lessons.map((l, i) => `<tr><td><b>${esc(l.dayLabel)}</b></td><td><button type="button" class="uv-link" data-uv-section="lesson-${i}">${esc(l.title)}</button></td><td>${esc(l.bigQuestion)}</td><td>${esc(l.worksheet.title || "Worksheet")}${unit.quiz && i === unit.lessons.length - 1 ? "; unit quiz" : "; exit ticket"}</td></tr>`).join("")}
      </tbody></table></div>
      <h3>Learning goals</h3><ul class="uv-list">${listItems(unit.goals)}</ul>
      ${unit.standards ? `<h3>Standards alignment</h3><p class="slots">${esc(unit.standards.framework)}</p>
        <div class="tscroll"><table class="uv-table"><thead><tr><th>Code</th><th>Standard</th><th>Where</th></tr></thead><tbody>
        ${unit.standards.items.map((st) => `<tr><td><span class="chip chip-leaf std">${esc(st.code)}</span></td><td>${esc(st.text)}</td><td>${esc(st.where)}</td></tr>`).join("")}</tbody></table></div>
        ${unit.standards.practices ? `<p class="slots">${esc(unit.standards.practices)}</p>` : ""}
        ${unit.standards.gaps && unit.standards.gaps.length ? `<p class="slots"><b>Not mapped:</b> ${esc(unit.standards.gaps.join("; "))}</p>` : ""}` : ""}
      <h3>Materials</h3><ul class="uv-list">${listItems(unit.materials)}</ul>
      ${unit.safetyNote ? `<div class="uv-box uv-safety"><b>Safety note</b><p>${rich(unit.safetyNote)}</p></div>` : ""}`;
  }

  function renderLesson(unit, l) {
    if (!l) return "";
    return `
      <p class="uv-kicker">Lesson ${l.n} · ${esc(l.dayLabel)}</p>
      <h2 class="uv-h">${esc(l.title)}</h2>
      <p class="uv-lede">${rich(l.summary)}</p>
      <div class="tscroll"><table class="uv-table uv-kv"><tbody>
        <tr><th>Objectives</th><td><ul class="uv-list">${listItems(l.objectives)}</ul></td></tr>
        ${l.vocabulary.length ? `<tr><th>Key vocabulary</th><td>${esc(l.vocabulary.join(", "))}</td></tr>` : ""}
        <tr><th>Materials</th><td>${esc(l.materials)}</td></tr>
        <tr><th>Reference</th><td>${esc(l.reference)}</td></tr>
      </tbody></table></div>
      <h3>Lesson plan</h3>
      <div class="tscroll"><table class="uv-table"><thead><tr><th>Time</th><th>Segment</th><th>What you and your child do</th></tr></thead><tbody>
        ${l.segments.map((s) => `<tr><td class="nowrap">${esc(s.time)}</td><td><b>${esc(s.name)}</b></td><td>${rich(s.activity)}</td></tr>`).join("")}
      </tbody></table></div>
      ${l.exitTicket ? `<div class="uv-box"><b>Exit ticket</b><p>${rich(l.exitTicket)}</p></div>` : ""}
      <div class="uv-two">
        <div class="uv-box"><b>Differentiation</b><ul class="uv-list"><li><b>Extra support:</b> ${rich(l.differentiation.support)}</li><li><b>Challenge:</b> ${rich(l.differentiation.challenge)}</li></ul></div>
        ${l.adaptations.length ? `<div class="uv-box uv-adapt"><b>Adapted for ${esc(currentPlan().childNick)}</b><ul class="uv-list">${listItems(l.adaptations)}</ul></div>` : ""}
      </div>
      ${l.reading ? `<section class="uv-reading"><p class="uv-kicker">Student reading</p><h3>${esc(l.reading.title)}</h3>
        ${l.reading.sections.map((sec) => `${sec.heading ? `<h4>${esc(sec.heading)}</h4>` : ""}${sec.paragraphs.map((p) => `<p>${rich(p)}</p>`).join("")}${sec.bullets.length ? `<ul class="uv-list">${listItems(sec.bullets)}</ul>` : ""}`).join("")}
        ${l.reading.keyIdeas.length ? `<div class="uv-box uv-key"><b>Key ideas</b><ul class="uv-list">${listItems(l.reading.keyIdeas)}</ul></div>` : ""}</section>` : ""}
      <section class="uv-sheet"><p class="uv-kicker">Worksheet</p><h3>${esc(l.worksheet.title)}</h3>
        ${l.worksheet.instructions ? `<p><i>${rich(l.worksheet.instructions)}</i></p>` : ""}
        ${l.worksheet.parts.map((p) => `<h4>${esc(p.heading)}</h4>${p.instructions ? `<p>${rich(p.instructions)}</p>` : ""}<ul class="uv-items">${listItems(p.items)}</ul>`).join("")}
      </section>`;
  }

  function renderQuiz(q) {
    if (!q) return "";
    return `<p class="uv-kicker">Unit quiz · ${q.points} points</p><h2 class="uv-h">${esc(q.title)}</h2><p><i>${esc(q.instructions)}</i></p>
      ${q.sections.map((s) => `<h3>${esc(s.heading)}</h3>${s.instructions ? `<p>${esc(s.instructions)}</p>` : ""}
        ${s.definitions && s.definitions.length ? `<ul class="uv-defs">${listItems(s.definitions)}</ul>` : ""}
        <ol class="uv-quiz">${s.items.map((it) => `<li value="${it.n}"><p>${rich(it.prompt)}${!it.choices.length && s.definitions && s.definitions.length ? " ______" : ""}</p>${it.choices.length ? `<ul class="uv-choices">${listItems(it.choices)}</ul>` : ""}</li>`).join("")}</ol>`).join("")}`;
  }

  function renderKeys(unit) {
    return `<p class="uv-kicker">For the parent</p><h2 class="uv-h">Answer keys</h2>
      ${unit.lessons.map((l) => `<h3>Lesson ${l.n} · ${esc(l.worksheet.title || l.title)}</h3><ul class="uv-list">${listItems(l.answerKey.worksheet)}</ul>
        ${l.answerKey.exitTicket ? `<p><b>Exit ticket.</b> ${rich(l.answerKey.exitTicket)}</p>` : ""}`).join("")}
      ${unit.quiz ? `<h3>Unit quiz</h3><div class="uv-answers">${unit.quiz.answers.map((a) => `<span><b>${a.n}</b> ${esc(a.answer)}</span>`).join("")}</div>
        ${unit.quiz.rubric.length ? `<h4>Short-answer rubric</h4><ul class="uv-list">${listItems(unit.quiz.rubric)}</ul>` : ""}
        ${unit.quiz.shortAnswerExamples.map((a) => `<p><b>${a.n}.</b> ${rich(a.answer)}</p>`).join("")}` : ""}`;
  }

  function renderSources(unit) {
    return `<p class="uv-kicker">Sources and accuracy</p><h2 class="uv-h">Sources and accuracy notes</h2>
      <h3>Sources</h3><ul class="uv-list">${unit.sources.map((s) => `<li>${esc(s.citation)}${s.note ? `<br><small>${esc(s.note)}</small>` : ""}</li>`).join("") || "<li>No outside sources were cited.</li>"}</ul>
      <h3>Accuracy notes for the parent</h3>
      ${unit.review.fixes.length ? `<ul class="uv-list">${unit.review.fixes.map((f) => `<li><b>${esc(f.where)}.</b> ${esc(f.problem)} <i>Now reads:</i> “${esc(f.fix)}”${f.source ? ` <small>(${esc(f.source)})</small>` : ""}</li>`).join("")}</ul>` : "<p>FactBot found nothing to correct.</p>"}
      ${unit.misconceptions.length ? `<div class="uv-box"><b>Common misconceptions to listen for</b><ul class="uv-list">${listItems(unit.misconceptions)}</ul></div>` : ""}`;
  }

  function renderReview(plan, unit) {
    const r = unit.review;
    return `<p class="uv-kicker">How this unit was checked</p><h2 class="uv-h">Review log</h2>
      <p class="uv-lede">${esc(r.summary)}</p>
      <ul class="uv-pipeline">
        <li><b>LPBot</b> planned ${unit.lessons.length} lesson(s).</li>
        ${unit.standards ? `<li><b>CompBot</b> mapped ${unit.standards.items.length} standard(s) in ${esc(unit.standards.framework)}.</li>` : "<li><b>CompBot</b> was turned off.</li>"}
        <li><b>TeachBot</b> wrote the readings, worksheets${unit.quiz ? ", quiz" : ""} and answer keys.</li>
        <li><b>FactBot</b> ran ${r.rounds} of ${LG.MAX_FACT_ROUNDS} allowed round(s) and TeachBot applied ${r.fixes.length} correction(s).</li>
        <li><b>SafetyBot</b> ${r.safety.length ? `left ${r.safety.length} note(s): ${esc(r.safety.map((s) => s.concern).join(" "))}` : "found no concerns."}</li>
        <li><b>PrincBot</b> ${r.flags.length ? `sent ${r.flags.length} item(s) to you:` : "approved the unit."}</li>
      </ul>
      ${r.flags.length ? `<div class="review">${r.flags.map((f) => `<div class="card"><div class="chips" style="margin-bottom:.4rem"><span class="chip ${/Accuracy/.test(f.kind) ? "chip-sky" : "chip-berry"}">${esc(f.kind)}</span><span class="chip chip-plain">${esc(f.where)}</span></div><p>${esc(f.message)}</p></div>`).join("")}</div>` : ""}`;
  }

  // =========================================================================
  // Word download
  // =========================================================================

  /** Loads the docx library the first time it is needed. */
  function loadDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";
      script.onload = () => (window.docx ? resolve(window.docx) : reject(new Error("docx missing")));
      script.onerror = () => reject(new Error("docx failed to load"));
      document.head.appendChild(script);
    });
  }

  async function downloadWord(plan, button) {
    if (!plan) return;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = "Preparing…";
    try {
      const d = await loadDocx();
      const blob = await d.Packer.toBlob(buildDocument(d, plan));
      const name = `${plan.childNick} - ${plan.units.map((u) => u.title).join(" + ")}.docx`.replace(/[\\/:*?"<>|]/g, "");
      await saveFile(name, blob);
    } catch (error) {
      toast(error && error.code === "declined" ? "Download cancelled" : "The Word file couldn't be made. Try again.");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  /** Saves a file through Claude's download prompt, or a normal link elsewhere. */
  async function saveFile(filename, blob) {
    const runtime = window.claude;
    const downloads = runtime && typeof runtime.use === "function" ? await runtime.use("downloads") : null;
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        toast("Word file saved");
      } catch (e) {
        throw Object.assign(new Error("save failed"), { code: e && e.code === "declined" ? "declined" : "failed" });
      }
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Word file downloaded");
  }

  /** Builds the .docx with the same sections as the reference unit. */
  function buildDocument(d, plan) {
    const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType, PageBreak } = d;
    const runs = (text) => String(text || "").split(/(\*\*.+?\*\*)/g).filter(Boolean).map((part) =>
      /^\*\*.+\*\*$/.test(part) ? new TextRun({ text: part.slice(2, -2), bold: true }) : new TextRun(part));
    const p = (text, opts) => new Paragraph(Object.assign({ children: runs(text), spacing: { after: 120 } }, opts || {}));
    const h = (text, level) => new Paragraph({ text, heading: level, spacing: { before: 240, after: 120 } });
    const bullets = (items) => (items || []).filter(Boolean).map((t) => new Paragraph({ children: runs(t), bullet: { level: 0 } }));
    const cell = (text, header) => new TableCell({
      children: [new Paragraph({ children: header ? [new TextRun({ text: String(text || ""), bold: true })] : runs(text) })],
      shading: header ? { type: ShadingType.CLEAR, fill: "E5F4E4", color: "auto" } : undefined,
    });
    const table = (head, rows) => new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ tableHeader: true, children: head.map((t) => cell(t, true)) })]
        .concat(rows.map((r) => new TableRow({ children: r.map((t) => cell(t)) }))),
    });
    const box = (title, items) => [new Paragraph({ children: [new TextRun({ text: title, bold: true })], shading: { type: ShadingType.CLEAR, fill: "F9EEDA", color: "auto" }, spacing: { before: 200 } })]
      .concat(items.map((t) => new Paragraph({ children: runs(t), shading: { type: ShadingType.CLEAR, fill: "F9EEDA", color: "auto" } })));

    const children = [];
    plan.units.forEach((unit, ui) => {
      if (ui > 0) children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(new Paragraph({ children: [new TextRun({ text: `${plan.gradeLabel.toUpperCase()} ${unit.subject.toUpperCase()}`, bold: true, color: "2F7D5B" })] }));
      children.push(new Paragraph({ text: unit.title, heading: HeadingLevel.TITLE }));
      children.push(p(`${unit.subtitle || ""} · Written for ${plan.childNick} · ${plan.lessonMinutes}-minute lessons`));
      children.push(h("Unit overview", HeadingLevel.HEADING_1), p(unit.overview));
      children.push(h("Week at a glance", HeadingLevel.HEADING_2));
      children.push(table(["Day", "Lesson", "Big question", "Work"], unit.lessons.map((l, i) => [l.dayLabel, l.title, l.bigQuestion, (l.worksheet.title || "Worksheet") + (unit.quiz && i === unit.lessons.length - 1 ? "; unit quiz" : "; exit ticket")])));
      children.push(h("Learning goals", HeadingLevel.HEADING_2), ...bullets(unit.goals));
      if (unit.standards && unit.standards.items.length) {
        children.push(h("Standards alignment", HeadingLevel.HEADING_2), p(unit.standards.framework));
        children.push(table(["Code", "Standard", "Where it appears"], unit.standards.items.map((s) => [s.code, s.text, s.where])));
      }
      children.push(h("Materials", HeadingLevel.HEADING_2), ...bullets(unit.materials));
      if (unit.safetyNote) children.push(...box("Safety note", [unit.safetyNote]));

      unit.lessons.forEach((l) => {
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(new Paragraph({ children: [new TextRun({ text: `LESSON ${l.n} • ${String(l.dayLabel).toUpperCase()}`, bold: true, color: "2F7D5B" })] }));
        children.push(h(l.title, HeadingLevel.HEADING_1), p(l.summary, { italics: true }));
        children.push(table(["", ""], [["Objectives", l.objectives.join(" ")], ["Key vocabulary", l.vocabulary.join(", ")], ["Materials", l.materials], ["Reference", l.reference]]));
        children.push(h("Lesson plan", HeadingLevel.HEADING_2));
        children.push(table(["Time", "Segment", "What you and your child do"], l.segments.map((s) => [s.time, s.name, s.activity])));
        if (l.exitTicket) children.push(...box("Exit ticket", [l.exitTicket]));
        children.push(...box("Differentiation", ["**Extra support:** " + l.differentiation.support, "**Challenge:** " + l.differentiation.challenge]));
        if (l.adaptations.length) children.push(...box("Adapted for " + plan.childNick, l.adaptations));
        if (l.reading) {
          children.push(h("Student reading: " + l.reading.title, HeadingLevel.HEADING_2));
          l.reading.sections.forEach((s) => {
            if (s.heading) children.push(h(s.heading, HeadingLevel.HEADING_3));
            s.paragraphs.forEach((t) => children.push(p(t)));
            children.push(...bullets(s.bullets));
          });
          if (l.reading.keyIdeas.length) children.push(...box("Key ideas", l.reading.keyIdeas));
        }
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(h(l.worksheet.title || "Worksheet", HeadingLevel.HEADING_1));
        if (l.worksheet.instructions) children.push(p(l.worksheet.instructions, { italics: true }));
        children.push(p("Name: ______________________________   Date: _______________"));
        l.worksheet.parts.forEach((part) => {
          children.push(h(part.heading, HeadingLevel.HEADING_3));
          if (part.instructions) children.push(p(part.instructions));
          part.items.forEach((it) => children.push(p(it), p("______________________________________________________________")));
        });
      });

      if (unit.quiz) {
        const q = unit.quiz;
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(h(q.title, HeadingLevel.HEADING_1), p(q.instructions, { italics: true }));
        q.sections.forEach((s) => {
          children.push(h(s.heading, HeadingLevel.HEADING_3));
          if (s.instructions) children.push(p(s.instructions));
          (s.definitions || []).forEach((t) => children.push(p(t)));
          s.items.forEach((it) => {
            children.push(p(`${it.n}. ${it.prompt}${!it.choices.length && s.definitions && s.definitions.length ? "  ______" : ""}`));
            it.choices.forEach((c) => children.push(p(c, { indent: { left: 480 } })));
          });
        });
      }

      children.push(new Paragraph({ children: [new PageBreak()] }));
      children.push(h("Answer keys", HeadingLevel.HEADING_1));
      unit.lessons.forEach((l) => {
        children.push(h(`Lesson ${l.n} • ${l.worksheet.title || l.title}`, HeadingLevel.HEADING_3));
        l.answerKey.worksheet.forEach((t) => children.push(p(t)));
        if (l.answerKey.exitTicket) children.push(p("**Exit ticket.** " + l.answerKey.exitTicket));
      });
      if (unit.quiz) {
        children.push(h("Unit quiz answer key", HeadingLevel.HEADING_3));
        children.push(p(unit.quiz.answers.map((a) => `${a.n}. ${a.answer}`).join("   ")));
        children.push(...bullets(unit.quiz.rubric));
        unit.quiz.shortAnswerExamples.forEach((a) => children.push(p(`**${a.n}.** ${a.answer}`)));
      }
      children.push(h("Sources and accuracy notes", HeadingLevel.HEADING_1));
      children.push(...bullets(unit.sources.map((s) => s.citation + (s.note ? ". " + s.note : ""))));
      children.push(h("Accuracy notes for the parent", HeadingLevel.HEADING_2));
      children.push(...(unit.review.fixes.length ? bullets(unit.review.fixes.map((f) => `**${f.where}.** ${f.problem} Now reads: "${f.fix}".`)) : [p("FactBot found nothing to correct.")]));
      if (unit.misconceptions.length) children.push(...box("Common misconceptions to listen for", unit.misconceptions));
    });

    return new Document({
      creator: "Just4Me Education",
      title: plan.units.map((u) => u.title).join(" + "),
      styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
      sections: [{ children }],
    });
  }

  // =========================================================================
  // Hooks into the rest of the page
  // =========================================================================

  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-gen-open]");
    if (open) { e.preventDefault(); e.stopPropagation(); openDialog(open.dataset.genOpen || null); return; }
    const view = e.target.closest("[data-unit-open]");
    if (view) { e.preventDefault(); e.stopPropagation(); openViewer(view.dataset.unitOpen); }
  }, true);

  /** HTML for the Lesson plans page: this child's generated units. */
  function generatedUnitsCard(childId) {
    const mine = savedPlans.filter((p) => p.childId === childId);
    return `<div class="card gen-saved"><div class="gen-saved-head"><h3 style="margin:0">Generated units</h3>
      <button type="button" class="btn btn-sun" data-gen-open="${childId}">Lesson generator</button></div>
      ${mine.length ? `<ul class="gen-saved-list">${mine.map((p) => `<li><button type="button" class="uv-link" data-unit-open="${p.id}">${esc(p.units.map((u) => u.title).join(" + "))}</button>
        <span class="slots">${esc(p.durationLabel)} · ${p.units.reduce((n, u) => n + u.lessons.length, 0)} lessons · ${p.mode === "sample" ? "sample" : p.status === "ready" ? "ready" : "needs review"}</span></li>`).join("")}</ul>`
        : `<p class="slots">No generated units yet. Use the lesson generator to build a lesson, a day, or a week or two of lessons.</p>`}</div>`;
  }

  window.J4M.generatorUi = { openDialog, openViewer, generatedUnitsCard };
})();
