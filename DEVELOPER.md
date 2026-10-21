# Maintainer handoff · mentor test release

Read [README](README.md) for running/testing and [START-HERE](START-HERE.md) for mentor instructions. This document supplies the product context without containing any original student data.

## Context and decisions

The project owner builds this for mentors, who previously used a third person to download Google Form responses and add scores in a workbook. The mentor's methodology is authoritative; the existing workbook calculations were an implementation with errors. Recalculate from raw data, not exported scores. Scoring is retained because it is established practice, but the product must allow exploration of separate activities and reporting rather than reducing everyone to one ranking or contact list.

The form asks for practice date, name, rounds, reading/hearing durations, last night's bedtime and wake time; Forms adds a timestamp. Names are currently a dropdown in the studied form, but historical free text exists. Reading/hearing had legacy text inputs before becoming durations. Chanting and sleep/wake preset choices still have text Other options. Never assume input is already semantically valid just because the form constrains its presentation.

Important product corrections during development: help was made shorter after the initial dashboard felt overwhelming; zero-report labels now distinguish the selected window from all-file history; date selection uses explicit start/end dates with preset buttons, replacing the confusing length-plus-end-date model. For distribution, real bundled data and a cohort-specific name alias were removed, the roster became an explicit import, and browser-persistent targets became tab-only state.

## Implementation map

`session.js` creates empty state. `app.js` adapts imported worksheets, and `engine.js` parses/flags observations, chooses daily submissions and produces summaries. `app.js` renders those results and owns date controls, filters, modal history and target edits. `help.js` inserts guide markup before app initialization. `dist` is source, not generated output. CSS overrides are layered; preserve their order when consolidating.

Payload fields: `source`, `timezone`, `rosterSource`, `roster` (names), `rows`, `prescriptions` (currently empty). Each row has `row`, `timestamp`, `date`, `name`, `rounds`, `reading`, `hearing`, `sleep`, `wake`. Numeric durations must be tagged `{kind:'minutes', value:30}`; clock minute values can be tagged `{kind:'clock', value:315}`. Invalid values become null, while observed zero remains zero. Source row numbers are preserved for clarification.

The importer recognizes original English/Hindi response headers and skips rows without timestamps. XLSX duration numbers are fractional days; CSV parsing retains plain text so ambiguous bare duration numbers are not treated as day fractions. It replaces responses while keeping the current roster, dates and confirmed tab targets. Roster import replaces the roster; encountered response names are also displayed. There is no fuzzy matching or automatic name aliasing beyond trim/case normalization.

`prepare` retains raw records and flags; only valid non-future dates/timestamps enter daily history. Activity parsing failures leave that component unknown without discarding the report. For duplicate person/date entries, the latest usable timestamp wins; equal timestamps fall back to source row order. Flags remain visible. These policies are provisional, not all rules stated in the methodology.

`summarize(prepared,end,length,targets,axis)` uses length derived from the visible inclusive dates. Coverage uses usable reports / selected days; practice completion uses target-met days / days with readable values. Missing updates are not zero practice. A gap counts empty practice dates backward from the selected end and is capped by the date range. It is not time since a form was submitted. Historical calendars include later-submitted corrections for those practice dates.

Targets default to 16/60/60 and apply to all dates in the current tab. Sleep before noon is assigned to the after-midnight band; exact midnight receives 4 points. Percentages use continuous thresholds. The original written guide did not settle all edge cases, so distinguish these implementation assumptions from mentor-confirmed policy. Exact bands are in README and the app's scoring dialog.

## Test and release discipline

Run `npm test` for engine checks and `npm run test:browser` for fictional-file browser checks. Tests discover an installed Chrome or use CHROME_PATH; browser dependencies are development-only. Tests cover CSV/XLSX duration semantics, roster import, never-submitted students, custom ranges, target edits, help and separate tab/reload state. No account is required to run the app or these tests.

`scripts/package_release.py` uses an explicit file list. Review that list for every release. It excludes development metadata, private analysis and arbitrary additional files. Do not add real mentor exports or screenshots to this repository. Test with fictional inputs. The mentor ZIP can be opened locally; the Pages workflow deploys only `dist`, so use relative bundled assets and self-contained template links.

The current release is 0.1.0; version strings exist in package.json, START-HERE, README, app footer and packaging script. Update them together until version generation is centralized. Release directories/branch-specific sites are intentionally deferred. The default hosted URL will serve the deployed main branch; saved ZIPs provide a fixed downloadable version.

## Limits and open decisions

No enrollment/absence dates, stable IDs, mentor partitions, target effective dates, persistent imports, messaging, automatic Forms refresh, or account system. Large datasets/ranges may be slow. Time parsing assumes local wall time, ignores fractional timestamp seconds/offset semantics, and simple clock averages can be misleading across midnight. The generic decline sort is numerical, so earlier wake times may appear as a decline. Methodology ambiguities and person-name corrections need mentor review, not silent data repair. An application license has not been selected.

Ask mentors to test real workflows on their own systems before adding advanced analytics. Useful feedback includes import failures, roster/coverage confusion, task navigation and browser compatibility. New features should preserve distinctions between missing reports, unknown values, reported zero, and known target completion.
