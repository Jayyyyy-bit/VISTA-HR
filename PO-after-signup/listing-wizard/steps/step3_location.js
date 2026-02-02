window.Step3Init = function ({ nextBtn, backBtn }) {
    const { readDraft, saveDraft } = window.ListingStore;

    const stageSearch = document.getElementById("locStageSearch");
    const stageConfirm = document.getElementById("locStageConfirm");

    const addressSearch = document.getElementById("addressSearch");
    const confirmBtn = document.getElementById("confirmAddressBtn");

    const country = document.getElementById("country");
    const unit = document.getElementById("unit");
    const building = document.getElementById("building");
    const street = document.getElementById("street");
    const barangay = document.getElementById("barangay");
    const city = document.getElementById("city");
    const zip = document.getElementById("zip");
    const province = document.getElementById("province");
    const preciseToggle = document.getElementById("preciseToggle");

    const DEFAULT_LOC = {
        lat: null, lng: null,
        addressLine: "",
        country: "Philippines",
        unit: "", building: "",
        street: "", barangay: "", city: "", zip: "", province: "",
        precise: false
    };

    const draft = readDraft();
    const loc = { ...DEFAULT_LOC, ...(draft.location || {}) };

    function patchLocation(patch) {
        const d = readDraft();
        const nextLoc = { ...DEFAULT_LOC, ...(d.location || {}), ...patch };
        saveDraft({ location: nextLoc });
        window.SidePanel.refresh();
        refreshNext();
    }

    function setMode(mode) {
        const isConfirm = mode === "confirm";
        stageSearch.hidden = isConfirm;
        stageConfirm.hidden = !isConfirm;
    }

    // TEMP done rule: address complete OR coords exist
    function isDoneLocation(L) {
        const hasCoords = !!L.lat && !!L.lng;
        const hasAddress = !!L.street && !!L.city && !!L.province && !!L.zip;
        return hasCoords || hasAddress;
    }

    function refreshNext() {
        const d = readDraft();
        nextBtn.disabled = !isDoneLocation(d.location || {});
    }

    // hydrate search
    addressSearch.value = loc.addressLine || "";
    confirmBtn.disabled = (addressSearch.value.trim().length < 6);

    addressSearch.addEventListener("input", () => {
        const v = addressSearch.value.trim();
        patchLocation({ addressLine: v });
        confirmBtn.disabled = v.length < 6;
    });

    // Confirm from search → show form
    confirmBtn.addEventListener("click", () => {
        // carry over search into street if empty
        const line = addressSearch.value.trim();
        if (line && !street.value) street.value = line;

        patchLocation({ addressLine: line, street: street.value.trim() });
        setMode("confirm");
    });

    // hydrate form fields
    if (country) country.value = loc.country || "Philippines";
    unit.value = loc.unit || "";
    building.value = loc.building || "";
    street.value = loc.street || "";
    barangay.value = loc.barangay || "";
    city.value = loc.city || "";
    zip.value = loc.zip || "";
    province.value = loc.province || "";
    preciseToggle.checked = !!loc.precise;

    // save-on-type
    const bind = (el, key) => el.addEventListener("input", () => patchLocation({ [key]: el.value.trim() }));
    bind(unit, "unit");
    bind(building, "building");
    bind(street, "street");
    bind(barangay, "barangay");
    bind(city, "city");
    bind(zip, "zip");
    bind(province, "province");

    country.addEventListener("change", () => patchLocation({ country: country.value }));
    preciseToggle.addEventListener("change", () => patchLocation({ precise: preciseToggle.checked }));

    // Start mode
    if (loc.street || loc.city || loc.zip || loc.province) setMode("confirm");
    else setMode("search");

    // Tips
    if (window.SidePanel?.setTips) {
        window.SidePanel.setTips({
            selectedLabel: "Location",
            tips: [
                "Use the exact street address for better discovery later.",
                "If inside a building, include unit/floor for delivery and check-in.",
                "You can control map precision when published."
            ]
        });
    }
    window.SidePanel?.refresh?.();


    refreshNext();

    // Future-proof: map adapter hooks (no-op for now)
    window.MapAdapter = window.MapAdapter || {
        bindAutocomplete: () => { },
        setPin: () => { }
    };
};
