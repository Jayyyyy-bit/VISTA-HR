// core/router.js
(() => {
    const { $, on } = window.Dom;

    const stepHost = $("#stepHost");
    const backBtn = $("#backBtn");
    const nextBtn = $("#nextBtn");
    const dots = $("#dots");

    // ✅ adjust if your dashboard path changes
    const DASHBOARD_URL = "/Property-Owner/dashboard/property-owner-dashboard.html";

    const ROUTES = [
        { id: "step-1", file: "steps/step1_unit_category.html", init: window.Step1Init },
        { id: "step-2", file: "steps/step2_space_type.html", init: window.Step2Init },
        { id: "step-3", file: "steps/step3_location.html", init: window.Step3Init },
        { id: "step-4", file: "steps/step4_capacity.html", init: window.Step4Init },
        { id: "step-5", file: "steps/step5_amenities.html", init: window.Step5Init },
        { id: "step-6", file: "steps/step6_highlights.html", init: window.Step6Init },
        { id: "step-7", file: "steps/step7_photos.html", init: window.Step7Init },
        { id: "step-8", file: "steps/step8_details.html", init: window.Step8Init },
    ];

    function setHash(id) {
        location.hash = `#/${id}`;
    }

    function getRouteFromHash() {
        const h = (location.hash || "").replace("#/", "").trim();
        return h || "step-1";
    }

    function indexOfRoute(id) {
        return ROUTES.findIndex(r => r.id === id);
    }

    function renderDots(activeIndex) {
        if (!dots) return;
        dots.innerHTML = ROUTES
            .map((_, i) => `<span class="dot ${i <= activeIndex ? "active" : ""}"></span>`)
            .join("");
    }

    function setNextLabel(idx) {
        if (!nextBtn) return;
        const isLast = idx === ROUTES.length - 1;
        nextBtn.textContent = isLast ? "Finish" : "Next";
    }

    function updateStepKicker(idx) {
        const kicker = stepHost?.querySelector(".step-kicker");
        if (kicker) kicker.textContent = `Create listing • Step ${idx + 1} of ${ROUTES.length}`;
    }

    const STEP_CACHE = new Map();
    async function getStepHTML(file) {
        if (STEP_CACHE.has(file)) return STEP_CACHE.get(file);
        const res = await fetch(file, { cache: "no-store" });
        const html = await res.text();
        STEP_CACHE.set(file, html);
        return html;
    }

    async function loadStep(id) {
        const route = ROUTES.find(r => r.id === id) || ROUTES[0];
        const idx = indexOfRoute(route.id);

        // fetch ASAP (cache)
        const htmlPromise = getStepHTML(route.file);

        // fade out old
        if (stepHost?.dataset?.hasStep) {
            await window.StepTransition.fadeOut(stepHost);
        }

        // inject new while hidden
        const html = await htmlPromise;
        stepHost.innerHTML = html;
        stepHost.dataset.hasStep = "1";

        // update header label inside step
        updateStepKicker(idx);

        // init
        if (typeof route.init === "function") {
            route.init({ stepId: route.id, nextBtn, backBtn });
        }

        // lucide after DOM exists
        if (window.lucide?.createIcons) window.lucide.createIcons();

        // UI states
        renderDots(idx);
        setNextLabel(idx);
        if (backBtn) backBtn.disabled = idx <= 0;

        if (window.SidePanel?.refresh) window.SidePanel.refresh();

        // fade in
        await window.StepTransition.fadeIn(stepHost);
    }

    // Expose (optional)
    window.loadStep = loadStep;

    // Hash navigation
    on(backBtn, "click", () => {
        const current = getRouteFromHash();
        const idx = indexOfRoute(current);
        const prevId = ROUTES[Math.max(0, idx - 1)].id;
        setHash(prevId);
    });

    on(nextBtn, "click", () => {
        const current = getRouteFromHash();
        const idx = indexOfRoute(current);
        const isLast = idx >= ROUTES.length - 1;

        if (isLast) {
            // optional: mark draft status on finish
            window.ListingStore?.saveDraft?.({ status: "DRAFT" }); // or "READY_FOR_REVIEW"
            location.href = DASHBOARD_URL;
            return;
        }

        const nextId = ROUTES[idx + 1].id;
        setHash(nextId);
    });

    // Header buttons
    on($("#saveExitBtn"), "click", () => {
        // save draft then go dashboard
        window.ListingStore?.saveDraft?.({ status: "DRAFT" });
        location.href = `${DASHBOARD_URL}#/listings`;
    });

    on($("#questionsBtn"), "click", () => alert("FAQ coming soon."));

    // When hash changes, load correct step
    window.addEventListener("hashchange", () => {
        loadStep(getRouteFromHash());
    });

    // Initial load
    loadStep(getRouteFromHash());
})();
