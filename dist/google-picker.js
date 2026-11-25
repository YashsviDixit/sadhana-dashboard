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
  function choose(token,title,signal,options={}){
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
        if(options.fileIds?.length)view.setFileIds(options.fileIds.join(','));
        const builder=new google.picker.PickerBuilder().setAppId(APP_ID).setDeveloperKey(API_KEY)
          .setOAuthToken(token).setOrigin(location.origin).setTitle(title).addView(view);
        if(options.multiple)builder.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
        picker=builder.setCallback(result=>{
            if(result.action===google.picker.Action.CANCEL)return finish(null);
            if(result.action!==google.picker.Action.PICKED)return;
            const files=result.docs||[];
            if(!files.length||(!options.multiple&&files.length!==1)||files.some(file=>!file?.id||file.mimeType!==MIME))return finish(null,new Error(options.multiple?'Choose the two selected Google Sheets spreadsheets.':'Choose one Google Sheets spreadsheet.'));
            try{for(const file of files)SadhanaSources.sheetId(file.id);}catch(_){return finish(null,new Error('Google returned an invalid spreadsheet. Try again.'));}
            const selected=files.map(file=>({id:file.id,name:file.name||'Selected spreadsheet'}));
            finish(options.multiple?selected:selected[0]);
          }).build();
        picker.setVisible(true);
      }catch(error){finish(null,error);}
    });
  }
  window.SadhanaGooglePicker={ready,choose};
})();
