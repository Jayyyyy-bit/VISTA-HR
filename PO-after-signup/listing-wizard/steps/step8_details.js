window.Step8Init = function Step8Init({ nextBtn }) {
    const { ListingStore, SidePanel } = window;

    const titleEl = document.getElementById("listingTitle");
    const descEl = document.getElementById("listingDesc");
    const titleCount = document.getElementById("titleCount");
    const descCount = document.getElementById("descCount");
    const pvTitle = document.getElementById("pvTitle");
    const pvDesc = document.getElementById("pvDesc");

    const TITLE_MAX = 50;
    const DESC_MAX = 500;

    const MIN_TITLE = 10;   // soft rule for quality
    const MIN_DESC = 40;    // soft rule for quality

    if (!titleEl || !descEl) return;

    function readDetails() {
        const d = ListingStore.readDraft();
        const details = d.details || {};
        return {
            title: (details.title || "").toString(),
            description: (details.description || "").toString()
        };
    }

    function saveDetails(partial) {
        const d = ListingStore.readDraft();
        const details = d.details || {};
        ListingStore.saveDraft({ details: { ...details, ...partial } });
    }

    function validate(title, desc) {
        const t = (title || "").trim();
        const p = (desc || "").trim();

        // You can loosen these later, but it makes the wizard feel “real”
        const ok = (t.length >= MIN_TITLE) && (p.length >= MIN_DESC);
        return ok;
    }

    function paint() {
        const title = titleEl.value || "";
        const desc = descEl.value || "";

        if (titleCount) titleCount.textContent = String(title.length);
        if (descCount) descCount.textContent = String(desc.length);

        if (pvTitle) pvTitle.textContent = title.trim() || "—";
        if (pvDesc) pvDesc.textContent = desc.trim() || "—";

        if (nextBtn) nextBtn.disabled = !validate(title, desc);

        SidePanel.setTips({
            selectedLabel: "Details",
            tips: [
                "Keep your title specific: place type + landmark + key feature.",
                "Describe what guests get + what’s included (Wi-Fi, aircon, etc.).",
                "Avoid claims you can’t show in photos."
            ]
        });
        SidePanel.refresh();
    }

    // initial fill
    const { title, description } = readDetails();
    titleEl.value = title.slice(0, TITLE_MAX);
    descEl.value = description.slice(0, DESC_MAX);

    // bind
    let tTimer = null;
    function debouncedSave() {
        clearTimeout(tTimer);
        tTimer = setTimeout(() => {
            saveDetails({
                title: titleEl.value.trim(),
                description: descEl.value.trim()
            });
        }, 120);
    }

    titleEl.addEventListener("input", () => { paint(); debouncedSave(); });
    descEl.addEventListener("input", () => { paint(); debouncedSave(); });

    paint();
};
