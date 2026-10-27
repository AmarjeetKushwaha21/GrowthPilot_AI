// ─── Application Constants ───

export const DEFAULT_MERCHANTS = [
    "Sharma Café",
    "Gupta Sweets",
    "FreshBite Corner"
];

export const CAMPAIGN_STATUSES = {
    RECOMMENDED: "recommended",
    APPROVED: "approved",
    REJECTED: "rejected",
    ACTIVE: "active",
    COMPLETED: "completed"
};

export const FLOW_STEPS = [
    { id: "detect", label: "Detect Drop" },
    { id: "recommend", label: "Recommend" },
    { id: "approve", label: "Merchant Approval" },
    { id: "execute", label: "Execute Offer" },
    { id: "measure", label: "Measure Uplift" },
    { id: "grow", label: "Learn & Grow" }
];
