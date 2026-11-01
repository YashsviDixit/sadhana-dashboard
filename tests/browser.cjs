// Each suite owns a browser. Run sequentially so keyboard/file-chooser tests
// are not competing for browser focus with other suites.
const {spawnSync}=require('node:child_process'),path=require('node:path');
for(const file of ['mentor-smoke.cjs','mentor-tools.cjs','ui-polish.cjs','support.cjs','pdf-export.cjs','two-source-browser.cjs']){
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
