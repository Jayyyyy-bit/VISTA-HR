lucide.createIcons();

/* =========================
   Draft storage (frontend-only)
========================= */
const LS_DRAFT_KEY = "vista_listing_draft";

function readDraft() {
    try { return JSON.parse(localStorage.getItem(LS_DRAFT_KEY)) || null; }
    catch { return null; }
}

function initDraft() {
    const existing = readDraft();
    if (existing) return existing;

    const fresh = {
        id: "draft-" + Date.now(),
        status: "DRAFT",
        placeType: null,
        spaceType: null,
        location: { lat: null, lng: null, city: null, barangay: null, street: null, zip: null },
        amenities: [],
        photos: [],
        pricing: { nightly: null, downpayment: null },
        rules: null,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(fresh));
    return fresh;
}

function saveDraft(patch) {
    const d = initDraft();
    const next = { ...d, ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(next));
    return next;
}

/* =========================
   “Backend-like” progress rules
========================= */
const PROGRESS_SCHEMA = [
    { step: 1, label: "Place type", weight: 15, isDone: d => !!d.placeType },
    { step: 2, label: "Guest space", weight: 15, isDone: d => !!d.spaceType },
    { step: 3, label: "Location", weight: 20, isDone: d => !!d.location?.lat && !!d.location?.lng },
    { step: 4, label: "Photos & amenities", weight: 25, isDone: d => (d.photos?.length >= 5) && (d.amenities?.length >= 1) },
    { step: 5, label: "Pricing & rules", weight: 20, isDone: d => !!d.pricing?.nightly && !!d.rules },
    { step: 6, label: "Review & publish", weight: 5, isDone: _ => false }
];

function computeProgress(draft, opts = { verified: false }) {
    const verified = !!opts.verified;

    const steps = PROGRESS_SCHEMA.map(s => {
        const done = s.step === 6 ? false : !!s.isDone(draft);
        return { ...s, done, locked: false };
    });

    const ready = steps.slice(0, 5).every(s => s.done);
    const publishAllowed = verified && ready;

    const step6 = steps.find(s => s.step === 6);
    step6.locked = !verified;
    step6.done = publishAllowed;

    let percent = 0;
    for (const s of steps) {
        if (s.step === 6) {
            if (publishAllowed) percent += s.weight;
        } else if (s.done) {
            percent += s.weight;
        }
    }

    const nextStep = steps.find(s => !s.done && !s.locked)?.step ?? 6;
    return { percent, steps, nextStep, publishAllowed, verified, ready };
}

/* =========================
   Guidance (A)
========================= */
const GUIDANCE = {
    CONDO: {
        title: "Condominium",
        tips: [
            "Add building name/tower if applicable.",
            "Mention visitor/ID policy and quiet hours.",
            "Best photos: living area + bedroom + bathroom."
        ],
        chips: ["House rules", "Amenities", "Photos", "Landmark", "Commute"]
    },
    APARTMENT: {
        title: "Apartment",
        tips: [
            "Clarify if walk-up or with elevator.",
            "Mention utilities included/excluded.",
            "Add a nearby landmark (LRT / school)."
        ],
        chips: ["Utilities", "Amenities", "Photos", "Landmark"]
    },
    DORM: {
        title: "Dormitory",
        tips: [
            "State curfew/visitor rules clearly.",
            "Specify bed type + storage/locker.",
            "Highlight shared areas (kitchen/bath)."
        ],
        chips: ["Curfew", "Shared areas", "Inclusions"]
    },
    BEDSPACE: {
        title: "Bedspace",
        tips: [
            "Specify # beds per room + privacy level.",
            "Include inclusions (wifi/water/electricity).",
            "Add schedule rules (lights-out/visitors)."
        ],
        chips: ["Inclusions", "Rules", "Photos"]
    },
    STUDIO: {
        title: "Studio unit",
        tips: [
            "Show layout: bed + kitchenette + bath.",
            "Mention furnished/semi-furnished status.",
            "Best photos: wide shot + bathroom."
        ],
        chips: ["Layout", "Furnished", "Photos", "Amenities"]
    },
    HOUSE: {
        title: "House",
        tips: [
            "Specify rooms/floors included in booking.",
            "Clarify parking availability.",
            "Mention neighborhood landmark/safety."
        ],
        chips: ["Parking", "Rooms", "Rules", "Landmark"]
    },
    TOWNHOUSE: {
        title: "Townhouse",
        tips: [
            "Mention number of floors + stairs.",
            "Include gate/guard/parking details.",
            "Clarify noise rules (shared walls)."
        ],
        chips: ["Floors", "Parking", "Rules"]
    },
    ROOM: {
        title: "Private room",
        tips: [
            "Clarify bathroom: private or shared.",
            "Mention access: kitchen/laundry/living.",
            "House rules are important—keep clear."
        ],
        chips: ["Bathroom", "Access", "Rules"]
    },
    GUESTHOUSE: {
        title: "Guesthouse",
        tips: [
            "Mention caretaker/front desk availability.",
            "Highlight check-in/out rules.",
            "Best photos: room + entrance + bathroom."
        ],
        chips: ["Check-in", "Support", "Photos"]
    }
};

