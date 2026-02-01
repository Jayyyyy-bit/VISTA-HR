lucide.createIcons();

const LS_DRAFT_KEY = "vista_listing_draft";

const slideEls = Array.from(document.querySelectorAll(".slide"));
const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const typeGrid = document.getElementById("typeGrid");
const dot2 = document.getElementById("dot2");

const TOTAL_STEPS = 2;
let step = 1;

/* ===== Draft storage ===== */
function readDraft() {
    try { return JSON.parse(localStorage.getItem(LS_DRAFT_KEY)) || {}; }
    catch { return {}; }
}
function saveDraft(patch) {
    const draft = readDraft();
    const next = {
        id: draft.id || ("draft-" + Date.now()),
        status: "DRAFT",
        placeType: draft.placeType ?? null,
        spaceType: draft.spaceType ?? null,
        location: draft.location ?? { lat: null, lng: null, city: null, barangay: null, street: null, zip: null },
        amenities: draft.amenities ?? [],
        photos: draft.photos ?? [],
        pricing: draft.pricing ?? { nightly: null, downpayment: null },
        rules: draft.rules ?? null,
        ...draft,
        ...patch,
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LS_DRAFT_KEY, JSON.stringify(next));
    return next;
}

/* ===== Place types ===== */
const PLACE_TYPES = [
    { key: "CONDO", label: "Condominium", icon: "building-2" },
    { key: "APARTMENT", label: "Apartment", icon: "building" },
    { key: "DORM", label: "Dormitory", icon: "bed-double" },
    { key: "BEDSPACE", label: "Bedspace", icon: "bed" },
    { key: "STUDIO", label: "Studio unit", icon: "layout-grid" },
    { key: "HOUSE", label: "House", icon: "home" },
    { key: "TOWNHOUSE", label: "Townhouse", icon: "rows-3" },
    { key: "ROOM", label: "Private room", icon: "door-closed" },
    { key: "GUESTHOUSE", label: "Guesthouse", icon: "hotel" },
];

/* ===== Guidance ===== */
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

/* ===== Progress schema ===== */
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
    return { percent, steps, nextStep, publishAllowed };
}

/* ===== Render Step 1 cards ===== */
function renderTypes() {
    const draft = readDraft();
    const selected = draft.placeType;

    typeGrid.innerHTML = PLACE_TYPES.map(t => {
        const isSel = selected === t.key ? "selected" : "";
        return `
      <button class="card ${isSel}" type="button" data-key="${t.key}">
        <i class="icon" data-lucide="${t.icon}"></i>
        <div class="label">${t.label}</div>
      </button>
    `;
    }).join("");

    lucide.createIcons();

    typeGrid.querySelectorAll(".card").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.key;
            saveDraft({ placeType: key });

            typeGrid.querySelectorAll(".card").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");

            refreshSidePanel();
            nextBtn.disabled = false;
        });
    });

    nextBtn.disabled = !selected;
}

/* ===== Accordion interactivity ===== */
function initAccordion() {
    const root = document.getElementById("guideAccordion");
    if (!root) return;

    root.querySelectorAll(".acc-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const key = btn.dataset.acc;
            const body = root.querySelector(`.acc-body[data-body="${key}"]`);
            const isOpen = body.classList.contains("open");

            body.classList.toggle("open", !isOpen);
            btn.setAttribute("aria-expanded", String(!isOpen));
        });
    });
}

/* ===== Side panel render ===== */
function refreshSidePanel() {
    const draft = readDraft();
    const verified = false; // later replace with real owner verification

    const guideTitle = document.getElementById("guideTitle");
    const guideSub = document.getElementById("guideSub");
    const selectedPill = document.getElementById("selectedPill");
    const guideTips = document.getElementById("guideTips");
    const guideChips = document.getElementById("guideChips");

    if (draft.placeType && GUIDANCE[draft.placeType]) {
        const g = GUIDANCE[draft.placeType];
        if (selectedPill) selectedPill.textContent = `Selected: ${g.title}`;
        if (guideSub) guideSub.textContent = "Helps categorize your listing and match the right tenants.";
        if (guideTips) guideTips.innerHTML = g.tips.map(t => `<li>${t}</li>`).join("");
        if (guideChips) guideChips.innerHTML = g.chips.map(c => `<span class="chipmini">${c}</span>`).join("");
    } else {
        if (selectedPill) selectedPill.textContent = "Selected: —";
        if (guideSub) guideSub.textContent = "Select a place type to see tips.";
        if (guideTips) guideTips.innerHTML = `
      <li>Choose the closest match for faster approval.</li>
      <li>Keep details consistent with your photos.</li>
      <li>You can edit this later anytime.</li>
    `;
        if (guideChips) guideChips.innerHTML = "";
    }

    const progress = computeProgress(draft, { verified });

    const percentLabel = document.getElementById("percentLabel");
    if (percentLabel) percentLabel.textContent = `${progress.percent}%`;
    if (progressBar) progressBar.style.width = `${progress.percent}%`;

    const sideChecklist = document.getElementById("sideChecklist");
    if (sideChecklist) {
        sideChecklist.innerHTML = progress.steps.map(s => {
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

/* ===== Slide logic ===== */
function setActiveSlide(targetStep, direction = "next") {
    slideEls.forEach(s => s.classList.remove("active", "exit-left", "exit-right"));

    const current = slideEls.find(s => s.dataset.step === String(step));
    const nextSlide = slideEls.find(s => s.dataset.step === String(targetStep));

    if (current && current !== nextSlide) {
        current.classList.add(direction === "next" ? "exit-left" : "exit-right");
    }
    nextSlide.classList.add("active");
}

function slideToStep(targetStep) {
    const prev = step;
    step = Math.max(1, Math.min(TOTAL_STEPS, targetStep));

    const direction = step > prev ? "next" : "back";
    setActiveSlide(step, direction);

    backBtn.disabled = (step === 1);

    if (dot2) {
        if (step === 2) dot2.classList.add("active");
        else dot2.classList.remove("active");
    }

    if (step === 1) {
        const draft = readDraft();
        nextBtn.disabled = !draft.placeType;
    } else {
        nextBtn.disabled = false; // placeholder
    }
}

backBtn.addEventListener("click", () => slideToStep(step - 1));
nextBtn.addEventListener("click", () => slideToStep(step + 1));

document.getElementById("saveExitBtn").addEventListener("click", () => {
    alert("Saved as draft. (Redirect later to dashboard)");
});
document.getElementById("questionsBtn").addEventListener("click", () => {
    alert("FAQ coming soon.");
});

/* ===== Init ===== */
renderTypes();
initAccordion();
refreshSidePanel();
slideToStep(1);
