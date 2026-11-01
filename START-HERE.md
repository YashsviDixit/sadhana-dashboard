# Sadhana dashboard · mentor test version 0.1.0

1. Extract the ZIP completely.
2. Open `dist/index.html` in a current desktop browser. No Python, Node, Git or installation is needed to use it.
3. For Google Sheets, open the hosted dashboard → **Data sources**, paste the response and prescription sheet links, and continue with Google using an account that can read both sheets. Use **Refresh sheets** for later updates. For local files, use **Import responses** and add the separate target file through **Data sources → Use local files instead → Import prescriptions**. Google sign-in requires the hosted site or localhost; local file imports work in the extracted dashboard.
4. Optional: open **Settings → Student list** to include students who never submitted. Use an Excel/CSV file with a `Name` heading and one student per row; a template is in `examples/roster.csv`.
5. Choose dates, explore a practice, and click a student's name for their history. “Start here” in the app explains the views.

The two files in `examples` contain entirely fictional students. To try them, import `examples/responses.csv` and `examples/roster.csv`, then select 18–20 October 2026. Example Student C intentionally has no response.

Each tab starts empty. Your imported data and personal target edits stay in that tab's memory. A reload or closing the tab clears them. “Clear this tab” removes them immediately. Local files are not uploaded. Google sign-in grants read-only access; the dashboard reads the selected sheets directly and does not edit them. A refresh fetches current contents; it is not a continuous live subscription.

With response files alone, default targets are 16 rounds, 60 minutes reading and 60 minutes hearing. When prescriptions are loaded, the dashboard uses matched or confirmed personal targets; unresolved targets stay unavailable. Confirm suggested name matches and resolve unclear or conflicting targets in **Data sources → Review names & targets**. Use the selector or drag a prescription card onto a response row, then confirm. You can change matches later. Confirmed current targets apply across the selected history; they do not establish historical target changes. Adjusting a target in a student's history overrides the matched prescription for this tab. Missing reports are highlighted without treating practice as zero.

Use **Review unclear practice values** in Data sources to clarify an unreadable value. The original response is retained. A correction can optionally apply to identical values in the same field and source; review or remove it in the same screen. Nothing is written back to Google Sheets.

If Google refuses sign-in, check the selected account and whether it is approved to use the application. If either sheet cannot be refreshed, the previous loaded pair remains available. Source status shows when each sheet was loaded.

Table headings and the first column stay visible while scrolling. Student windows keep their close button visible; click outside, press Escape, or use × to close them.

For a problem, suggestion, or question, open **Feedback & support**. Prepare and review an email, then send it from your email app. You can also copy the text into webmail. Imported student records are not included automatically.

Open the separate **Consecutive concerns** tab and choose a practice. Use **At least 3 consecutive concern days** to find below-target days and missing reports together. Change the number or select ongoing streaks only. Reporting counts missing reports only; unreadable practice values break a practice streak.

Use **Export report** beside Import responses at the top to choose report dates and rankings. Preview, open the formatted PDF/print report and choose Save as PDF in the print window, copy for WhatsApp, or download a text file. Rankings include everyone and show the lowest values first, with reporting coverage alongside practice results. Changing export dates does not change dashboard dates.

The default report includes Overall score, Chanting, Reading and Reporting. Expand **Choose report sections** for Hearing, Waking or Sleeping. Practice results are average methodology marks out of 20; overall is out of 100. Every selected date counts, and missing/unreadable components earn zero credit while readable components retain their marks. This export-only policy does not change the dashboard averages or the original data. Missing personal targets do not become zero scores: affected export results say Target unavailable and are unranked.

Please report the browser/OS, version 0.1.0, what you tried, and what went wrong. Use fictional or redacted examples when sharing feedback. Desktop Chrome has been tested; other browsers and mobile file workflows need mentor testing. The date presets end yesterday in India time, so use explicit dates when testing an old export.
