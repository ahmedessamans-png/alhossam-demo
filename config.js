// DRYV Website Configuration
// All live settings that the owner may change without code edits

const DRYV_CONFIG = {
  // Site identity
  brand: "DRYV",
  slogan: "Strength in Motion.",
  baseUrl: "https://dryv.com",

  // Owner-editable content (also in catalog.json for duplication)
  announcement: {
    en: "Free delivery across Egypt on orders over EGP 950",
    ar: "توصيل مجاني لكل محافظات مصر للطلبات فوق ٩٥٠ ج.م"
  },

  // Analytics and pixels (empty = off)
  ga4: "",
  gtm: "",
  metaPixel: "",
  tiktokPixel: "",

  // Order endpoint (Google Apps Script web app URL) - empty in staging
  orderEndpoint: "",

  // Feature flags
  staging: true,
  demo: true,
  intro: { enabled: true },

  // Language
  defaultLang: "en",
  supportedLangs: ["en", "ar"],

  // Social links (PLACEHOLDER)
  social: {
    instagram: "",
    whatsapp: "",
    email: "",
    tiktok: ""
  }
};

// Export for module and global
if (typeof module !== "undefined") module.exports = DRYV_CONFIG;
window.DRYV_CONFIG = DRYV_CONFIG;