'use strict';
(function(){
  const page=document.createElement('section');
  page.id='helpPage';page.hidden=true;page.className='help-page';
  page.innerHTML=`
    <section class="guide-start" aria-labelledby="guideStartTitle">
      <div class="eyebrow">QUICK GUIDE</div>
      <h2 id="guideStartTitle">Three things to do first</h2>
      <ol class="guide-steps">
        <li><span class="step-number">1</span><div><h3>Load your data.</h3><p>Choose Local files (responses + prescriptions) or Google Sheets. Both routes lead to the same setup.</p></div></li>
        <li><span class="step-number">2</span><div><h3>Review names and targets.</h3><p>Exact names and clear quantities are handled automatically. Adjust the suggestions, confirm the matches once, and clarify any remaining targets.</p></div></li>
        <li><span class="step-number">3</span><div><h3>Explore the dashboard.</h3><p>Choose dates and a practice. Click a name for history. Review setup lets you change matches or targets later.</p></div></li>
      </ol>
      <button class="guide-primary" data-guide-view="reporting">Open Reporting →</button>
    </section>
    <section id="guide-calendar" class="guide-section">
      <h2>Read a row in seconds</h2>
      <p><strong>One row = one student. One square = one practice date.</strong> Hover for the value; click for the student’s history. On a phone, swipe across the calendar.</p>
      <div class="guide-color-key">
        <div><i class="dot good"></i><span><strong>Green</strong> Report received, or practice target met.</span></div>
        <div><i class="dot partial"></i><span><strong>Yellow-green</strong> Below target, or a later schedule.</span></div>
        <div><i class="dot poor"></i><span><strong>Peach</strong> Zero practice, or outside the highlighted schedule.</span></div>
        <div><i class="dot unknown"></i><span><strong>Striped</strong> A value or personal target needs clarification.</span></div>
        <div><i class="dot missing"></i><span><strong>Grey</strong> No usable report for that date.</span></div>
      </div>
      <p>Check the legend: colours depend on the selected view.</p>
    </section>
    <section id="guide-reporting" class="guide-section">
      <h2>What does 0/28 mean?</h2>
      <p><strong>No usable daily reports for those 28 practice dates.</strong> The note underneath tells you whether there is any other history:</p>
      <div class="guide-question-grid guide-status-examples">
        <article><strong>Reports exist outside this period</strong><p>The file contains usable reports for other dates.</p></article>
        <article><strong>No submissions in loaded data</strong><p>No response for this listed name anywhere in this file.</p></article>
      </div>
      <p>“7 missing days at period end” means the last seven practice dates are uncovered. The count stops at the selected period’s length.</p>
      <p class="guide-callout"><strong>Missing reports need attention.</strong> They do not tell us whether the student practised.</p>
    </section>
    <section id="guide-reference" class="guide-section">
      <h2>Only if you need more</h2>
      <details id="guide-controls"><summary>Find people and understand the numbers</summary><div class="guide-detail">
        <p><strong>Search:</strong> enter a name. <strong>Filter:</strong> choose a group. <strong>Sort:</strong> change the order. An empty result? Clear Search and choose “All listed students.”</p>
        <p><strong>Reported 20/28:</strong> reports cover 20 selected dates.<br><strong>Target met 8/10:</strong> met on 8 of 10 days with readable values.<br><strong>Average:</strong> readable, reported days only.<br><strong>Change:</strong> second-half average minus first-half average; needs 3 readable days in each half.</p>
        <p><strong>Consecutive concerns:</strong> open the separate Consecutive concerns tab and choose a practice and “At least” 3 days (or change the number). It combines below-target days and missing reports. Reporting counts missing reports only. Unreadable values break a practice streak. Choose any streak in the period or only one still ongoing at period end; outlined squares show qualifying days in that tab only. The original views stay unchanged.</p><p><strong>Export report:</strong> open Export report beside Load data at the top. Dates start from your current selection but can be changed for the report alone. Choose rankings, preview, then open the formatted PDF/print report, copy for WhatsApp, or download text. The default sections are Overall score, Chanting, Reading and Reporting; use Choose report sections for the other components. Everyone is included, lowest first. Export averages use methodology marks across all selected dates, with zero credit for missing or unreadable components. This export policy does not change dashboard averages. Students with unresolved targets appear as Target unavailable and are not ranked for the affected practices.</p><p>Click a summary card to open that group. Cards can overlap. “Reporting consistently” means at least 80% of dates reported; the gap card means at least 7 missing dates at the period’s end.</p>
      </div></details>
      <details id="guide-dates"><summary>Practice date versus submission date</summary><div class="guide-detail">
        <p><strong>Practice date:</strong> the day the student is reporting about.<br><strong>Submission date:</strong> when they sent the form.<br>Practice on 10 October, submitted on 12 October = a 2-day delay.</p>
        <p>The calendar follows practice dates. Filling past days together does not mean submitting daily. A date in the future relative to submission is flagged.</p>
      </div></details>
      <details id="guide-quality"><summary>Check an entry or load a new file</summary><div class="guide-detail">
        <p><strong>Review values</strong> in the dashboard lets you clarify an unreadable practice value for this tab without editing its source. Review or remove a correction there at any time.</p><p><strong>Data quality</strong> lists future dates, invalid values, and duplicates across the whole file. Invalid/future dates are excluded from the calendar; duplicate days use the latest submission.</p>
        <p><strong>Load data:</strong> choose two local Excel/CSV files (daily responses and personal prescriptions), or read both Google Sheets. Both use the same Names → Targets review. Exact names match automatically; suggestions are preselected for one batch confirmation. Edit by selector or drag-and-drop. Clear target values use the normalization dictionary and parser; only unclear entries need clarification. Open dashboard applies the whole setup. Closing it keeps the previous data.</p><p>Data and confirmations stay in this tab. Refresh sheets fetches both sources; unchanged accepted setup is kept, while new issues reopen review. Settings → Student list remains optional for students who never reported. Both date endpoints are included; presets end yesterday in India time.</p>
        <button class="text-button" data-guide-view="quality">Open Data quality →</button>
      </div></details>
      <details id="guide-score"><summary>Scores, targets, and important assumptions</summary><div class="guide-detail">
        <p>Scores follow the mentor’s PDF: five components, up to 100 points. Unreadable components leave the total unknown. Score colours use ≥80, 50–79, and &lt;50.</p>
        <p>Personal targets come from the prescription source. Clear values are converted automatically; unclear or conflicting entries appear together in the target review. Edit what is needed, then use Open dashboard once. Unresolved targets stay unavailable and can be clarified later. Ready targets can also be expanded and edited. Current confirmed targets apply across the selected history. All confirmations clear on reload.</p>
        <p>Listed names come from responses, plus an optional student list in Settings. Without that list, students who never submitted cannot be identified. Enrollment and absence dates are not tracked; check those before interpreting a gap.</p>
        <button class="text-button" data-guide-method>Exact scoring rules & assumptions →</button>
      </div></details>
    </section>
    <section class="guide-section guide-questions"><h2>Go straight to a view</h2><div class="guide-question-grid">
      <button data-guide-view="reporting" data-guide-filter="gap">Missing updates<span>Show ≥7-day gaps →</span></button>
      <button data-guide-view="overview" data-guide-axis="rounds">Chanting regularity<span>Open chanting →</span></button>
      <button data-guide-view="overview" data-guide-axis="wake">Early waking<span>Open waking →</span></button>
      <button data-guide-view="quality">Entries to clarify<span>Open data quality →</span></button>
    </div></section>
  `;
  document.getElementById('cards').before(page);
  const nav=document.createElement('button');nav.className='nav';nav.dataset.view='help';nav.setAttribute('aria-label','Help & getting started');nav.innerHTML='? <span>Help & getting started</span>';document.querySelector('.sidebar-bottom').before(nav);
  const entry=document.createElement('button');entry.className='help-entry';entry.dataset.view='help';entry.textContent='? Start here';entry.setAttribute('aria-label','Start here: dashboard help');document.querySelector('.import-button').before(entry);
  document.querySelector('#notice > div').innerHTML='<strong>First time here?</strong> Pick a view, then click a student’s name. <button class="text-button" data-view="help">Quick guide →</button>';
  const context=document.createElement('button');context.className='text-button guide-context-link';context.dataset.helpTopic='guide-calendar';context.textContent='How to read this view';document.querySelector('.panel-heading > div').append(context);
})();
