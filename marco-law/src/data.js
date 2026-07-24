// Marco Law — site content. All copy from the design handoff.
// Items marked [Placeholder] are to be replaced by the client before launch.

const site = {
  name: "Marco Law",
  domain: "https://marco.law",
  tagline: "Criminal Litigation",
  phone: "(416) 555-0198", // [Placeholder]
  phoneHref: "tel:4165550198",
  email: "defence@marcolaw.ca", // [Placeholder]
  address: ["145 Langstaff Rd E", "Markham, Ontario L3T 3M6"],
  serving: "Markham, the GTA, and all of Ontario",
  copyright: "© 2026 Marco Law Professional Corporation. All rights reserved.",
  disclaimer:
    "This website is for general information only and does not constitute legal advice. Contacting the firm does not create a solicitor-client relationship.",
};

const stats = [
  { value: "6+", label: "Years at the bar" },
  { value: "500+", label: "Trials &amp; hearings conducted" }, // [Placeholder]
  { value: "40+", label: "Appeals argued" }, // [Placeholder]
  { value: "24/7", label: "Available to the accused" },
];

const workPillars = [
  {
    num: "01",
    title: "Preparation",
    body: "Every file is prepared as though it will be tried. Disclosure is mastered, witnesses are examined, and every Charter issue is identified before the Crown expects it.",
  },
  {
    num: "02",
    title: "Advocacy",
    body: "Courtroom advocacy is a craft. We cross-examine with precision, argue with authority, and take positions the evidence can sustain — nothing less, nothing more.",
  },
  {
    num: "03",
    title: "Discretion",
    body: "An allegation can do damage long before a verdict. We protect reputations, move quickly, and keep every conversation strictly confidential.",
  },
];

const testimonial = {
  quote:
    "“From the first meeting it was clear that every detail of the case had been mastered. We were never once left in the dark.”",
  attribution: "— Client, jury trial (placeholder)",
};

const beliefs = [
  {
    numeral: "I.",
    lead: "Every accused deserves a full defence.",
    body: "The presumption of innocence is not a slogan — it is the discipline that governs how we work every file.",
  },
  {
    numeral: "II.",
    lead: "Preparation wins cases.",
    body: "Favourable results come from mastering disclosure, pressing every Charter issue, and being readier than the Crown.",
  },
  {
    numeral: "III.",
    lead: "Clients are never left in the dark.",
    body: "You will understand the case against you, the options open to you, and the strategy we recommend — at every stage.",
  },
];

const credentials = [
  { key: "Called to the Bar", value: "Ontario, 2020" },
  { key: "Education", value: "J.D." },
  { key: "Law Society", value: "Law Society of Ontario" },
  { key: "Courts", value: "OCJ · SCJ · Court of Appeal for Ontario" },
];

const results = [
  // [Placeholder] — all six entries to be replaced with actual results.
  {
    charge: "Drug Trafficking",
    cite: "R. v. A.B.",
    summary:
      "[Placeholder] Multi-kilogram trafficking prosecution. Search of the vehicle excluded under s. 8 of the Charter following a contested voir dire; all counts dismissed.",
    outcome: "Acquittal",
    court: "Superior Court of Justice",
  },
  {
    charge: "Sexual Assault",
    cite: "R. v. C.D.",
    summary:
      "[Placeholder] Historical allegation defended at a two-week jury trial. Complainant's account undermined on cross-examination; jury returned a verdict of not guilty.",
    outcome: "Not Guilty",
    court: "Superior Court of Justice",
  },
  {
    charge: "Fraud Over $5,000",
    cite: "R. v. E.F.",
    summary:
      "[Placeholder] Alleged breach-of-trust fraud. Forensic accounting analysis challenged; Crown withdrew all charges before the preliminary inquiry.",
    outcome: "Withdrawn",
    court: "Ontario Court of Justice",
  },
  {
    charge: "Impaired Driving",
    cite: "R. v. G.H.",
    summary:
      "[Placeholder] Over 80 prosecution. Breath demand held unlawful and readings excluded; charge dismissed at trial.",
    outcome: "Dismissed",
    court: "Ontario Court of Justice",
  },
  {
    charge: "Careless Driving Causing Death",
    cite: "R. v. J.K.",
    summary:
      "[Placeholder] Provincial Offence Act prosecution following a fatal collision. Reconstruction evidence contested; charge reduced and licence preserved.",
    outcome: "Reduced",
    court: "Provincial Offences Court",
  },
  {
    charge: "Conviction Appeal",
    cite: "R. v. L.M.",
    summary:
      "[Placeholder] Appeal from conviction on the basis of ineffective trial rulings. Conviction quashed and a new trial ordered.",
    outcome: "New Trial",
    court: "Court of Appeal for Ontario",
  },
];

