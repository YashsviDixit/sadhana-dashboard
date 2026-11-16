# Sadhana dashboard · mentor test version 0.1.0

1. Extract the ZIP completely.
2. Open `dist/index.html` in a current desktop browser. No Python, Node, Git or installation is needed to use it.
3. Click **Load data** and choose **Local files** or **Google Sheets**. Local files requires two Excel/CSV exports: daily responses and personal prescriptions. Google Sheets lets you sign in and choose the response sheet and prescription sheet in Google’s file picker, then load both. Google sign-in requires the hosted site or localhost; local files work offline.
4. Clear names and target values are handled automatically. If anything needs clarification, a single review screen shows only those cases with the original evidence. Selected matches are used when you click **Open dashboard**. Use **Choose a different match** to correct a proposed name, **Remove this match** to keep a person unmatched, and **Undo** to reverse an edit. The optional name editor supports drag-and-drop or tap assignment; **Done** returns to review. Clarify unreadable targets beside their original entries, then use **Open dashboard** once. Entries left unresolved stay unavailable. Closing review keeps the previous dashboard unchanged.
5. Optional: open **Settings → Student list** to include students who never submitted. Use an Excel/CSV file with a `Name` heading and one student per row; a template is in `examples/roster.csv`.
6. Choose dates, explore a practice, and click a student's name for their history. “Start here” in the app explains the views.

The two files in `examples` contain entirely fictional students. To try them, import `examples/responses.csv` and `examples/roster.csv`, then select 18–20 October 2026. Example Student C intentionally has no response.

Each tab starts empty. Your imported data and personal target edits stay in that tab's memory. A reload or closing the tab clears them. “Clear this tab” removes them immediately. Local files are not uploaded. Google sign-in grants access only to files you select. Google’s selected-file permission includes editing, but this dashboard only reads the two chosen sources and never edits them. A refresh fetches current contents; it is not a continuous live subscription. If the accepted setup remains applicable, it is kept without repeated confirmations. New identity or target issues reopen the same focused review.

Personal targets come from the prescription source. Confirmed current targets apply across the selected history; they do not establish historical target changes. Review data lets you return to unresolved items or inspect all name matches. Adjusting a target in a student's history overrides the matched prescription for this tab. Missing reports are highlighted without treating practice as zero.

Use **Review values** in the dashboard or **Clarify practice values** in the source panel to clarify an unreadable value. The original response is retained. A correction can optionally apply to identical values in the same field and source; review or remove it in the same screen. Nothing is written back to Google Sheets.

If Google refuses sign-in, check the selected account and whether the Google application is available to it. After authorization expires, sign in and select the two sheets again. If either sheet cannot be refreshed, the previous loaded pair remains available. Source status shows when each sheet was loaded.

Table headings and the first column stay visible while scrolling. Student windows keep their close button visible; click outside, press Escape, or use × to close them.

For a problem, suggestion, or question, open **Feedback & support**. Prepare and review an email, then send it from your email app. You can also copy the text into webmail. Imported student records are not included automatically.

Open the separate **Consecutive concerns** tab and choose a practice. Use **At least 3 consecutive concern days** to find below-target days and missing reports together. Change the number or select ongoing streaks only. Reporting counts missing reports only; unreadable practice values break a practice streak.

Use **Export report** beside Load data at the top to choose report dates and rankings. Preview, open the formatted PDF/print report and choose Save as PDF in the print window, copy for WhatsApp, or download a text file. Rankings include everyone and show the lowest values first, with reporting coverage alongside practice results. Changing export dates does not change dashboard dates.

The default report includes Overall score, Chanting, Reading and Reporting. Expand **Choose report sections** for Hearing, Waking or Sleeping. Practice results are average methodology marks out of 20; overall is out of 100. Every selected date counts, and missing/unreadable components earn zero credit while readable components retain their marks. This export-only policy does not change the dashboard averages or the original data. Missing personal targets do not become zero scores: affected export results say Target unavailable and are unranked.

Please report the browser/OS, version 0.1.0, what you tried, and what went wrong. Use fictional or redacted examples when sharing feedback. Desktop Chrome has been tested; other browsers and mobile file workflows need mentor testing. The date presets end yesterday in India time, so use explicit dates when testing an old export.

Clock values need explicit clock notation, such as `04:30`, `0430`, or `4:30 AM`. AM/PM punctuation such as `4Am.` is accepted. Decimal-looking entries such as `4.5`, bare numbers without clock-format metadata, and unclear text require clarification; the dashboard does not guess their meaning. Durations with explicit units, such as `4.5 minutes`, retain those units.

Multiple submissions by the same person for the same practice date invalidate all submissions for that day, including identical entries or corrections. The day counts as no usable report for reporting, concern streaks and export scores. Duplicate reasons and original source rows remain visible.

The shared PDF groups the overall ranking under four colored category headings, with each name listed once and lowest scores first: ≥80 Good sadhaka; 60 to below 80 Need mercy; 40 to below 60 Prabhupada Bhrose; below 40 On their own. Other rankings retain their own scales; unavailable targets have no score band.
