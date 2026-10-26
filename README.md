# Just4Me Education — Investor Demo

A clickable demo of the Just4Me Education homeschool platform, built for investor presentations.

**All families, children, scores and lesson content are sample data.** No real data is collected.

## What's in the demo
- Landing page, product tour and member login
- My Classroom portal: Children, Lesson plans (click any day for the detailed plan), Create content, Progress, Review queue
- An example reading level-setting test for the sample child "Bean" (Progress → Bean → Open reading level-setting test)
- **Lesson generator**: a dialog in My Classroom that builds a fact-checked lesson, day, or one- or two-week unit for any child, in any subjects, using the parent's own references. See [docs/weekly-lesson-generator.md](docs/weekly-lesson-generator.md).

## Viewing it
Visit the GitHub Pages link for this repository, or open `index.html` in a browser.
On GitHub Pages the lesson generator shows a finished sample unit; opened inside Claude it generates new units live.

## Working on it
- Edit `src/demo.html` and the files in `js/`, then run `python3 scripts/build-pages.py` to rebuild `index.html`.
- Run the tests with `node --test tests/*.test.js`.