const areas = [
  {
    slug: "appeals",
    num: "01",
    title: "Criminal Appeals",
    homeBlurb:
      "Conviction and sentence appeals before the Court of Appeal for Ontario and the Superior Court.",
    blurb:
      "Conviction and sentence appeals before the Court of Appeal for Ontario and the Superior Court of Justice.",
    intros: [
      "A trial verdict is not always the end of the case. Appellate advocacy is a distinct discipline — it turns on the record, the law, and written argument of the highest order. Marco Law reviews trial records with a critical eye and pursues every meritorious ground of appeal, from misapprehensions of evidence to errors of law and unreasonable verdicts.",
      "We act on appeals from conviction and sentence, applications for bail pending appeal, and summary conviction appeals — for clients we represented at trial and for those seeking fresh counsel on appeal.",
    ],
    handle: [
      "Appeals from conviction and sentence to the Court of Appeal for Ontario",
      "Summary conviction appeals to the Superior Court of Justice",
      "Bail pending appeal and extensions of time to appeal",
      "Fresh evidence applications and ineffective assistance claims",
      "Appellate opinions on the merits of a potential appeal",
    ],
    steps: [
      { label: "Assess", body: "A candid review of the record and a written opinion on the strongest available grounds." },
      { label: "Build", body: "A factum that frames the case on our terms — precise, disciplined, and grounded in authority." },
      { label: "Argue", body: "Oral advocacy that answers the panel's concerns and presses the grounds that win." },
    ],
  },
  {
    slug: "sexual-offences",
    num: "02",
    title: "Sexual Offences",
    homeBlurb: "Sexual assault and related allegations, defended with rigour and discretion.",
    blurb: "Sexual assault and related allegations, defended with rigour and discretion.",
    intros: [
      "No allegation carries greater stigma, or higher stakes, than a sexual offence. These prosecutions frequently turn on credibility alone — one account against another, often years after the fact. They demand counsel with the skill to cross-examine effectively within the strict statutory limits that govern these trials, and the judgment to know which battles win the case.",
      "Marco Law defends sexual assault, sexual interference, invitation to sexual touching, child pornography allegations, and historical complaints — at trial and on appeal. Every file is handled with complete discretion.",
    ],
    handle: [
      "Sexual assault, including spousal and acquaintance allegations",
      "Historical complaints and multi-complainant prosecutions",
      "Sexual interference and invitation to sexual touching",
      "Child pornography offences",
      "Applications under ss. 276 and 278 (prior conduct and records)",
    ],
    steps: [
      { label: "Contain", body: "Immediate advice on bail, publication bans, and protecting your employment and reputation." },
      { label: "Test", body: "The complainant’s account is examined against every record, message, and inconsistency." },
      { label: "Try", body: "A trial strategy built on credibility, reasonable doubt, and disciplined cross-examination." },
    ],
  },
  {
    slug: "drug-offences",
    num: "03",
    title: "Drug Offences",
    homeBlurb:
      "Trafficking, possession, and production prosecutions, including Charter challenges to searches.",
    blurb:
      "Trafficking, possession, and production prosecutions, including Charter challenges to searches.",
    intros: [
      "Drug prosecutions are won and lost on the investigation. Wiretaps, surveillance, confidential informants, search warrants, vehicle stops — each step the police take is an opportunity for constitutional error, and each error is a path to exclusion of the evidence. That is where the defence of a drug case begins.",
      "Marco Law defends trafficking, possession for the purpose, importing, and production charges under the CDSA — from street-level allegations to multi-kilogram project prosecutions.",
    ],
    handle: [
      "Trafficking and possession for the purpose of trafficking",
      "Importing and exporting controlled substances",
      "Production and cultivation offences",
      "Simple possession",
      "Charter challenges to searches, warrants, and detentions",
    ],
    steps: [
      { label: "Dissect", body: "Every warrant, stop, and search is scrutinized for Charter violations from day one." },
      { label: "Exclude", body: "Sections 8, 9, and 24(2) are pressed to keep unconstitutionally obtained evidence out." },
      { label: "Defend", body: "Where the case proceeds, possession, knowledge, and control are put fully in issue." },
    ],
  },
  {
    slug: "impaired-driving",
    num: "04",
    title: "Impaired Driving",
    homeBlurb: "Impaired operation, over 80, and refusal charges — technical defences, properly run.",
    blurb: "Impaired operation, over 80, and refusal charges — technical defences, properly run.",
    intros: [
      "Impaired driving is among the most technical areas of criminal law. Convictions rest on breath instruments, statutory presumptions, and strict police procedure — and each of those elements can fail. A lawful demand, a properly administered test, an unbroken chain of procedure: the Crown must prove all of it.",
      "Marco Law defends impaired operation, over 80, refusal, and dangerous driving charges, along with the licence consequences that follow them. A first offence is not a formality — it is a criminal record, and it is worth fighting.",
    ],
    handle: [
      "Impaired operation and operation over the legal limit (&quot;over 80&quot;)",
      "Refusal or failure to comply with a breath demand",
      "Dangerous operation, including causing bodily harm or death",
      "Care or control allegations",
      "Licence suspensions and ignition interlock consequences",
    ],
    steps: [
      { label: "Reconstruct", body: "The stop, the demand, and the testing timeline are rebuilt minute by minute." },
      { label: "Challenge", body: "Grounds for the stop, the lawfulness of the demand, and instrument operation are contested." },
      { label: "Resolve", body: "Where the evidence holds, we pursue outcomes that protect your record and your licence." },
    ],
  },
  {
    slug: "fraud",
    num: "05",
    title: "Fraud & Financial Crime",
    homeBlurb: "Fraud, theft, and breach of trust allegations of every scale and complexity.",
    blurb: "Fraud, theft, and breach of trust allegations of every scale and complexity.",
    intros: [
      "Financial prosecutions are document cases. They are built over months by investigators and forensic accountants — and they are dismantled the same way: by mastering the paper, tracing every transaction, and separating bad business judgment from criminal intent. Intent is the battleground, and it is where these cases are won.",
      "Marco Law defends fraud over and under $5,000, breach of trust, forgery, money laundering, and related regulatory prosecutions — for individuals, professionals, and business owners.",
    ],
    handle: [
      "Fraud over and under $5,000",
      "Breach of trust and employee theft allegations",
      "Forgery, false documents, and identity offences",
      "Possession of proceeds and money laundering",
      "Parallel regulatory and professional discipline proceedings",
    ],
    steps: [
      { label: "Master", body: "We absorb the documentary record until we know it better than the investigators do." },
      { label: "Reframe", body: "Transactions are placed in their true commercial context — where intent to defraud dissolves." },
      { label: "Resolve", body: "Restitution, withdrawal, and trial are weighed candidly; we recommend what wins." },
    ],
  },
  {
    slug: "assault",
    num: "06",
    title: "Offences Against the Person",
    homeBlurb: "Assault, domestic allegations, threats, and criminal harassment.",
    blurb: "Assault, domestic allegations, threats, and criminal harassment.",
    intros: [
      "Allegations of violence move fast: an arrest, restrictive bail conditions, and — in domestic matters — exclusion from your own home, often within hours. The early days shape everything that follows. Getting conditions varied, preserving evidence, and setting the defence early are as important as the trial itself.",
      "Marco Law defends assault, assault causing bodily harm, aggravated assault, uttering threats, criminal harassment, and domestic allegations of every kind — including self-defence cases and matters suitable for early resolution or withdrawal.",
    ],
    handle: [
      "Assault, assault with a weapon, and assault causing bodily harm",
      "Aggravated assault",
      "Domestic assault and related breach allegations",
      "Uttering threats and criminal harassment",
      "Self-defence and defence of another",
    ],
    steps: [
      { label: "Stabilize", body: "Bail conditions are varied so you can live and work while the case proceeds." },
      { label: "Investigate", body: "Witnesses, messages, and video are secured before they disappear." },
      { label: "Advance", body: "Self-defence, credibility, and resolution options are pursued from a position of strength." },
    ],
  },
  {
    slug: "weapons-offences",
    num: "07",
    title: "Weapons Offences",
    homeBlurb: "Firearms and weapons prosecutions, including possession and storage offences.",
    blurb: "Firearms and weapons prosecutions, including possession and storage offences.",
    intros: [
      "Parliament has attached some of the criminal law’s harshest consequences to firearms offences, including mandatory minimums and reverse-onus bail. Yet these prosecutions rest heavily on search and seizure — and on proof of knowledge and control. Both are vulnerable when the defence is prepared to fight.",
      "Marco Law defends possession of a firearm, possession for a dangerous purpose, unauthorized possession, careless storage, and trafficking allegations — with particular attention to the Charter issues that decide these cases.",
    ],
    handle: [
      "Possession of a restricted or prohibited firearm",
      "Possession of a weapon for a dangerous purpose",
      "Unauthorized possession and possession contrary to an order",
      "Careless storage and transport offences",
      "Weapons trafficking",
    ],
    steps: [
      { label: "Attack", body: "The search — of the home, the vehicle, the person — is challenged at its foundation." },
      { label: "Isolate", body: "Knowledge and control are contested; proximity is not possession." },
      { label: "Mitigate", body: "Where conviction risk remains, mandatory minimums and Charter relief are litigated." },
    ],
  },
  {
    slug: "property-offences",
    num: "08",
    title: "Property Offences",
    homeBlurb: "Theft, break and enter, mischief, and possession of stolen property.",
    blurb: "Theft, break and enter, mischief, and possession of stolen property.",
    intros: [
      "Property charges range from a shoplifting allegation to a break and enter carrying a maximum of life imprisonment. What they share is this: outcomes vary enormously with the quality of the defence. Identity, intent, and colour of right are live issues far more often than the Crown assumes.",
      "Marco Law defends theft, break and enter, robbery, mischief, arson, and possession of property obtained by crime — and pursues diversion, withdrawal, and record-protecting resolutions wherever the evidence allows.",
    ],
    handle: [
      "Theft over and under $5,000",
      "Break and enter, and being unlawfully in a dwelling",
      "Robbery",
      "Mischief and arson",
      "Possession of property obtained by crime",
    ],
    steps: [
      { label: "Question", body: "Identification evidence — video, eyewitness, circumstantial — is tested rigorously." },
      { label: "Divert", body: "First allegations are steered toward diversion and outcomes that leave no record." },
      { label: "Try", body: "Where the Crown won’t move, the case is put to proof at trial." },
    ],
  },
  {
    slug: "bail-hearings",
    num: "09",
    title: "Bail Hearings & Reviews",
    homeBlurb: "Release plans built and argued at first instance and on review.",
    blurb: "Release plans built and argued at first instance and on review.",
    intros: [
      "Nothing shapes a criminal case like bail. An accused person who is released prepares a defence; one who is detained is pressured to plead. The bail hearing is often argued within hours of arrest — which is precisely why it demands prepared, forceful counsel, not a hurried appearance.",
      "Marco Law conducts bail hearings, bail reviews in the Superior Court, and variations of conditions — building concrete release plans with sureties, residence, and supervision that answer the court’s concerns.",
    ],
    handle: [
      "Contested bail hearings, including reverse-onus cases",
      "Bail reviews before the Superior Court of Justice",
      "Variations of release conditions",
      "Surety preparation and release planning",
      "Detention reviews for delayed matters",
    ],
    steps: [
      { label: "Plan", body: "Sureties, residence, and supervision are assembled into a plan the court can accept." },
      { label: "Argue", body: "The grounds for detention are met head-on with evidence, not assurances." },
      { label: "Review", body: "A detention order is not final — reviews are pursued when the record supports release." },
    ],
  },
  {
    slug: "provincial-offences",
    num: "10",
    title: "Provincial Offences",
    homeBlurb: "Serious POA prosecutions, including careless driving causing death.",
    blurb: "Serious POA prosecutions, including careless driving causing death.",
    intros: [
      "Serious Provincial Offences Act prosecutions are tried like criminal cases — with expert evidence, collision reconstruction, and consequences that include jail, licence loss, and career-ending records. Careless driving causing death or bodily harm, in particular, demands the same rigour as any criminal trial.",
      "Marco Law defends careless driving causing death or bodily harm, stunt driving, occupational health and safety prosecutions, and other serious regulatory charges throughout Ontario.",
    ],
    handle: [
      "Careless driving causing death or bodily harm",
      "Stunt driving and racing",
      "Driving while suspended and serious Highway Traffic Act charges",
      "Occupational health and safety prosecutions",
      "Other serious regulatory and quasi-criminal matters",
    ],
    steps: [
      { label: "Reconstruct", body: "Collision evidence and expert reports are independently reviewed and contested." },
      { label: "Contest", body: "Due diligence and reasonable care are advanced as full defences." },
      { label: "Protect", body: "Licence, livelihood, and record are defended at every stage — including on appeal." },
    ],
  },
];

module.exports = { site, stats, workPillars, testimonial, beliefs, credentials, results, areas };
