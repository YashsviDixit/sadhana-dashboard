'use strict';
(function(){
  const email='dixit.yashsvi@gmail.com';
  const button=document.createElement('button');button.id='supportButton';button.className='nav';button.setAttribute('aria-label','Feedback and support');button.innerHTML='✉ <span>Feedback & support</span>';
  document.querySelector('.sidebar-bottom').before(button);
  const dialog=document.createElement('dialog');dialog.id='supportDialog';dialog.setAttribute('aria-labelledby','supportTitle');
  dialog.innerHTML=`<div class="dialog-top"><h2 id="supportTitle">Feedback & support</h2><button class="close-button" data-close="supportDialog" aria-label="Close feedback and support">×</button></div>
    <div class="method-content support-content"><p>Found a problem, have an idea, or need help? Send a note to the developer.</p>
    <p>Yashsvi Dixit · <a href="mailto:${email}">${email}</a></p>
    <form id="supportForm"><label for="feedbackType">What would you like to share?</label><select id="feedbackType"><option>Report a problem</option><option>Suggest an improvement</option><option>Ask a question</option></select>
    <label for="feedbackMessage">Your message</label><p id="feedbackHint">For a problem, describe what you did, what happened, and what you expected. Please leave out student names and records, and redact any screenshots you attach in your email.</p>
    <textarea id="feedbackMessage" rows="6" maxlength="2000" required aria-describedby="feedbackHint" placeholder="Tell us what would help…"></textarea>
    <button class="import-button" type="submit">Prepare email</button></form>
    <p>Nothing is sent by the dashboard. You review the message and send it from your email app. Dashboard version and browser details are included; imported records, names, and files are not.</p>
    <div id="supportPreview" hidden><label for="supportEmailText">Email preview</label><textarea id="supportEmailText" rows="10" readonly></textarea><div class="setup-actions"><a id="supportMailLink" class="import-button">Open email app</a><button id="copyFeedback" class="text-button" type="button">Copy email text</button></div><p>No email app configured? Copy the text and email it to the address above.</p><p id="supportCopyStatus" role="status"></p></div></div>`;
  document.body.append(dialog);
  button.onclick=()=>{dialog.showModal();};
  $('supportForm').addEventListener('input',()=>{$('supportPreview').hidden=true;$('supportCopyStatus').textContent='';});
  $('supportForm').onsubmit=event=>{
    event.preventDefault();const message=$('feedbackMessage').value.trim();if(!message){$('feedbackMessage').setCustomValidity('Please enter a message.');$('feedbackMessage').reportValidity();return;}
    const version=document.querySelector('meta[name="app-version"]').content;
    const subject='Sadhana dashboard · '+$('feedbackType').value;
    const body=message+'\n\n---\nDashboard version: '+version+'\nBrowser: '+navigator.userAgent;
    $('supportEmailText').value='To: '+email+'\nSubject: '+subject+'\n\n'+body;
    $('supportMailLink').href='mailto:'+email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    $('supportPreview').hidden=false;
  };
  $('feedbackMessage').addEventListener('input',()=>$('feedbackMessage').setCustomValidity(''));
  $('copyFeedback').onclick=async()=>{try{await navigator.clipboard.writeText($('supportEmailText').value);$('supportCopyStatus').textContent='Copied. Paste into an email to '+email+'.';}catch(_){$('supportEmailText').focus();$('supportEmailText').select();$('supportCopyStatus').textContent='Select and copy the preview text, then paste it into your email.';}};
})();
