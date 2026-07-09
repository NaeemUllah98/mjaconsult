/**
 * Print just the prescription document (the element marked `.rx-print-area`)
 * at exact half-A4 size, then restore the page. Uses the browser's native
 * print → "Save as PDF" dialog, which is the zero-cost way to export a PDF
 * (no paid library needed).
 *
 * The matching CSS lives in `index.css` under the `@media print` block:
 * while `body.rx-printing` is set, everything is hidden except `.rx-print-area`,
 * which is pinned to a 210mm × 150mm page.
 */
export function printPrescription(): void {
  const body = document.body;
  body.classList.add("rx-printing");

  const cleanup = () => {
    body.classList.remove("rx-printing");
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);

  // Let the print styles apply before opening the dialog.
  window.setTimeout(() => {
    window.print();
    // Safety net for browsers that don't fire `afterprint` reliably.
    window.setTimeout(cleanup, 1000);
  }, 60);
}
