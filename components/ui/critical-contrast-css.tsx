/** Inlined in document head so contrast rules ship with HTML (Brave-safe). */
export function CriticalContrastCss() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
html{color-scheme:only light!important}
.ui-btn-primary,.ui-btn-secondary,a.ui-btn-primary,button.ui-btn-primary,.ui-surface-btn{
  color-scheme:only light!important;forced-color-adjust:none!important;filter:none!important;
  background-color:transparent!important;
  background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgYGAAAAAEAAEnc6JLAAAAAElFTkSuQmCC")!important;
  -webkit-background-clip:text!important;background-clip:text!important;
  color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;
  box-shadow:inset 0 0 0 100vmax #faf7ef!important
}
.ui-stat-card{background-color:#faf7ef!important;background-image:none!important;color-scheme:only light!important;forced-color-adjust:none!important}
.ui-stat-label,.ui-stat-value,.ui-stat-card p,.ui-stat-card h3,.ui-stat-card span,.ui-stat-card a,.ui-stat-card button{
  color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;
  background-color:transparent!important;
  background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVQI12NgYGAAAAAEAAEnc6JLAAAAAElFTkSuQmCC")!important;
  -webkit-background-clip:text!important;background-clip:text!important
}
`,
      }}
    />
  );
}
