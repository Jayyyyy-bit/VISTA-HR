// core/sidepanel.js
window.SidePanel = (() => {
  const { $, $$ } = window.Dom;

  const DEFAULT_TIPS = [
    "Pick the closest match for faster approval.",
    "Keep details consistent with your photos.",
    "You can edit this later anytime."
  ];

  function setTips({ selectedLabel = "—", tips = DEFAULT_TIPS }) {
    const pill = $("#selectedPill");
    const ul = $("#guideTips");
    if (pill) pill.textContent = `Selected: ${selectedLabel}`;
    if (ul) ul.innerHTML = tips.map(t => `<li>${t}</li>`).join("");
  }

  function renderReadiness() {
    const draft = window.ListingStore.readDraft();
    const p = window.ListingStore.computeProgress(draft);

    const percentLabel = $("#percentLabel");
    const bar = $("#progressBar");


    if (percentLabel) percentLabel.textContent = `${p.percent}%`;
    if (bar) bar.style.width = `${p.percent}%`;

    const list = $("#sideChecklist");
    if (!list) return;

    list.innerHTML = p.steps.map(s => {
      const state = s.done ? "done" : s.locked ? "locked" : (s.step === p.nextStep ? "active" : "");
      const right = s.done ? "Done" : s.locked ? "Locked" : (s.step === p.nextStep ? "Next" : "Pending");

      return `
        <div class="cl-item ${state}">
          <div class="cl-left">
            <span class="cl-dot"></span>
            <div class="cl-text">
              <div class="cl-t">Step ${s.step}</div>
              <div class="cl-s">${s.label}</div>
            </div>
          </div>
          <div class="cl-state">${right}</div>
        </div>
      `;
    }).join("");
  }

  function refresh(partial = {}) {
    if (partial.tips) setTips(partial.tips);
    renderReadiness();
  }


  return { setTips, renderReadiness, refresh };
})();

