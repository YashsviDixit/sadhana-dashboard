# Sadhana dashboard · mentor test version 0.1.0

1. Extract the ZIP completely.
2. Open `dist/index.html` in a current desktop browser. No Python, Node, Git or installation is needed to use it.
3. Click **Load data** and choose **Local files** or **Google Sheets**. Local files requires two Excel/CSV exports: daily responses and personal prescriptions. Google Sheets reads those same two sources using your account; links are prefilled and masked, and remain editable. Google sign-in requires the hosted site or localhost; local files work offline.
4. Review names: recorded response names are on the left; names from prescribed values are on the right. Exact matches are automatic. Clear suggestions are preselected and explain why they were suggested; close alternatives stay unselected for you to choose. Both complete lists are visible. Drag a name from the right onto its response row on the left to change a match; × clears it. You can also select a prescribed name and then select its response. **Confirm matches & continue** applies to the whole list once. No per-person confirmation is needed.
5. Review targets. Clear quantities are handled automatically by the dictionary and parser. Only unclear or conflicting prescriptions need your input; original entries and candidate rows are available beside the fields. Edit the needed quantities, then click **Open dashboard** once. Ready targets can be expanded and edited too. Entries left unresolved stay unavailable; Review setup lets you return later. Closing setup leaves the existing dashboard unchanged.
6. Optional: open **Settings → Student list** to include students who never submitted. Use an Excel/CSV file with a `Name` heading and one student per row; a template is in `examples/roster.csv`.
7. Choose dates, explore a practice, and click a student's name for their history. “Start here” in the app explains the views.

The two files in `examples` contain entirely fictional students. To try them, import `examples/responses.csv` and `examples/roster.csv`, then select 18–20 October 2026. Example Student C intentionally has no response.

Each tab starts empty. Your imported data and personal target edits stay in that tab's memory. A reload or closing the tab clears them. “Clear this tab” removes them immediately. Local files are not uploaded. Google sign-in grants read-only access; the dashboard reads the selected sheets directly and does not edit them. A refresh fetches current contents; it is not a continuous live subscription. If the accepted setup remains applicable, it is kept without repeated confirmations. New identity or target issues reopen setup.

Personal targets come from the prescription source. Confirmed current targets apply across the selected history; they do not establish historical target changes. Review setup starts the same batch review again. Adjusting a target in a student's history overrides the matched prescription for this tab. Missing reports are highlighted without treating practice as zero.

Use **Review values** in the dashboard or **Clarify practice values** in the source panel to clarify an unreadable value. The original response is retained. A correction can optionally apply to identical values in the same field and source; review or remove it in the same screen. Nothing is written back to Google Sheets.

If Google refuses sign-in, check the selected account and whether it is approved to use the application. If either sheet cannot be refreshed, the previous loaded pair remains available. Source status shows when each sheet was loaded.

Table headings and the first column stay visible while scrolling. Student windows keep their close button visible; click outside, press Escape, or use × to close them.

For a problem, suggestion, or question, open **Feedback & support**. Prepare and review an email, then send it from your email app. You can also copy the text into webmail. Imported student records are not included automatically.

Open the separate **Consecutive concerns** tab and choose a practice. Use **At least 3 consecutive concern days** to find below-target days and missing reports together. Change the number or select ongoing streaks only. Reporting counts missing reports only; unreadable practice values break a practice streak.

Use **Export report** beside Load data at the top to choose report dates and rankings. Preview, open the formatted PDF/print report and choose Save as PDF in the print window, copy for WhatsApp, or download a text file. Rankings include everyone and show the lowest values first, with reporting coverage alongside practice results. Changing export dates does not change dashboard dates.

The default report includes Overall score, Chanting, Reading and Reporting. Expand **Choose report sections** for Hearing, Waking or Sleeping. Practice results are average methodology marks out of 20; overall is out of 100. Every selected date counts, and missing/unreadable components earn zero credit while readable components retain their marks. This export-only policy does not change the dashboard averages or the original data. Missing personal targets do not become zero scores: affected export results say Target unavailable and are unranked.

Please report the browser/OS, version 0.1.0, what you tried, and what went wrong. Use fictional or redacted examples when sharing feedback. Desktop Chrome has been tested; other browsers and mobile file workflows need mentor testing. The date presets end yesterday in India time, so use explicit dates when testing an old export.
