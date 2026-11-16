'use strict';
(function(){
  // Public browser key, restricted to Picker, dashboard/development origins and Google’s required Picker iframe.
  const API_KEY='AIzaSyB-U_fevNiJKqNlFU-f-1FLh77Wcj9ZgsM';
  const APP_ID='922908907926';
  const MIME='application/vnd.google-apps.spreadsheet';
  let loading=null;
  function ready(){
    if(window.google?.picker)return Promise.resolve();
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://apis.google.com/js/api.js';script.async=true;
      const fail=()=>{script.remove();loading=null;reject(new Error('Google file picker could not load. Try Google Sheets again, or use Local files.'));};
      script.onerror=fail;
      script.onload=()=>{try{gapi.load('picker',{callback:resolve,onerror:fail,timeout:15000,ontimeout:fail});}catch(_){fail();}};
      document.head.append(script);
    });
    return loading;
  }
  function choose(token,title,signal){
    return new Promise((resolve,reject)=>{
      let picker,finished=false;
      const finish=(value,error)=>{
        if(finished)return;finished=true;signal?.removeEventListener('abort',abort);
        picker?.setVisible(false);picker?.dispose();error?reject(error):resolve(value);
      };
      const abort=()=>finish(null,new DOMException('File selection cancelled','AbortError'));
      if(signal?.aborted)return abort();
      signal?.addEventListener('abort',abort,{once:true});
      try{
        const view=new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS).setMimeTypes(MIME);
        picker=new google.picker.PickerBuilder().setAppId(APP_ID).setDeveloperKey(API_KEY)
          .setOAuthToken(token).setOrigin(location.origin).setTitle(title).addView(view)
          .setCallback(result=>{
            if(result.action===google.picker.Action.CANCEL)return finish(null);
            if(result.action!==google.picker.Action.PICKED)return;
            const files=result.docs||[],file=files[0];
            if(files.length!==1||!file?.id||file.mimeType!==MIME)return finish(null,new Error('Choose one Google Sheets spreadsheet.'));
            try{SadhanaSources.sheetId(file.id);}catch(_){return finish(null,new Error('Google returned an invalid spreadsheet. Try again.'));}
            finish({id:file.id,name:file.name||'Selected spreadsheet'});
          }).build();
        picker.setVisible(true);
      }catch(error){finish(null,error);}
    });
  }
  window.SadhanaGooglePicker={ready,choose};
})();
