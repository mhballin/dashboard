export const SEARCH_STRINGS = [
  {
    label: "🎯 LinkedIn Boolean — Primary Role Search",
    query: `("your title here" OR "alternate title") AND ("startup" OR "early stage" OR "series A")`,
    tip: "Paste into LinkedIn Jobs search bar. Filter: Date posted → Past week. Job type → Full-time.",
  },
  {
    label: "🔍 LinkedIn Boolean — Broader Search",
    query: `("related title" OR "adjacent title") AND ("startup" OR "small team" OR "founding team")`,
    tip: "Use when primary search runs dry.",
  },
  {
    label: "🌿 LinkedIn Boolean — Location Focused",
    query: `("your title" OR "alternate title") AND ("Your City" OR "Your State" OR "remote")`,
    tip: "Geo-focused. Also try filtering Location in LinkedIn directly.",
  },
  {
    label: "🔎 Google X-Ray Search (paste into Google)",
    query: `site:indeed.com "your title" "startup" "remote" -senior -principal`,
    tip: "Paste into Google.com — surfaces Indeed listings that LinkedIn misses.",
  },
];

export const JOB_BOARDS = [
  { section: "🚀 Startup-Focused", boards: [
    { name: "Wellfound",              url: "https://wellfound.com",              tag: "Early-stage startups" },
    { name: "Startup.jobs",           url: "https://startup.jobs",              tag: "Startup roles" },
    { name: "Work at a Startup (YC)", url: "https://workatastartup.com",        tag: "YC portfolio companies" },
    { name: "Contrary Talent",        url: "https://jobs.contrary.com",         tag: "VC-backed startups" },
    { name: "Lenny's Job Board",      url: "https://www.lennysjobs.com",        tag: "Growth company roles" },
  ]},
  { section: "📋 General", boards: [
    { name: "LinkedIn Jobs",          url: "https://www.linkedin.com/jobs",     tag: "Largest job network" },
    { name: "Indeed",                 url: "https://www.indeed.com",            tag: "Broad reach" },
    { name: "Glassdoor",              url: "https://www.glassdoor.com/Job",     tag: "Jobs + salary data" },
    { name: "Himalayas",              url: "https://himalayas.app",             tag: "Remote-first" },
    { name: "We Work Remotely",       url: "https://weworkremotely.com",        tag: "Remote roles" },
  ]},
  { section: "📰 Newsletters & Curated", boards: [
    { name: "Pallet Jobs",            url: "https://pallet.xyz",                tag: "Curated job pallets" },
    { name: "The Muse",               url: "https://www.themuse.com",           tag: "Culture-focused listings" },
    { name: "Morning Brew Jobs",      url: "https://jobs.morningbrew.com",      tag: "Business & tech roles" },
  ]},
  { section: "🎯 Niche / Specialty", boards: [
    { name: "Climate Draft",          url: "https://www.climatedraft.org",      tag: "Climate-focused roles" },
    { name: "80,000 Hours",           url: "https://jobs.80000hours.org",       tag: "Mission-driven orgs" },
    { name: "Idealist",               url: "https://www.idealist.org",          tag: "Nonprofits + social impact" },
    { name: "F6S Jobs",               url: "https://www.f6s.com/jobs",          tag: "Startup accelerator network" },
  ]},
];
