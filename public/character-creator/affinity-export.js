(() => {
  "use strict";

  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const decorated = new WeakSet();
  let exportPageIndex = 0;

  const resetExportPages = () => { exportPageIndex = 0; };

  window.addEventListener("message", (event) => {
    if (event.data?.type === "dxd-character-sheet-export-request") resetExportPages();
  });

  document.querySelector("#export-pdf")?.addEventListener("click", resetExportPages, { capture: true });

  HTMLCanvasElement.prototype.toDataURL = function patchedToDataURL(...args) {
    const pageIndex = this.width === 1200 && this.height === 1575 ? exportPageIndex++ : -1;
    if (pageIndex === 0 && !decorated.has(this)) {
      const page = document.querySelector("#front");
      const affinity = document.querySelector("#affinity-decal");
      if (page && affinity instanceof HTMLImageElement && affinity.complete && getComputedStyle(affinity).display !== "none") {
        const pageRect = page.getBoundingClientRect();
        const rect = affinity.getBoundingClientRect();
        const context = this.getContext("2d");
        if (context && pageRect.width > 0 && pageRect.height > 0 && rect.width > 0 && rect.height > 0) {
          context.drawImage(
            affinity,
            (rect.x - pageRect.x) * this.width / pageRect.width,
            (rect.y - pageRect.y) * this.height / pageRect.height,
            rect.width * this.width / pageRect.width,
            rect.height * this.height / pageRect.height,
          );
          decorated.add(this);
        }
      }
    }
    return originalToDataURL.apply(this, args);
  };
})();