/* =========================
   Step 1: Place types (cards)
========================= */
const PLACE_TYPES = [
    { key: "CONDO", label: "Condominium", mini: "High-rise / building unit", icon: "building-2" },
    { key: "APARTMENT", label: "Apartment", mini: "Multi-unit residence", icon: "building" },
    { key: "DORM", label: "Dormitory", mini: "Shared living setup", icon: "bed-double" },
    { key: "BEDSPACE", label: "Bedspace", mini: "Bed in shared room", icon: "bed" },
    { key: "STUDIO", label: "Studio unit", mini: "All-in-one layout", icon: "layout-grid" },
    { key: "HOUSE", label: "House", mini: "Standalone home", icon: "home" },
    { key: "TOWNHOUSE", label: "Townhouse", mini: "Multi-floor home", icon: "rows-3" },
    { key: "ROOM", label: "Private room", mini: "Room inside a home/unit", icon: "door-closed" },
    { key: "GUESTHOUSE", label: "Guesthouse", mini: "Hosted / serviced stay", icon: "hotel" },
];

function renderPlaceGrid(draft) {
    const grid = document.getElementById("placeGrid");
    if (!grid) return;

    grid.innerHTML = PLACE_TYPES.map(t => {
        const sel = draft.placeType === t.key ? "selected" : "";
        return `
      <button class="type-card ${sel}" type="button" data-key="${t.key}">
        <div class="type-ic"><i data-lucide="${t.icon}"></i></div>
        <div class="type-text">
          <div class="type-name">${t.label}</div>
          <div class="type-mini">${t.mini}</div>
        </div>
      </button>
    `;
    }).join("");

    lucide.createIcons();

    grid.querySelectorAll(".type-card").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.key;
            saveDraft({ placeType: key });
            refreshUI();
        });
    });
}

/* =========================
   Right panel rendering (A+B)
========================= */
function renderGuidance(draft) {
    const title = document.getElementById("guideTitle");
    const sub = document.getElementById("guideSub");
    const pill = document.getElementById("selectedPill");
    const tips = document.getElementById("guideTips");
    const chips = document.getElementById("guideChips");

    if (!title || !sub || !pill || !tips || !chips) return;

    if (!draft.placeType || !GUIDANCE[draft.placeType]) {
        pill.textContent = "Selected: —";
        sub.textContent = "Select a place type to see tips.";
        chips.innerHTML = "";
        return;
    }

    const g = GUIDANCE[draft.placeType];
    pill.textContent = `Selected: ${g.title}`;
    sub.textContent = "Helps categorize your listing and match the right tenants.";

    tips.innerHTML = g.tips.map(t => `<li>${t}</li>`).join("");
    chips.innerHTML = g.chips.map(c => `<span class="chipmini">${c}</span>`).join("");
}

function renderProgress(progress) {
    const pct = document.getElementById("percentLabel");
    const bar = document.getElementById("progressBar");
    const list = document.getElementById("sideChecklist");

    if (pct) pct.textContent = `${progress.percent}%`;
    if (bar) bar.style.width = `${progress.percent}%`;

    if (list) {
        list.innerHTML = progress.steps.map(s => {
            const state = s.done ? "done" : s.locked ? "locked" : (s.step === progress.nextStep ? "active" : "");
            const right = s.done ? "Done" : s.locked ? "Locked" : (s.step === progress.nextStep ? "Next" : "Pending");
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
}

/* =========================
   Page navigation w/ “morph/slide”
========================= */
function exitTo(url) {
    if (!url) return;
    const run = () => {
        document.body.classList.add("page-exit");
        setTimeout(() => (window.location.href = url), 360);
    };

    // If browser supports View Transitions, use it (feels like “morph”)
    if (document.startViewTransition) {
        document.startViewTransition(() => run());
    } else {
        run();
    }
}

/* =========================
   Refresh everything
========================= */
function refreshUI() {
    const draft = initDraft();

    // later: replace with real owner verification
    const verified = false;

    // Step specific: only render grid on step 1
    const step = document.body.dataset.step;

    if (step === "1") renderPlaceGrid(draft);
    renderGuidance(draft);

    const progress = computeProgress(draft, { verified });
    renderProgress(progress);

    // Buttons
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    if (nextBtn) {
        // Step1 requires placeType
        if (step === "1") nextBtn.disabled = !draft.placeType;
        else nextBtn.disabled = true; // placeholder for now
    }

    if (backBtn) {
        if (step === "1") backBtn.disabled = true;
        else backBtn.disabled = false;
    }

    // Debug on step2
    const dbg = document.getElementById("debugType");
    if (dbg) dbg.textContent = draft.placeType || "—";
}

/* =========================
   Wire buttons
========================= */
document.addEventListener("DOMContentLoaded", () => {
    initDraft();
    refreshUI();

    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const saveExitBtn = document.getElementById("saveExitBtn");

    if (nextBtn) nextBtn.addEventListener("click", () => exitTo(window.__WIZ_NEXT__));
    if (backBtn) backBtn.addEventListener("click", () => exitTo(window.__WIZ_BACK__));

    if (saveExitBtn) {
        saveExitBtn.addEventListener("click", () => {
            alert("Saved as draft. Redirect to dashboard later.");
        });
    }
});
