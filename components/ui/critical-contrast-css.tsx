/** Inlined in document head so contrast rules apply before the stylesheet loads. */
export function CriticalContrastCss() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
html{color-scheme:only light}
.ui-btn-primary,.ui-btn-secondary,.ui-surface-btn,.ui-stat-card{
  background-color:#faf7ef!important;background-image:none!important;
  color:#1d2e3f!important;-webkit-text-fill-color:#1d2e3f!important
}
.ui-btn-ink{
  background-color:#4f46e5!important;background-image:none!important;
  color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;
  border:2px solid #ffffff!important
}
.ui-btn-ink svg,.ui-btn-ink path{color:#ffffff!important;stroke:#ffffff!important}
.story-draft-shell,.story-draft-editor{background-color:#1d2e3f!important;background-image:none!important;color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important}
.ui-style-tab{appearance:none;-webkit-appearance:none;background-color:#1d2e3f!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border:2px solid #9b7d2e!important;color-scheme:dark;forced-color-adjust:none;font-weight:600}
.ui-style-tab-active{border-color:#9b7d2e!important;background-color:#9b7d2e!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;font-weight:700}
.ui-style-tab svg,.ui-style-tab path,.ui-style-tab-active svg,.ui-style-tab-active path{color:#ffffff!important;stroke:#ffffff!important}
.ui-style-panel{background-color:#1d2e3f!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border:1px solid #ffffff!important;color-scheme:dark;forced-color-adjust:none}
.ui-style-panel label,.ui-style-panel h1,.ui-style-panel h2,.ui-style-panel h3,.ui-style-panel h4,.ui-style-panel p,.ui-style-panel span{color:#ffffff!important;-webkit-text-fill-color:#ffffff!important}
.ui-style-shell{background-color:#1d2e3f!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;color-scheme:dark;forced-color-adjust:none}
.ui-style-choice,.ui-style-choice-menu{appearance:none;-webkit-appearance:none;background-color:#1d2e3f!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border:1px solid #ffffff!important;color-scheme:dark;forced-color-adjust:none}
.ui-style-choice-active{background-color:#9b7d2e!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important}
.ui-style-shell button.text-zinc-500{color:#ffffff!important;-webkit-text-fill-color:#ffffff!important}
.ui-style-shell select,.ui-style-panel select{appearance:none;-webkit-appearance:none;background-color:#1d2e3f!important;background-image:none!important;color:#ffffff!important;-webkit-text-fill-color:#ffffff!important;border:1px solid #ffffff!important;color-scheme:dark;forced-color-adjust:none;caret-color:#ffffff}
.story-draft-editor h1,.story-draft-editor h2,.story-draft-editor h3,.story-draft-editor p,.story-draft-editor li,.story-draft-editor strong{color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important}
.ui-stat-card :not(svg):not(path){color:#1d2e3f!important;-webkit-text-fill-color:#1d2e3f!important}
@media (prefers-color-scheme:dark){
  input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select{
    color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important;caret-color:#faf7ef;background-color:#1d2e3f!important
  }
  input:not([type=checkbox]):not([type=radio]):not([type=hidden])::placeholder,textarea::placeholder{
    color:rgb(250 247 239 / .55)!important;-webkit-text-fill-color:rgb(250 247 239 / .55)!important
  }
}
.dark input:not([type=checkbox]):not([type=radio]):not([type=hidden]),.dark textarea,.dark select{
  color:#faf7ef!important;-webkit-text-fill-color:#faf7ef!important;caret-color:#faf7ef;background-color:#1d2e3f!important
}
.dark input:not([type=checkbox]):not([type=radio]):not([type=hidden])::placeholder,.dark textarea::placeholder{
  color:rgb(250 247 239 / .55)!important;-webkit-text-fill-color:rgb(250 247 239 / .55)!important
}
`,
      }}
    />
  );
}
