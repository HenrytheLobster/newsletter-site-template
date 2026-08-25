/**
 * Catalog of all three markets. Used by:
 *   - template preview builds (`MARKET=alexandria|newport|wasatch`)
 *   - bleed.mjs, which must know every foreign name/domain/GA/Kit token
 *
 * A converted site repo owns the live copy at `src/config/market.js`.
 * prepare-market prefers that file when it exists (so a headline edit in
 * the site is what both the live build and a template preview of that
 * market see). siteRepo/contentDir still come from this catalog — those
 * paths are local to the owner's machine and a Cloudflare build never
 * sees them.
 *
 * Values lifted from the live site repos and market.yaml — not invented.
 * home.headline is the owner-editable line (plain factual default).
 */

/** @typedef {typeof MARKETS[keyof typeof MARKETS]} Market */

export const MARKETS = {
  alexandria: {
    id: "alexandria",
    name: "NOVA This Week",
    shortName: "NOVA",
    domain: "novathisweek.com",
    regionLabel: "Northern Virginia, Alexandria & nearby DC",
    timezone: "America/New_York",
    tagline:
      "A short weekly email for Northern Virginia and nearby DC: the events, openings, and local notes worth leaving the house for.",
    footer:
      "NOVA This Week — a short weekly email for Northern Virginia folks who want the useful parts without digging through ten different calendars.",
    guidesBasePath: "guides",
    logo: {
      src: "/images/brand/nova-logo.png",
      width: 80,
      height: 80,
    },
    favicon: "/favicon.png",
    archiveImage: "/images/brand/nova-logo.png",
    siteRepo: "/Volumes/SSD/Projects/newsletter-sites/novathisweek-site",
    contentDir:
      "/Volumes/SSD/Projects/newsletter-platform/markets/alexandria/content",
    colors: {
      ivory: "#f6efe0",
      paper: "#fffaf0",
      stage: "#efe6d2",
      border: "#c9b89a",
      blue: "#1e1714",
      steel: "#6e2434",
      iron: "#1e1714",
    },
    kit: {
      account: "nova-this-week",
      uid: "db34c1d3c0",
      src: "https://nova-this-week.kit.com/db34c1d3c0/index.js",
    },
    analyticsId: "G-C6WBNNZ060",
    ogImage: "/images/dc-fireworks-hero.jpg",
    home: {
      eyebrow: "Northern Virginia, Alexandria & nearby DC",
      headline: "A weekly email of things to do around Northern Virginia.",
      dek: "One short email every week with the events, openings, and local notes actually worth your time — so you spend less time hunting and more time out the door.",
      promises: [
        "The good stuff, hand-picked — not every event in the county.",
        "Real notes for Alexandria, Arlington, Fairfax, and nearby DC.",
        "One tap to this week's issue or anything in the archive.",
        "One email a week. No filler, no inbox clutter.",
      ],
      subscribeHeading: "Get this week's issue",
      subscribeBody:
        "A short weekly email with the events and local notes already filtered down.",
    },
    featuredLegacy: [
      {
        href: "/guides/secret-date-night-registry/",
        title: "Secret date night registry",
        description:
          "Hidden bars, unusual spots, and easy neighborhood picks for a better night out around Northern Virginia.",
        image: "/images/guides/secret-date-night-registry/hidden-door.webp",
      },
      {
        href: "/guides/splash-pad-pool-map/",
        title: "Splash pad and pool map",
        description:
          "A parent-friendly summer shortlist with splash pads, waterparks, and the practical notes that matter before you load the car.",
        image: "/images/guides/splash-pad-pool-map/hero.webp",
      },
      {
        href: "/guides/libraries-for-remote-work/",
        title: "Libraries for remote work",
        description:
          "Quiet branches, Wi-Fi-ready work spots, and the local library picks worth trying when you need to leave the house.",
        image: "/images/guides/libraries-for-remote-work/hero.webp",
      },
      {
        href: "/fireworks-dc",
        title: "Where to watch the fireworks",
        description:
          "Times, spots, and the practical bits for watching fireworks around Northern Virginia and DC.",
        image: "/images/dc-fireworks-hero.jpg",
      },
    ],
    leadMagnets: [
      {
        href: "/guides/secret-date-night-registry/",
        title: "Northern Virginia Secret Date Night Registry",
        description: "A curated swipe file of date-night ideas across NOVA.",
        image: "/images/guides/secret-date-night-registry/hidden-door.webp",
        kit: {
          uid: "a3fdb10f7b",
          src: "https://nova-this-week.kit.com/a3fdb10f7b/index.js",
        },
      },
      {
        href: "/guides/splash-pad-pool-map/",
        title: "Northern Virginia Splash Pad & Pool Map",
        description: "A static summer water-play guide for NOVA families.",
        image: "/images/guides/splash-pad-pool-map/hero.webp",
        kit: {
          uid: "c7eb3692a0",
          src: "https://nova-this-week.kit.com/c7eb3692a0/index.js",
        },
      },
      {
        href: "/guides/libraries-for-remote-work/",
        title: "Northern Virginia Libraries for Remote Work",
        description:
          "Where to work when you need Wi-Fi, quiet, outlets, and free parking.",
        image: "/images/guides/libraries-for-remote-work/hero.webp",
        kit: {
          uid: "c23367fd95",
          src: "https://nova-this-week.kit.com/c23367fd95/index.js",
        },
      },
      {
        href: "/guides/date-night.html",
        title: "The actually-good date night guide",
        description:
          "Twelve complete date-night plans around Fairfax, Arlington, Alexandria, Falls Church, Springfield, Tysons and Vienna.",
        image: "/images/guides/date-night/hero.webp",
        kit: {
          uid: "05cdb32c30",
          src: "https://nova-this-week.kit.com/05cdb32c30/index.js",
        },
      },
    ],
    nav: {
      home: "Home",
      issue: "This week's issue",
      guides: "Guides",
      archive: "Past Issues",
      subscribe: "Subscribe",
    },
  },

  newport: {
    id: "newport",
    name: "Newport News This Week",
    shortName: "Newport",
    domain: "newportnewsletter.com",
    regionLabel: "Newport News, Virginia",
    timezone: "America/New_York",
    tagline:
      "A concise weekly Newport News newsletter with local events, civic notes, development watch, and useful community texture.",
    footer:
      "Newport News This Week — a short weekly email with useful events, civic notes, development watch, and the little local details that make the city easier to understand.",
    guidesBasePath: "guides",
    logo: {
      src: "/images/brand/newport-newsletter-logo.png",
      width: 80,
      height: 80,
    },
    favicon: "/favicon.png",
    archiveImage: "/images/brand/newport-newsletter-logo.png",
    siteRepo: "/Volumes/SSD/Projects/newsletter-sites/newportnewsletter-site",
    contentDir:
      "/Volumes/SSD/Projects/newsletter-platform/markets/newport/content",
    colors: {
      ivory: "#f6efe0",
      paper: "#fffaf0",
      stage: "#efe6d2",
      border: "#c9b89a",
      blue: "#1e1714",
      steel: "#6e2434",
      iron: "#1e1714",
    },
    kit: {
      account: "newport-newsletter",
      uid: "78016a6dfc",
      src: "https://newport-newsletter.kit.com/78016a6dfc/index.js",
    },
    analyticsId: "G-NBCD5YGRCN",
    ogImage: "/guides/rainy-day-indoor-play-map/images/social.jpg",
    home: {
      eyebrow: "Newport News, Virginia",
      headline: "A weekly email of things to do in Newport News.",
      dek: "Newport News This Week is a short weekly email with useful events, civic notes, development watch, and the little local details that make the city easier to understand.",
      promises: [
        "Good events, not every event.",
        "Plain-English civic and development notes.",
        "Local history, practical reminders, and seasonal texture.",
        "One email a week. No filler.",
      ],
      subscribeHeading: "Get the next issue",
      subscribeBody:
        "A short weekly email with local events, civic notes, development watch, and useful community texture.",
    },
    featuredLegacy: [
      {
        href: "/guides/free-museum-days-calendar/",
        title: "Free & cheap museum guide",
        description:
          "Every free and nearly-free museum in Newport News, plus the programs that get you in free.",
        image: "/guides/free-museum-days-calendar/images/hero.jpg",
      },
      {
        href: "/guides/rainy-day-indoor-play-map/",
        title: "Rainy day indoor play",
        description:
          "Indoor spots and ready-made plans for when the weather ruins the day.",
        image: "/guides/rainy-day-indoor-play-map/images/hero.jpg",
      },
      {
        href: "/guides/waterfront-date-night-guide/",
        title: "Waterfront date night",
        description:
          "Date ideas and ready-made plans, from sunset dinners to free river walks.",
        image: "/guides/waterfront-date-night-guide/images/hero.jpg",
      },
    ],
    leadMagnets: [
      {
        href: "/guides/waterfront-date-night-guide/",
        title: "Waterfront date night",
        description:
          "Fifteen waterfront date ideas in Newport News — sunset dinners, free river walks, and cozy nights out — with ready-made plans so you can pick one and go.",
        image: "/guides/waterfront-date-night-guide/images/hero.jpg",
        kit: {
          uid: "614b2b6da7",
          src: "https://newport-newsletter.kit.com/614b2b6da7/index.js",
        },
      },
      {
        href: "/guides/rainy-day-indoor-play-map/",
        title: "Rainy day indoor play",
        description:
          "Fifteen indoor spots in Newport News — with ready-made plans for the exact day you're having — so you're never stuck when the weather turns.",
        image: "/guides/rainy-day-indoor-play-map/images/hero.jpg",
        kit: {
          uid: "8e14ffd39f",
          src: "https://newport-newsletter.kit.com/8e14ffd39f/index.js",
        },
      },
      {
        href: "/guides/free-museum-days-calendar/",
        title: "Free & cheap museum guide",
        description:
          "Every free and nearly-free museum in Newport News, plus the programs that get you in free.",
        image: "/guides/free-museum-days-calendar/images/hero.jpg",
        kit: {
          uid: "78016a6dfc",
          src: "https://newport-newsletter.kit.com/78016a6dfc/index.js",
        },
      },
    ],
    nav: {
      home: "Home",
      issue: "This week's issue",
      guides: "Guides",
      archive: "Past Issues",
      subscribe: "Subscribe",
    },
  },

  wasatch: {
    id: "wasatch",
    name: "Stuff To Do In Utah",
    shortName: "Utah",
    domain: "stufftodoinutah.com",
    regionLabel: "Salt Lake, Utah County, Davis, Weber & Park City",
    timezone: "America/Denver",
    tagline:
      "A short weekly email for the Wasatch Front: the events, openings, and local notes worth leaving the house for, from Ogden to Provo.",
    footer:
      "Stuff To Do In Utah — a short weekly email for Wasatch Front folks who want the useful parts without digging through ten different calendars.",
    guidesBasePath: "guides",
    logo: {
      src: "/images/brand/stuff-to-do-in-utah-logo.png",
      width: 80,
      height: 80,
    },
    favicon: "/favicon.png",
    archiveImage: "/images/brand/stuff-to-do-in-utah-logo.png",
    siteRepo: "/Volumes/SSD/Projects/newsletter-sites/stufftodoinutah-site",
    contentDir:
      "/Volumes/SSD/Projects/newsletter-platform/markets/wasatch/content",
    colors: {
      ivory: "#f6efe0",
      paper: "#fffaf0",
      stage: "#efe6d2",
      border: "#c9b89a",
      blue: "#1e1714",
      steel: "#6e2434",
      iron: "#1e1714",
    },
    kit: {
      account: "stuff-to-do-in-utah",
      uid: "a2c36795e2",
      src: "https://stuff-to-do-in-utah.kit.com/a2c36795e2/index.js",
    },
    analyticsId: "G-ERME16NKE0",
    ogImage: "/images/hero.jpg",
    home: {
      eyebrow: "Salt Lake, Utah County, Davis, Weber & Park City",
      headline: "A weekly email of things to do along the Wasatch Front.",
      dek: "One short email every week with the events, openings, and local notes actually worth your time — so you spend less time hunting and more time out the door.",
      promises: [
        "The good stuff, hand-picked — not every event in the valley.",
        "Real notes from Ogden to Provo, plus Park City and the canyons.",
        "One tap to this week's issue or anything in the archive.",
        "One email a week. No filler, no inbox clutter.",
      ],
      subscribeHeading: "Get it every week",
      subscribeBody: "Free, one email a week, unsubscribe in one click.",
    },
    featuredLegacy: [
      {
        href: "/guides/beginner-hikes-salt-lake-city",
        title: "Beginner hikes in SLC",
        description:
          "Ten beginner-friendly trails compared by distance, elevation gain and dog rules — plus how to judge a trail before you drive to it.",
        image: "/guides/beginner-hikes-salt-lake-city/images/hero.jpg",
      },
      {
        href: "/guides/dog-friendly-trails-utah",
        title: "Dog-friendly Utah trails",
        description:
          "Where dogs are allowed and where they are banned — Millcreek's odd/even rule, the Cottonwood watershed ban, and every national park limit in one table.",
        image: "/guides/dog-friendly-trails-utah/images/hero.jpg",
      },
      {
        href: "/guides/utah-hot-springs",
        title: "Utah hot springs",
        description:
          "Ten springs compared by cost, access, water temperature and region — from free roadside pools to full resorts.",
        image: "/guides/utah-hot-springs/images/hero.jpg",
      },
    ],
    leadMagnets: [
      {
        href: "/guides/beginner-hikes-salt-lake-city",
        title: "Beginner hikes in SLC",
        description:
          "Ten beginner-friendly trails compared by distance, elevation gain and dog rules — plus how to judge a trail before you drive to it.",
        image: "/guides/beginner-hikes-salt-lake-city/images/hero.jpg",
      },
      {
        href: "/guides/dog-friendly-trails-utah",
        title: "Dog-friendly Utah trails",
        description:
          "Where dogs are allowed and where they are banned — Millcreek's odd/even rule, the Cottonwood watershed ban, and every national park limit in one table.",
        image: "/guides/dog-friendly-trails-utah/images/hero.jpg",
      },
      {
        href: "/guides/utah-hot-springs",
        title: "Utah hot springs",
        description:
          "Ten springs compared by cost, access, water temperature and region — from free roadside pools to full resorts.",
        image: "/guides/utah-hot-springs/images/hero.jpg",
      },
    ],
    nav: {
      home: "Home",
      issue: "This week's issue",
      guides: "Guides",
      archive: "Past Issues",
      subscribe: "Subscribe",
    },
  },
};

