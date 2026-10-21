# Sadhana mentor dashboard

A browser-based tool for exploring daily sadhana and reporting patterns. Mentor test release **0.1.0**.

## Use it

Download and extract the mentor ZIP, then open `dist/index.html`. No installation, Git, Python, or Node is needed to use the app. [START-HERE.md](START-HERE.md) has the short instructions.

Import your raw Google Form response export (.xlsx, .xls or .csv), then an optional roster with a `Name` column. A roster is necessary to identify students who never submitted. Files in [examples](examples) contain only fictional students; select 18–20 October 2026 to inspect those examples.

The app starts empty. Each tab holds its own responses, roster and target settings in memory. Reloading clears them; nothing is uploaded or saved in browser storage. No login is needed for mentors. Opening Help preserves the current tab's data. There is no live Google Forms connection, cross-device sync or messaging.

## Views and rules

Explore reporting, chanting, reading, hearing, waking, sleeping and score. Calendar squares use practice dates; individual histories also show submission dates and delays. Date presets fill inclusive start/end dates and end yesterday in Asia/Kolkata. Custom dates are editable. Imports keep the selected range.

Missing reports matter, but do not establish zero practice. Practice averages use known reported days. Coverage assumes daily reporting for each listed name; enrollment/absence dates are not modeled. Data quality flags future dates, invalid fields and duplicate person/date submissions. Future/invalid dates are excluded; latest usable submissions win duplicates.

Scores implement the mentor's methodology, independent of calculated spreadsheet columns:

| Component | Bands | Points |
| --- | --- | --- |
| Chanting / personal target | ≥100%, ≥80%, >50%, >0%, zero | 20 / 15 / 10 / 8 / 0 |
| Reading and hearing / personal target | ≥100%, ≥70%, ≥50%, ≥20%, below 20% | 20 / 15 / 10 / 5 / 0 |
| Bedtime | Before 22:00, before 23:00, before midnight, after midnight | 20 / 15 / 8 / 4 |
| Wake time | By 05:00, by 06:00, by 07:00, later | 20 / 15 / 8 / 4 |

Default targets: 16 rounds, 60 minutes reading, 60 minutes hearing. Targets can be changed per student for the current tab. All five readable components are required for a daily total. Midnight and morning bedtimes are assigned to the after-midnight band; continuous percentages resolve gaps in the original written bands. Reporting thresholds and score colours are exploratory UI choices, not additional scoring requirements.

## Development

`dist` is editable source and runnable output: buildless HTML/CSS/JavaScript, with a vendored SheetJS spreadsheet reader. No backend or runtime package installation. Script order is session → engine → help → app, after the spreadsheet library. Engine functions are also CommonJS exports for tests.

- `dist/engine.js`: parsing, normalization, data-quality flags, deduplication and scores/summaries.
- `dist/app.js`: in-memory state, imports, date controls, filtering and rendering.
- `dist/help.js`: quick guide and contextual help links.
- `dist/session.js`: empty new-tab state.
- `tests/`: entirely fictional test inputs.
- `scripts/package_release.py`: explicit allowlist for a mentor ZIP; private development artifacts are excluded.

Use Node 20+ for development tests:

```sh
npm install
npm test
npm run test:browser
```

Browser tests use Playwright Core and an already installed Chrome/Chromium. Set `CHROME_PATH` if its executable is not found automatically. They open the local HTML in an isolated browser profile and test imports, roster-based missing students, dates, target edits, help, tab isolation and mobile layout. They use only fictional students.

Package with Python 3 (standard library only):

```sh
python3 scripts/package_release.py
```

This writes a ZIP into `../releases`. Distribute that ZIP, not the private parent workspace. Older ZIP releases can be kept for testers who need a fixed version.

## Known limits

This is a test release. Names are matched by trimmed, case-insensitive text; spelling aliases need manual source cleanup. CSV dates support ISO or M/D/YYYY. Use explicit durations such as `00:30:00` or `30 min`; bare numeric CSV durations are left unknown. Excel durations use day fractions. Clock parsing assumes local wall time and whole seconds for submission ordering. Bedtime averages around midnight and the generic numerical decline sort need interpretation. Very large files/date ranges may be slow. No enrollment, target-effective-date, or shared persistence model is implemented.

Mentors should confirm individual targets and roster membership before interpreting gaps or scores. Report browser/OS, app version and reproduction steps; use fictional/redacted examples in feedback.

## Distribution and dependencies

Only application files and fictional examples belong in this repository. Real student exports, screenshots, analysis and credentials must remain outside it. Session data is not included in releases.

The vendored SheetJS Community Edition 0.20.3 reader is distributed with its [license](dist/vendor/LICENSE). The project owner's application license has not yet been selected; this is currently a mentor testing distribution.
