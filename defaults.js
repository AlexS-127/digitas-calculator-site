// Research defaults. Every value says whether it is sourced, derived or assumed,
// and which source backs it. Quotes and caveats: RESEARCH.md. References: SOURCES.md.
(function (root) {
  'use strict';

  const sources = {
    cop2023: {
      apa: 'Association of National Advertisers & 4As. (2023). The cost of the pitch [Research by Advertiser Perceptions]. ANA.',
      url: 'https://ana.net/miccontent/show/id/rr-2023-07-ana-4as-cost-of-the-pitch',
    },
    tenure2025: {
      apa: 'Association of National Advertisers & 4As. (2025, April). Client-agency AOR relationship tenure. ANA.',
      url: 'https://www.ana.net/content/show/id/pr-2025-04-tenure',
    },
    blsOews: {
      apa: 'U.S. Bureau of Labor Statistics. (2026). Occupational employment and wage statistics, May 2025: 11-2021 Marketing managers.',
      url: 'https://www.bls.gov/oes/current/oes112021.htm',
    },
    blsEcec: {
      apa: 'U.S. Bureau of Labor Statistics. (2026, September 9). Employer costs for employee compensation, June 2026 (Table 4) [News release].',
      url: 'https://www.bls.gov/news.release/ecec.t04.htm',
    },
    ana2022: {
      apa: 'Association of National Advertisers. (2022, December 13). Labor-based fees remain dominant form of agency compensation: ANA report [Press release].',
      url: 'https://ana.net/content/show/id/76981',
    },
    wfa2019: {
      apa: 'World Federation of Advertisers & OxfordSM. (2019). Designing for integration: Global marketing communications organisation research. WFA. Reported by Whitman, R. (2019, November 21), MediaPost.',
      url: 'https://www.wfanet.org/',
    },
    campaign2025: {
      apa: 'Campaign US Staff. (2025, April 15). Agency performance review 2025: Digitas. Campaign US.',
      url: 'https://www.campaignlive.com/article/agency-performance-review-2025-digitas/1913343',
    },
    trinityp3: {
      apa: 'Woolley, D. (2023, December 7). How do your agency rates stack up and why? TrinityP3. (Original work published 2014)',
      url: 'https://www.trinityp3.com/rate-benchmarking/do-your-rates-stack-up/',
    },
    gartner2025: {
      apa: 'Chief Marketer. (2025, May 25). Gartner: 39% of CMOs plan to reduce labor costs and cut agency allocations. Reporting Gartner (2025), 2025 CMO spend survey (n = 402).',
      url: 'https://www.chiefmarketer.com/gartner-39-of-cmos-plan-to-reduce-labor-costs-and-cut-agency-allocation',
    },
    digitasPractices: {
      apa: 'Digitas. (n.d.). What we do. Retrieved November 11, 2026.',
      url: 'https://www.digitas.com/en-us/what-we-do',
    },
    digitasQA: {
      apa: 'Digitas. (2026). Written responses to BUS 365 student questions [Unpublished Q&A]. Emory University.',
      url: '',
    },
  };

  // Digitas's five practices and their capabilities, as listed on digitas.com (digitasPractices).
  // Each practice counts as one specialist agency. Tenure: client-reported AOR tenure by agency
  // type (ANA survey, 2024 fieldwork, in tenure2025); the mapping to ANA's types is ours where marked.
  const disciplines = [
    { id: 'creative', label: 'Creative Experiences', tenure: 6.75, kind: 'sourced', note: 'ANA "creative only" agencies.',
      capabilities: ['Campaigns', 'Content', 'Experiential', 'XD', 'Brand Design & Identity', 'Performance Assets'] },
    { id: 'media', label: 'Networked Media', tenure: 5.94, kind: 'sourced', note: 'ANA "media only" agencies (n = 36 relationships).',
      capabilities: ['Media Strategy', 'Planning and Buying', 'Brand and Performance Expertise', 'Cross-Channel Investments', 'Media Tech & Ops', 'Data & Analytics'] },
    { id: 'crm', label: 'CRM & Loyalty', tenure: 6.29, kind: 'assumed', note: 'ANA "other" (below the line, analytical, direct marketing). Mapping CRM to it is our assumption.',
      capabilities: ['End-to-end CRM', 'Loyalty Strategy & Management', 'Lifecycle Strategy', 'B2B Expertise', 'Personalized Messaging', 'Data & Technology Operations'] },
    { id: 'social', label: 'Social Transformation', tenure: 2.47, kind: 'assumed', note: 'ANA "digital" agencies (n not given). Global paid social: 4.3 years (WFA 2026, secondary). Mapping is our assumption.',
      capabilities: ['Social Strategy', 'Paid Social Activation', 'Influencer & Creator Marketing', 'Community Strategy & Management', 'Social Commerce & Intelligence', 'SWAT (Share Worthy & Trending)'] },
    { id: 'commerce', label: 'Total Commerce', tenure: 2.47, kind: 'assumed', note: 'ANA "digital" agencies (n not given). Mapping commerce to digital is our assumption.',
      capabilities: ['D2C Strategy', 'Shoppable Media Experiences', 'Full Funnel Retail Media Strategy & Activation', 'Digital Shelf Insights', 'Digital Shelf Content Strategy & Creation'] },
  ];
  const defaultDisciplines = ['creative', 'media', 'crm'];

  // Model parameters (editable in the "Research defaults" panel).
  const params = [
    { key: 'tenureIntegrated', label: 'Integrated partner tenure', unit: 'years', value: 7.96, low: 5.8, high: 7.96, kind: 'sourced', source: 'tenure2025',
      note: 'Client-reported tenure for integrated full-service agencies (ANA, n = 35 relationships). Low end: 5.8 years, the agency-reported figure for holding-company agencies such as Digitas (small sample).' },
    { key: 'reviewCost', label: 'Client cost of one agency review', unit: '$', value: 373470, low: 373470, high: 408500, kind: 'sourced', source: 'cop2023',
      note: 'Average client cost of one pitch when the incumbent takes part ($373,470) or not ($408,500). Includes internal staff time, staffing changes and disruption; excludes onboarding the new agency.' },
    { key: 'overlapCost', label: 'Handover overlap when switching', unit: '$', value: 72718, low: 0, high: 72718, kind: 'sourced', source: 'cop2023',
      note: 'Client pays both the outgoing and incoming agency during the transition: $72,718 per pitch when it happens.' },
    { key: 'overlapShare', label: 'Share of switches with overlap', unit: 'share', value: 0.6, low: 0, high: 1, kind: 'sourced', source: 'cop2023',
      note: '60% of clients say they incur overlap costs when changing agencies.' },
    { key: 'reviewsPerSwitch', label: 'Reviews per agency switch', unit: '×', value: 1, low: 1, high: 2.9, kind: 'assumed', source: 'cop2023',
      note: 'Counts only the review that ends a relationship. Incumbents keep the business in 66% of reviews, so if every switch followed reviews, there would be about 2.9 reviews per switch (1 ÷ 0.34, our arithmetic). 1 is the conservative choice.' },
    { key: 'handoffHours', label: 'Handoff time per pair of agencies', unit: 'h/month', value: 2, low: 0, high: 4, kind: 'assumed', source: null,
      note: 'No measured source. Extra client time to connect each pair of agencies (briefs, handoffs, conflicts). Pairs = N × (N − 1) ÷ 2, so it grows faster than the roster.' },
    { key: 'integratedCoordFactor', label: 'Coordination for one integrated partner', unit: '× one agency', value: 1.5, low: 1, high: 2, kind: 'assumed', source: 'digitasQA',
      note: 'No measured source. One relationship with wider scope takes more managing than one specialist, but there are no handoffs between agencies to manage: Digitas says the client "should experience one connected team" (Q55).' },
    { key: 'integratedFeeDiff', label: "Integrated partner's fee premium", unit: 'share', value: 0, low: -0.15, high: 0.15, kind: 'sourced', source: 'digitasQA',
      note: 'Digitas (Q44): "our pricing is competitive with other large global agencies, while smaller or more specialized firms may operate with different cost structures." So 0% against network specialists. Against smaller independents, TrinityP3 puts network rates about 10% to 15% higher per hour; enter that here to test it. The break-even premium shows how much higher one partner could charge and stay cheaper.' },
    { key: 'dupWork', label: "Duplicated work in specialists' fees", unit: 'share', value: 0, low: 0, high: 0.2, kind: 'assumed', source: null,
      note: 'Share of the specialists\' combined fees spent on overlapping work (repeated briefs, strategy, account teams, production) that one partner would not bill. No published benchmark, so 0% by default. Observatory International puts agency overhead at 40–50% of fee invoices, paid again for each agency, but gives no savings figure.' },
  ];

  // Agency fees as a share of company revenue: marketing budget 7.7% of revenue x agencies 20.7% of budget.
  const feeShareOfBudget = 0.207;
  const feeShareOfRevenue = 0.077 * feeShareOfBudget;

  // Ways a client can give their fees: each converts to annual agency fees (Gartner 2025 shares).
  const feeModes = {
    budget: { label: "What's your annual marketing budget?", factor: feeShareOfBudget, link: 'Use your marketing budget',
      derived: 'agencies get 20.7% of marketing budgets (Gartner 2025)' },
    actual: { label: 'What do you pay all your agencies in a year?', factor: 1, link: 'Know your agency spend? Enter it instead', derived: '' },
  };

  // How hands-on the client team is with each agency: hours per agency per month (assumed; see coordHours).
  const involvement = [
    { id: 'light', label: 'Light', hours: 8, text: 'A monthly check-in' },
    { id: 'typical', label: 'Typical', hours: 20, text: 'Weekly status call, briefs and approvals' },
    { id: 'heavy', label: 'Heavy', hours: 40, text: 'In touch most days' },
  ];

  // User inputs and their starting values.
  const inputs = {
    agencies: { value: 3, kind: 'sourced', source: 'ana2022', note: 'US marketers average 3.33 agency relationships (ANA 2022, n = 101). Set to the number of disciplines ticked.' },
    marketingBudget: { value: 14500000, kind: 'assumed', source: null, note: 'Illustrative starting value: a $14.5M marketing budget, which gives about $3M a year in agency fees (the deck example). The client replaces it.' },
    annualFees: { value: 3000000, kind: 'derived', source: 'gartner2025', note: 'Derived from the marketing budget (x 20.7%) or revenue (x 1.59%), or entered directly. Or estimate it from revenue: agency fees average about 1.59% of company revenue (marketing budgets 7.7% of revenue x agencies 20.7% of budget; Gartner 2025 CMO Spend Survey, n = 402).' },
    coordHours: { value: 20, kind: 'assumed', source: null, note: 'Chosen as Light (8 h), Typical (20 h) or Heavy (40 h) per agency per month. No measured source. Typical is built up from a weekly status call with two client staff (about 9 hours) plus briefs, approvals, invoicing and quarterly reviews (about 11 hours). Range 8 to 40.' },
    hourlyCost: { value: 127, kind: 'derived', source: 'blsOews', note: 'Marketing managers\' mean wage $85.47 (BLS, May 2025) × 1.48 for benefits (wages are 67.5% of compensation for management occupations, BLS ECEC June 2026). Range $95 to $127.' },
    years: { value: 10, kind: 'assumed', source: null, note: 'Storyboard horizon.' },
  };

  // Public Digitas cases the summary may cite (never others). Results quoted as published.
  // tags = disciplines (ids above) the case connects; practice = the tag on the Digitas case page;
  // image = the case page's og:image (hotlinked).
  const cases = [
    { id: 'crocs', client: 'Crocs', title: 'Global Agency Partner Transition', practice: 'Integrated Media', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_GIF_Crocs.gif', year: '2022', tags: ['media', 'creative', 'social'],
      what: 'Crocs moved global digital media, creative, analytics and organic social to Digitas as one partner.',
      result: '120+ transition tasks executed; 57% exceeded forecasted traffic goal; 20% more cost efficient CPLPV (cost per landing page view).',
      url: 'https://www.digitas.com/en-us/work/crocs-global-agency-partner-transition' },
    { id: 'haleon', client: 'Haleon', title: 'Target Audiences Not Created, Built', practice: 'Creative Experiences', image: 'https://www.digitas.com/sites/default/files/2026-08/HaleonAgent_v1_cut_03-ezgif.com-video-to-gif-converter_0.gif', year: 'n.d.', tags: ['media', 'creative', 'social', 'commerce'],
      what: 'Health data and AI personas shaped creative, programmatic and social media, and the Amazon storefront for TUMS, Benefiber and Gas-X.',
      result: '47% higher conversion rate among GLP-1 users versus standard audiences; 2X greater ROAS compared to previous digestive health multibrand efforts.',
      url: 'https://www.digitas.com/en-us/work/target-audiences-not-created-built' },
    { id: 'nerds', client: 'NERDS', title: 'A Candy Star Is Born', practice: 'Total Commerce', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_Still_Nerds.png', year: '2024', tags: ['creative', 'media', 'social', 'commerce'],
      what: 'A Super Bowl ad connected to Snap and TikTok media, influencers, retail media, in-store displays and delivery commerce.',
      result: '400% increase in Nerds eComm sales; 200% increase in Nerds store displays.',
      url: 'https://www.digitas.com/en-us/work/candy-star-born' },
    { id: 'walmart-carts', client: 'Walmart', title: 'Welcome to Your Walmart', practice: 'Integrated Media', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_GIF_Carts.gif', year: '2024', tags: ['creative', 'media', 'social', 'commerce'],
      what: 'Celebrity talent, integrated media and social linked to shoppable carts on Walmart.com, by a Walmart and Digitas Power of One team.',
      result: '+7.9B media impressions.',
      url: 'https://www.digitas.com/en-us/work/walmart-carts' },
    { id: 'aaa', client: 'AAA, The Auto Club Group', title: 'Expect Something More', practice: 'Integrated Media', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_GIF_AAA.gif', year: 'n.d.', tags: ['creative', 'media'],
      what: 'TV creative and a media plan across display, social and streaming audio, built to drive insurance quotes.',
      result: '+24% more quotes; +17 point lift in purchase intent.',
      url: 'https://www.digitas.com/en-us/work/more-just-roadside' },
    { id: 'delta-medallion', client: 'Delta Air Lines', title: 'Personalized Videos for SkyMiles Medallion Members', practice: '', image: '', year: '2018', tags: ['crm', 'creative'],
      what: 'SkyMiles loyalty data drove personalized video sent by email to Medallion members.',
      result: 'Click-through rate from the email was 500% over its benchmark (reported by AdExchanger).',
      url: 'https://www.adexchanger.com/advertiser/delta-takes-off-social-personalized-videos-skymiles-medallion-members/' },
    { id: 'delta-ces', client: 'Delta Air Lines', title: 'CES Wonder Window', practice: 'Creative Experiences', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_Still_Delta.png', year: '2023', tags: ['crm', 'creative'],
      what: 'A CES experience that linked SkyMiles and Starbucks Rewards accounts on the spot.',
      result: '1K accounts linked; 85M earned media reach.',
      url: 'https://www.digitas.com/en-us/work/delta-ces' },
    { id: 'hm', client: 'H&M (Digitas UK)', title: 'Search-Led Commerce Transformation', practice: '', image: '', year: 'n.d.', tags: ['media', 'commerce'],
      what: 'Search data reshaped the online shopfront, merchandising, product buying and 35 business processes.',
      result: '£622M incremental revenue over 5 years, almost twice the target.',
      url: 'https://www.digitas.co.uk/hm' },
    { id: 'sephora', client: 'Sephora', title: 'Get Beauty From People Who Get Beauty', practice: 'Creative Experiences', image: 'https://www.digitas.com/sites/default/files/2026-08/ScreenRecording2026-08-27at2.16.23PM-ezgif.com-video-to-gif-converter%20%282%29.gif', year: 'n.d.', tags: ['media', 'social', 'creative', 'commerce'],
      what: 'A Lyft partnership joined in-app media, car wraps, social, influencers, events and in-store promotions.',
      result: '2X increase in rides to Sephora; +13pts in brand love.',
      url: 'https://www.digitas.com/en-us/work/get-beauty-people-who-get-beauty' },
    { id: 'ncl', client: 'Norwegian Cruise Line', title: 'RBC at Sea', practice: 'Social Transformation', image: 'https://www.digitas.com/sites/default/files/2024-09/16x9_GIF_RBC%20at%20Sea.gif', year: 'n.d.', tags: ['media', 'social', 'creative'],
      what: 'A content partnership carried through influencers, long-form video, paid social and owned channels.',
      result: '+10pt lift in net likelihood to consider booking.',
      url: 'https://www.digitas.com/en-us/work/rbc-sea' },
  ];

  function values() {
    const o = { tenure: {}, tenureFallback: 6.78 };
    for (const p of params) o[p.key] = p.value;
    for (const d of disciplines) o.tenure[d.id] = d.tenure;
    return o;
  }

  const D = { sources, params, inputs, disciplines, defaultDisciplines, cases, values, feeShareOfRevenue, feeShareOfBudget, feeModes, involvement };
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  else root.Defaults = D;
})(typeof window !== 'undefined' ? window : globalThis);