export const MARKET_IDS = Object.keys(MARKETS);

export function getMarketId() {
  const id = process.env.MARKET;
  if (!id || !MARKETS[id]) {
    throw new Error(
      `Set MARKET to one of: ${MARKET_IDS.join(", ")}. Got ${JSON.stringify(id)}.`
    );
  }
  return id;
}

export function getMarket(id = process.env.MARKET) {
  const resolved = id || process.env.MARKET;
  if (!resolved || !MARKETS[resolved]) {
    throw new Error(
      `Set MARKET to one of: ${MARKET_IDS.join(", ")}. Got ${JSON.stringify(resolved)}.`
    );
  }
  return MARKETS[resolved];
}

export function siteUrl(market) {
  return `https://${market.domain}`;
}

export function kitSrc(market) {
  return market.kit.src;
}

export function guidesIndexPath(market) {
  return `/${market.guidesBasePath}`;
}

export function guidePath(market, slug) {
  return `/${market.guidesBasePath}/${slug}`;
}

export function foreignIdentifiers(currentId) {
  return MARKET_IDS.filter((id) => id !== currentId).flatMap((id) => {
    const m = MARKETS[id];
    return [
      { kind: "name", value: m.name },
      { kind: "domain", value: m.domain },
      { kind: "analyticsId", value: m.analyticsId },
      { kind: "kitUid", value: m.kit.uid },
      { kind: "kitHost", value: `${m.kit.account}.kit.com` },
    ];
  });
}
