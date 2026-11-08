# Just4Me Education — Investor Demo

A clickable front-end demo of the Just4Me Education homeschool platform, built for investor presentations.

**All families, children, scores and lesson content are sample data.** Nothing is generated live, and no real data is collected.

## What's in the demo
- Landing page, product tour and member login
- My Classroom portal: Children, Lesson plans (click any day for the detailed plan), Create content, Progress, Review queue
- An example reading level-setting test for the sample child "Bean" (Progress → Bean → Open reading level-setting test)

## New investor demo (November 2026)
A new single-page investor demo lives in `investor/`: parent approval first, a sample week for "Bean" with an animated short, privacy pledge, and the market and ESA case. It is also a mock-up with sample data only. On GitHub Pages it is at `/investor/`.

## Viewing it
Open `index.html` in any browser, or visit the GitHub Pages link for this repository.

## Company domain
The company's domain is **just4meed.com** (bought November 7, 2026). This demo is served from GitHub Pages at https://demo.just4meed.com/ (investor page: https://demo.just4meed.com/investor/).

## Rock Hike Pocket Guide (November 2026)
A phone-first field guide for a Cecil County, Maryland geology hike with tasks for grades 4, 7 and 8 lives in `rock-hike/`. It is one self-contained HTML file (pictures built in). On GitHub Pages it is at `/rock-hike/`. Photos are from the U.S. Geological Survey; drawings were made for the guide.

Multi-phone use (beta feedback, November 2026): on first open each phone picks who uses it (Parent, Grade 4, Grade 7 or Grade 8). Students type answers under their tasks; answers are saved only on that phone (localStorage). On the Answers tab a student taps Send to parent, which makes a link and QR code that carry his answers (compressed, in the URL fragment, so nothing is sent to a server). The parent's phone opens the link or pastes it, merges the newest version of each answer, and can print or share all answers for the portfolio. QR codes use qrcode-generator 1.4.4 by Kazuhiko Arase (MIT license), inlined.
