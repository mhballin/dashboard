// Role-based default templates for Job Boards & Keywords setup
// Exports:
// - ROLE_OPTIONS: array of role id/label pairs for the setup UI
// - ROLE_TEMPLATES: object keyed by role id providing jobBoards, keywords, searchStrings

export const ROLE_OPTIONS = [
  { id: "ops-strategy", label: "Operations & Strategy" },
  { id: "software-eng", label: "Software Engineering" },
  { id: "product", label: "Product Management" },
  { id: "design", label: "Design & UX" },
  { id: "marketing", label: "Marketing & Growth" },
  { id: "data", label: "Data & Analytics" },
  { id: "custom", label: "Start from scratch" },
];

// ROLE_TEMPLATES: provide sensible defaults for new users by role.
// The `custom` role intentionally has no entry here so the app will initialize empty arrays.
export const ROLE_TEMPLATES = {
  // Operations & Strategy
  "ops-strategy": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Operations-Focused",
        boards: [
          { name: "Built In", url: "https://builtin.com/jobs", tag: "Tech company roles" },
          { name: "Workable Jobs", url: "https://resources.workable.com/job-board", tag: "Employer resources" },
          { name: "Greenhouse Jobs", url: "https://boards.greenhouse.io/", tag: "Company job boards" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "Wellfound (AngelList)", url: "https://wellfound.com", tag: "Early-stage startups" },
          { name: "We Work Remotely", url: "https://weworkremotely.com", tag: "Remote roles" },
          { name: "Remote OK", url: "https://remoteok.com", tag: "Remote listings" },
        ],
      },
      {
        section: "Niche / Specialty",
        boards: [
          { name: "The Muse", url: "https://www.themuse.com/jobs", tag: "Culture-focused listings" },
          { name: "FlexJobs", url: "https://www.flexjobs.com", tag: "Remote + flexible roles" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Operations Manager", "Director of Operations", "Head of Operations", "COO", "Operations Lead"] },
      { section: "Secondary / Stretch Titles", keywords: ["Program Manager", "Business Operations", "Strategy Manager", "Operations Analyst", "Site Operations"] },
      { section: "Skills & Tools", keywords: ["process improvement", "OKR", "project management", "SQL", "cross-functional", "stakeholder management", "P&L", "SOP"] },
      { section: "Company Type", keywords: ["startup", "Series A", "early-stage", "scaleup", "remote-friendly"] },
      { section: "Industry", keywords: ["SaaS", "fintech", "healthcare", "e-commerce", "marketplace"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Operations Manager\" OR \"Director of Operations\" OR \"Head of Operations\") AND (operations OR \"business operations\") NOT (intern OR internship)",
        tip: "Focus on core operations titles and exclude internships",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(program manager OR project manager OR \"operations analyst\") AND (process OR SOP OR \"cross functional\")",
        tip: "Broader titles that often map to operations work",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Operations Manager\") AND (San Francisco OR \"New York\" OR Remote)",
        tip: "Add locations you care about or include Remote",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Operations Manager\" (startup OR \"Series A\" OR \"early-stage\")",
        tip: "X-ray LinkedIn job listings for startup ops roles",
      },
    ],
  },

  // Software Engineering
  "software-eng": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Engineering-Focused",
        boards: [
          { name: "Wellfound (AngelList)", url: "https://wellfound.com", tag: "Early-stage startups" },
          { name: "Hacker News Jobs", url: "https://news.ycombinator.com/jobs", tag: "Tech startup listings" },
          { name: "Key Values Jobs", url: "https://keyvalues.com/jobs", tag: "Values-focused hiring" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "We Work Remotely", url: "https://weworkremotely.com", tag: "Remote roles" },
          { name: "Remote OK", url: "https://remoteok.com", tag: "Remote listings" },
          { name: "Stack Overflow Jobs", url: "https://stackoverflow.com/jobs", tag: "Developer jobs" },
        ],
      },
      {
        section: "Niche / Specialty",
        boards: [
          { name: "Built In", url: "https://builtin.com/jobs", tag: "Tech company roles" },
          { name: "Dice", url: "https://www.dice.com", tag: "Tech & engineering jobs" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Software Engineer", "Backend Engineer", "Frontend Engineer", "Full Stack Engineer", "SRE"] },
      { section: "Secondary / Stretch Titles", keywords: ["Mobile Engineer", "Platform Engineer", "DevOps Engineer", "Engineering Manager", "Data Engineer"] },
      { section: "Skills & Technologies", keywords: ["JavaScript", "TypeScript", "Python", "Go", "Java", "Node.js", "React", "Docker", "Kubernetes", "AWS", "SQL", "NoSQL"] },
      { section: "Company Type", keywords: ["startup", "Series A", "scaleup", "remote", "SaaS"] },
      { section: "Industry", keywords: ["fintech", "healthcare", "adtech", "marketplace", "developer tools"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Software Engineer\" OR \"Backend Engineer\" OR \"Full Stack Engineer\") AND (JavaScript OR Python OR Go) NOT (intern OR internship)",
        tip: "Target common engineering titles and languages",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(\"Platform Engineer\" OR \"DevOps\" OR \"SRE\") AND (Kubernetes OR Docker OR AWS)",
        tip: "Focus on infrastructure and platform roles",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Software Engineer\") AND (Remote OR \"San Francisco\" OR \"New York\")",
        tip: "Include Remote and preferred metro areas",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Software Engineer\" (\"React\" OR \"Node.js\" OR \"Python\")",
        tip: "X-ray LinkedIn listings for specific tech stacks",
      },
    ],
  },

  // Product Management
  "product": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Product-Focused",
        boards: [
          { name: "Mind the Product Jobs", url: "https://jobs.mindtheproduct.com", tag: "Product management roles" },
          { name: "Built In", url: "https://builtin.com/jobs", tag: "Tech company roles" },
          { name: "Wellfound (AngelList)", url: "https://wellfound.com", tag: "Early-stage startups" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "We Work Remotely", url: "https://weworkremotely.com", tag: "Remote roles" },
          { name: "Remote OK", url: "https://remoteok.com", tag: "Remote listings" },
        ],
      },
      {
        section: "Niche / Specialty",
        boards: [
          { name: "Product Hunt Jobs", url: "https://www.producthunt.com/jobs", tag: "Startup product roles" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Product Manager", "Senior Product Manager", "Group Product Manager", "Head of Product", "Product Lead"] },
      { section: "Secondary / Stretch Titles", keywords: ["Technical Product Manager", "Product Owner", "Program Manager", "Product Operations"] },
      { section: "Skills & Tools", keywords: ["roadmapping", "A/B testing", "user research", "analytics", "SQL", "OKRs", "JIRA", "product strategy"] },
      { section: "Company Type", keywords: ["startup", "Series A", "early-stage", "B2B", "SaaS"] },
      { section: "Industry", keywords: ["fintech", "e-commerce", "marketplace", "healthtech", "edtech"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Product Manager\" OR \"Senior Product Manager\") AND (product OR roadmap OR \"user research\") NOT (intern OR internship)",
        tip: "Search core PM titles and product skill keywords",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(\"Technical Product Manager\" OR \"Product Owner\") AND (technical OR API OR \"data\")",
        tip: "Include technical PM variants",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Product Manager\") AND (Remote OR \"London\" OR \"San Francisco\")",
        tip: "Add location qualifiers or Remote",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Product Manager\" (roadmap OR \"user research\")",
        tip: "X-ray listings mentioning roadmap or research",
      },
    ],
  },

  // Design & UX
  "design": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Design-Focused",
        boards: [
          { name: "Dribbble Jobs", url: "https://dribbble.com/jobs", tag: "Design team hiring" },
          { name: "Behance Joblist", url: "https://www.behance.net/joblist", tag: "Creative industry roles" },
          { name: "AIGA Design Jobs", url: "https://designjobs.aiga.org", tag: "Design industry jobs" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "We Work Remotely", url: "https://weworkremotely.com", tag: "Remote roles" },
          { name: "Remote OK", url: "https://remoteok.com", tag: "Remote listings" },
        ],
      },
      {
        section: "Niche / Specialty",
        boards: [
          { name: "UX Jobs Board", url: "https://uxdesign.cc/jobs", tag: "UX-focused roles" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Product Designer", "UX Designer", "UI Designer", "Senior Designer", "Design Lead"] },
      { section: "Secondary / Stretch Titles", keywords: ["Interaction Designer", "Visual Designer", "UX Researcher", "Design Systems Engineer"] },
      { section: "Skills & Tools", keywords: ["Figma", "Sketch", "Adobe XD", "prototyping", "user research", "wireframing", "design systems", "accessibility", "usability testing", "A/B testing"] },
      { section: "Company Type", keywords: ["startup", "Series A", "agency", "remote", "SaaS"] },
      { section: "Industry", keywords: ["consumer apps", "fintech", "healthtech", "marketplace", "e-commerce"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Product Designer\" OR \"UX Designer\" OR \"UI Designer\") AND (Figma OR prototyping OR \"user research\") NOT (intern OR internship)",
        tip: "Search for designers mentioning design tools and research",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(\"Interaction Designer\" OR \"Visual Designer\") AND (design systems OR accessibility)",
        tip: "Broader design roles and systems-focused keywords",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Product Designer\") AND (Remote OR \"Berlin\" OR \"London\")",
        tip: "Include preferred geographies or Remote",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Product Designer\" (Figma OR prototyping)",
        tip: "X-ray listings that call out prototyping tools",
      },
    ],
  },

  // Marketing & Growth
  "marketing": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Marketing-Focused",
        boards: [
          { name: "GrowthHackers Jobs", url: "https://growthhackers.com/jobs", tag: "Growth & marketing roles" },
          { name: "MarketingHire", url: "https://www.marketinghire.com", tag: "Marketing jobs" },
          { name: "Built In", url: "https://builtin.com/jobs", tag: "Tech company roles" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "Wellfound (AngelList)", url: "https://wellfound.com", tag: "Early-stage startups" },
          { name: "We Work Remotely", url: "https://weworkremotely.com", tag: "Remote roles" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Growth Marketer", "Growth Manager", "Head of Growth", "Marketing Manager", "Acquisition Manager"] },
      { section: "Secondary / Stretch Titles", keywords: ["Content Marketer", "SEO Manager", "Performance Marketer", "Product Marketing Manager"] },
      { section: "Skills & Tools", keywords: ["SEO", "SEM", "Google Analytics", "paid acquisition", "content strategy", "email marketing", "A/B testing", "funnel optimization", "SQL"] },
      { section: "Company Type", keywords: ["startup", "Series A", "growth-stage", "SaaS", "consumer"] },
      { section: "Industry", keywords: ["e-commerce", "SaaS", "fintech", "consumer apps", "media"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Growth Marketer\" OR \"Head of Growth\" OR \"Performance Marketer\") AND (acquisition OR SEO OR paid)",
        tip: "Target growth and acquisition-focused roles",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(\"Content Marketer\" OR \"Product Marketing\") AND (content OR messaging OR strategy)",
        tip: "Broader marketing functions that support growth",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Growth Marketer\") AND (Remote OR \"New York\" OR \"San Francisco\")",
        tip: "Include Remote or city filters",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Growth\" (acquisition OR SEO OR \"paid acquisition\")",
        tip: "X-ray growth-related listings",
      },
    ],
  },

  // Data & Analytics
  "data": {
    jobBoards: [
      {
        section: "General",
        boards: [
          { name: "LinkedIn Jobs", url: "https://www.linkedin.com/jobs", tag: "Largest job network" },
          { name: "Indeed", url: "https://www.indeed.com", tag: "Broad reach" },
          { name: "Glassdoor", url: "https://www.glassdoor.com/Job/index.htm", tag: "Jobs + salary data" },
        ],
      },
      {
        section: "Data-Focused",
        boards: [
          { name: "KDNuggets Jobs", url: "https://www.kdnuggets.com/jobs/index.html", tag: "Data science jobs" },
          { name: "DataJobs", url: "https://datajobs.com", tag: "Data & analytics roles" },
          { name: "Kaggle Jobs", url: "https://www.kaggle.com/jobs", tag: "Data science roles" },
        ],
      },
      {
        section: "Remote & Startup",
        boards: [
          { name: "Wellfound (AngelList)", url: "https://wellfound.com", tag: "wellfound" },
          { name: "Remote OK", url: "https://remoteok.com", tag: "remoteok" },
        ],
      },
    ],

    keywords: [
      { section: "Primary Titles", keywords: ["Data Scientist", "Data Analyst", "Senior Data Scientist", "Data Engineer", "ML Engineer"] },
      { section: "Secondary / Stretch Titles", keywords: ["Analytics Engineer", "BI Analyst", "Machine Learning Engineer", "Research Scientist"] },
      { section: "Skills & Tools", keywords: ["Python", "R", "SQL", "Spark", "Pandas", "TensorFlow", "PyTorch", "Tableau", "Looker", "machine learning", "statistics"] },
      { section: "Company Type", keywords: ["startup", "Series A", "data-driven", "SaaS", "enterprise"] },
      { section: "Industry", keywords: ["fintech", "healthcare", "adtech", "e-commerce", "marketplace"] },
    ],

    searchStrings: [
      {
        label: "LinkedIn Boolean — Primary Role Search",
        query: "(\"Data Scientist\" OR \"Data Analyst\" OR \"Data Engineer\") AND (Python OR SQL OR machine learning)",
        tip: "Target core data titles with common tools",
      },
      {
        label: "LinkedIn Boolean — Broader Search",
        query: "(\"Analytics Engineer\" OR \"BI Analyst\") AND (Looker OR Tableau OR ETL)",
        tip: "Broader analytics and BI-focused search",
      },
      {
        label: "LinkedIn Boolean — Location Focused",
        query: "(\"Data Scientist\") AND (Remote OR \"San Francisco\" OR \"New York\")",
        tip: "Include Remote or target cities",
      },
      {
        label: "Google X-Ray Search",
        query: "site:linkedin.com/jobs \"Data Scientist\" (Python OR \"machine learning\")",
        tip: "X-ray LinkedIn for data roles mentioning ML or Python",
      },
    ],
  },
};

// End of roleTemplates.js
