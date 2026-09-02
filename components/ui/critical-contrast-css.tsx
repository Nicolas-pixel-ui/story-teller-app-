/** Inlined in document head so contrast rules ship with HTML (Brave-safe). */
export function CriticalContrastCss() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
html{color-scheme:light!important}
.ui-btn-primary,.ui-btn-secondary,a.ui-btn-primary,button.ui-btn-primary{
  background-color:#1d2e3f!important;color:#faf7ef!important;
  -webkit-text-fill-color:#faf7ef!important;border-color:#1d2e3f!important;
  color-scheme:light!important;forced-color-adjust:none!important;filter:none!important
}
.ui-stat-card{background-color:#faf7ef!important;color:#1d2e3f!important;
  -webkit-text-fill-color:#1d2e3f!important;color-scheme:light!important}
.ui-stat-label{color:rgba(29,46,63,.8)!important;-webkit-text-fill-color:rgba(29,46,63,.8)!important}
.ui-stat-value{color:#1d2e3f!important;-webkit-text-fill-color:#1d2e3f!important}
@media(prefers-color-scheme:dark){
  .ui-stat-card{background-color:#1d2e3f!important;color:#faf7ef!important;
    -webkit-text-fill-color:#faf7ef!important}
  .ui-stat-label{color:rgba(250,247,239,.85)!important;-webkit-text-fill-color:rgba(250,247,239,.85)!important}
  .ui-stat-value{color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important}
  .ui-surface-btn{background-color:#1d2e3f!important;color:#faf7ef!important;
    -webkit-text-fill-color:#faf7ef!important}
}
html.dark .ui-stat-card{background-color:#1d2e3f!important;color:#faf7ef!important;
  -webkit-text-fill-color:#faf7ef!important}
html.dark .ui-stat-label{color:rgba(250,247,239,.85)!important;-webkit-text-fill-color:rgba(250,247,239,.85)!important}
html.dark .ui-stat-value{color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important}
html.dark .ui-surface-btn{background-color:#1d2e3f!important;color:#faf7ef!important;
  -webkit-text-fill-color:#faf7ef!important}
`,
      }}
    />
  );
}
