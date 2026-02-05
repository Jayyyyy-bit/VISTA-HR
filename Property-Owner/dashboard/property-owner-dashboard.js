(() => {
    // ✅ from dashboard folder to wizard entry
    const WIZARD_URL = "/PO-after-signup/listing-wizard/index.html";
    const KEY_DRAFT = "vista_listing_draft";

    const tabs = Array.from(document.querySelectorAll(".dashTab"));
    const indicator = document.getElementById("dashIndicator");

    const panels = {
        listings: document.getElementById("tab-listings"),
        calendar: document.getElementById("tab-calendar"),
        messages: document.getElementById("tab-messages"),
    };

    const listingGrid = document.getElementById("listingGrid");
    const btnNewListing = document.getElementById("btnNewListing");
    const btnContinue = document.getElementById("btnContinue");
    const btnClearDraft = document.getElementById("btnClearDraft");
    const btnHelp = document.getElementById("btnHelp");

    function setIndicatorTo(btn) {
        if (!indicator || !btn) return;
        const wrap = btn.parentElement.getBoundingClientRect();
        const r = btn.getBoundingClientRect();
        indicator.style.width = `${r.width}px`;
        indicator.style.transform = `translateX(${r.left - wrap.left}px)`;
    }

    function activeTabKey() {
        const h = (location.hash || "").replace("#/", "").trim();
        return (h === "calendar" || h === "messages" || h === "listings") ? h : "listings";
    }

    function setTab(key) { location.hash = `#/${key}`; }

    function renderTabs() {
        const key = activeTabKey();

        tabs.forEach(t => {
            const on = t.dataset.tab === key;
            t.classList.toggle("isActive", on);
            t.setAttribute("aria-selected", on ? "true" : "false");
            if (on) setIndicatorTo(t);
        });

        Object.entries(panels).forEach(([k, el]) => {
            if (!el) return;
            el.classList.toggle("isActive", k === key);
        });
    }

    function existsDraft() { return !!localStorage.getItem(KEY_DRAFT); }

    function safeTitle(draft) {
        const det = draft?.details || {};
        const t = (det.title || "").trim();
        if (t) return t;
        if (draft?.placeType) return `Draft • ${draft.placeType}`;
        return "Draft listing";
    }

    function toNiceStepLabel(stepNum) {
        const map = {
            1: "Place type",
            2: "Guest space",
            3: "Location",
            4: "Capacity",
            5: "Amenities",
            6: "Highlights",
            7: "Photos",
            8: "Details",
        };
        return map[stepNum] ? `Step ${stepNum}: ${map[stepNum]}` : `Step ${stepNum}`;
    }

    function escapeHtml(str) {
        return String(str || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function renderListings() {
        if (!listingGrid) return;

        if (!existsDraft()) {
            listingGrid.innerHTML = `
        <div class="listCard" style="grid-column:1 / -1;">
          <div class="listHead">
            <div>
              <h3 class="listTitle">No drafts yet</h3>
              <div class="listMeta">Start your first listing to see it here.</div>
            </div>
            <span class="badge">Empty</span>
          </div>
        </div>
      `;
            if (btnContinue) btnContinue.disabled = true;
            if (btnClearDraft) btnClearDraft.disabled = true;
            return;
        }

        const draft = window.ListingStore.readDraft();
        const prog = window.ListingStore.computeProgress(draft);

        const pct = prog.percent || 0;
        const nextStep = prog.nextStep || 1;

        listingGrid.innerHTML = `
      <div class="listCard">
        <div class="listHead">
          <div>
            <h3 class="listTitle">${escapeHtml(safeTitle(draft))}</h3>
            <div class="listMeta">
              Updated: ${draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : "—"}
            </div>
          </div>
          <span class="badge">Draft</span>
        </div>

        <div class="miniProg">
          <div class="miniTrack"><div class="miniBar" style="width:${pct}%"></div></div>
          <div class="miniRow">
            <span>${pct}% complete</span>
            <span>${escapeHtml(toNiceStepLabel(nextStep))}</span>
          </div>
        </div>
      </div>

      <div class="listCard">
        <div class="listHead">
          <div>
            <h3 class="listTitle">Actions</h3>
            <div class="listMeta">Continue where you left off.</div>
          </div>
          <span class="badge">Quick</span>
        </div>

        <div style="display:grid; gap:10px;">
          <button class="btn solid" id="goContinue" type="button">Continue editing</button>
          <button class="btn ghost" id="goStartNew" type="button">Start new listing</button>
        </div>

        <div class="miniRow" style="margin-top:12px;">
          <span style="opacity:.75;">Next up</span>
          <span style="font-weight:950;">${escapeHtml(toNiceStepLabel(nextStep))}</span>
        </div>
      </div>
    `;

        if (btnContinue) btnContinue.disabled = false;
        if (btnClearDraft) btnClearDraft.disabled = false;

        document.getElementById("goContinue")?.addEventListener("click", () => {
            location.href = `${WIZARD_URL}#/${"step-" + nextStep}`;
        });

        document.getElementById("goStartNew")?.addEventListener("click", () => {
            if (confirm("Start a new listing? This will clear your current draft.")) {
                window.ListingStore.clearDraft();
                location.href = `${WIZARD_URL}#/step-1`;
            }
        });

        if (window.lucide?.createIcons) lucide.createIcons();
    }

    // Top actions
    btnNewListing?.addEventListener("click", () => {
        if (existsDraft()) {
            const d = window.ListingStore.readDraft();
            const p = window.ListingStore.computeProgress(d);
            location.href = `${WIZARD_URL}#/${"step-" + (p.nextStep || 1)}`;
        } else {
            location.href = `${WIZARD_URL}#/step-1`;
        }
    });

    btnContinue?.addEventListener("click", () => {
        if (!existsDraft()) return;
        const d = window.ListingStore.readDraft();
        const p = window.ListingStore.computeProgress(d);
        location.href = `${WIZARD_URL}#/${"step-" + (p.nextStep || 1)}`;
    });

    btnClearDraft?.addEventListener("click", () => {
        if (!existsDraft()) return;
        if (confirm("Clear current draft?")) {
            window.ListingStore.clearDraft();
            renderListings();
        }
    });

    btnHelp?.addEventListener("click", () => alert("Help center coming soon."));

    // Tabs
    tabs.forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
    window.addEventListener("hashchange", renderTabs);

    renderTabs();
    renderListings();
})();
