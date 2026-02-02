// core/store.js
window.ListingStore = (() => {
    const KEY = "vista_listing_draft";

    function readDraft() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
        catch { return {}; }
    }

    function saveDraft(patch) {
        const d = readDraft();
        const next = {
            id: d.id || ("draft-" + Date.now()),
            status: "DRAFT",
            placeType: d.placeType ?? null,     // step 1
            spaceType: d.spaceType ?? null,     // step 2
            location: d.location ?? { lat: null, lng: null, address: "" }, // step 3
            amenities: d.amenities ?? [],       // step 4
            photos: d.photos ?? [],             // step 4
            pricing: d.pricing ?? { nightly: null, downpayment: null },    // step 5
            rules: d.rules ?? { text: "" },     // step 5
            verified: d.verified ?? false,      // later
            ...d,
            ...patch,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(KEY, JSON.stringify(next));
        return next;
    }

    const SCHEMA = [
        { step: 1, label: "Place type", weight: 15, isDone: d => !!d.placeType },
        { step: 2, label: "Guest space", weight: 15, isDone: d => !!d.spaceType },
        { step: 3, label: "Location", weight: 20, isDone: d => !!d.location?.address || (!!d.location?.lat && !!d.location?.lng) },
        { step: 4, label: "Photos & amenities", weight: 25, isDone: d => (d.photos?.length >= 5) && (d.amenities?.length >= 1) },
        { step: 5, label: "Pricing & rules", weight: 20, isDone: d => !!d.pricing?.nightly && !!d.rules?.text },
        { step: 6, label: "Review & publish", weight: 5, isDone: () => false }
    ];

    function computeProgress(draft) {
        const verified = !!draft.verified;

        const steps = SCHEMA.map(s => {
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

    return { readDraft, saveDraft, computeProgress };
})();
