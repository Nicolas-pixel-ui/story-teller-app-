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
.ui-stat-card :not(svg):not(path){color:#1d2e3f!important;-webkit-text-fill-color:#1d2e3f!important}
`,
      }}
    />
  );
}
