import glossary from "./glossary-en";
import sections from "./sections-en";
import violations from "./violations-en";

// The same three rules the Russian original is written to:
//   1. One action, one word. We say “report”, and the button says it too.
//   2. No trade jargon. No “moderator”, “aggregator”, “fact-checking
//      pipeline” — a person off the street does not use those words.
//   3. A heading names the place and the work, not an image.
//
// English is the third locale and the one most likely to be read by people
// outside the country — donors, partners, researchers. It is a translation of
// the Russian, not a separate text: where the Russian says something careful
// about what we do and do not know, the English says the same thing.

const en = {
  brand: "MediaMap",
  brandTagline: "Monitoring media violations in Kyrgyzstan",

  nav: {
    home: "Home",
    /* “Verified” rather than “Cases”: the menu item names what the reader
       will find there. The page heading is still “Verified cases”. */
    cases: "Verified",
    types: "Types of violations",
    news: "Media digest",
    analytics: "Analytics",
    resources: "Resources",
    glossary: "Glossary",
    quiz: "Test yourself",
    check: "Image check",
    about: "About",
    contacts: "Contacts",
    more: "More",
    search: "Search",
    report: "Report a violation",
    language: "Site language",
    signIn: "Sign in",
    account: "Account",
    panel: "Panel",
    languageSoon: "soon",
    menu: "Menu",
    close: "Close",
  },

  home: {
    title: "Monitoring media violations in Kyrgyzstan",
    lead:
      "We collect cases where the media and social networks demean people, " +
      "spread lies, or deceive people for money. Every case is checked and " +
      "published.",
    actionPrimary: "Report a violation",
    actionSecondary: "Browse cases",
    anonymous: "No name or phone number required",
    slogan: "We recognise, verify and protect",

    /* Строка складывается как «<число> <слово> <хвост>»: «3 types of
       violation». Поэтому хвост здесь — не название само по себе, а его
       продолжение; иначе выходило «3 types violation types». */
    statCases: "verified",
    statTypes: "of violation",
    statNews: "collected",
    statSources: "monitored",

    casesTitle: "Verified cases",
    casesLead: "What we confirmed after review.",
    casesAll: "All cases",
    casesEmpty: "No case has been confirmed yet.",
    casesShare: "share of all cases",
    caseSourceUnknown: "platform not given",

    typesTitle: "Types of violations",
    typesLead: "Every case is assigned to one of three types.",
    typesAll: "More about the types",
    typesEmpty: "No cases yet",

    newsTitle: "Media digest",
    newsLead: "We follow what the specialist outlets publish.",
    newsAll: "The whole digest",

    howTitle: "What happens after you write to us",
    steps: [
      {
        title: "You tell us",
        body:
          "Describe what you saw and where, and attach a screenshot. No name " +
          "required.",
      },
      {
        title: "We check it",
        body:
          "Every report is read by a person on our team. It usually takes a " +
          "few days.",
      },
      {
        title: "The case enters the database",
        body:
          "If the violation is confirmed, it appears in the list of cases — " +
          "without any of your personal details.",
      },
    ],
    limitsTitle: "What we do not do",
    limitsBody:
      "We do not punish anyone and we do not take other people’s posts " +
      "down — we have no such powers. If you are being threatened, go to the " +
      "police: this site is not a substitute for them.",

    ctaTitle: "Seen a violation?",
    ctaBody: "Tell us about it — it takes a couple of minutes.",
    ctaAction: "Fill in the form",
  },

  cases: {
    title: "Verified cases",
    lead:
      "Reports we have checked and confirmed. Each one was read by a person " +
      "on our team.",

    filterAll: "All types",
    filterLabel: "Show one type only",

    found: "found",
    empty: "No case has been confirmed yet.",
    emptyFiltered: "No confirmed cases of this type yet.",
    showAll: "Show all cases",

    pageOf: "of",
    prev: "Back",
    next: "Next",

    backToList: "All cases",
    detailLead: "A case from the MediaMap database",
    where: "Where it was published",
    openSource: "Open the publication",
    linkGone:
      "The post may have been deleted after our review — the link points to " +
      "where we found it.",
    happenedAt: "When it happened",
    checkedAt: "Verified",
    number: "Case number",
    fromAuthor: "What the reporter told us",
    fromTeam: "What the review established",
    noComment: "No explanation was left.",
    notFound: "No such case",
    notFoundLead:
      "The number may be mistyped, or the case has not passed review yet.",
  },

  account: {
    history: "History",
    notifyLabel: "Email me about the decision",
    notifyHint:
      "One email, when a decision is made on your report or a reviewer " +
      "replies. No newsletters.",
    notifySave: "Save",
    notifySaved: "Saved",
    loginTitle: "Sign in",
    registerTitle: "Create an account",
    registerLead:
      "You will need an email address and a password. A name is optional, " +
      "and we never publish it.",

    emailLabel: "Email",
    passwordLabel: "Password",
    nameLabel: "What to call you",
    nameHint: "Optional. Never appears in published cases.",

    signIn: "Sign in",
    signUp: "Create account",
    working: "One moment…",

    orDivider: "or",
    withProvider: "Sign in with",

    forgot: "Forgotten your password? Write to us and we will restore it by hand",
    noAccount: "No account?",
    haveAccount: "Already have an account?",
    anonymous: "Report anonymously, without an account",

    title: "My account",
    signOut: "Sign out",
    adopted: "Reports from this device are now linked to your account",

    errors: {
      emailInvalid: "Check the email address",
      passwordShort: "The password is shorter than eight characters",
      nameLong: "Too long",
      taken: "That email is already taken. Try signing in",
      wrong: "That did not match. Check the email and password",
      state: "Sign-in did not complete. Try again",
      provider: "The service did not respond. Try later, or sign in by email",
    },
  },

  myReports: {
    title: "My reports",
    lead: "Reports submitted from this device.",
    leadAccount: "All your reports — visible on any device where you sign in.",
    warning:
      "This list lives in this browser; in another one it will be empty. " +
      "Save the link after you submit.",

    empty: "No reports have been submitted from this device yet.",
    emptyAccount: "You have not submitted any reports yet.",
    emptyAction: "Report a violation",

    open: "Open",
    submitted: "Submitted",
    reviewed: "Reviewed",
    note: "The reply",

    forget: "Clear the list",
    forgetHint: "Removes the list from this browser. The reports themselves stay with us.",

    link: "My reports",
  },

  assessment: {
    /*
      Two keys survive from the old “Conclusion” block: the attribution line
      and the heading above the reviewer’s answer.

      The flat verdict itself — “No, this is not hate speech” — was removed
      by a project decision. It read as a ruling on the report, delivered by
      a machine that often had not seen the material. The analysis stayed.
    */
    conclusion: {
      reviewedBy: "decided by a person",
      reviewedNote: "What the reviewer said",
    },
    title: "Preliminary assessment",
    titleReviewed: "Decision on your report",
    confidenceLabelReviewed: "Confidence",
    confidenceUnknown: "not measured",
    checkedImage: "The attached screenshot was analysed.",
    checkedStory:
      "The assessment is based on your description — the model did not see " +
      "the material itself.",
    checkedLink: "The publication at your link was analysed.",
    checkedLinkFailed: "The link could not be opened.",
    /*
      The same lines for an outside reader. On their own page the reporter
      reads “your link” and “matches your choice”, which is true there. On a
      published case those words become untrue: the case is not theirs.
    */
    checkedLinkPublic: "The publication linked in the report was analysed.",
    checkedStoryPublic:
      "The assessment is based on the reporter’s description — the model did " +
      "not see the material itself.",
    verdictMatchesPublic: "matches the type the reporter chose",
    verdictDiffersPublic: "the reporter chose a different type",
    sourceRules: "keyword analysis",
    sourceModel: "language model",

    titlePublic: "How the AI analysed this",
    publicNote:
      "The decision on this case was made by a person, who may well have " +
      "disagreed with the model.",
    verdictLabel: "Verdict",
    verdictUnclear: "Type not determined",
    verdictMatches: "matches your choice",
    verdictDiffers: "you chose a different type — we will clarify during review",

    confidenceLabel: "Confidence",
    confidenceLow: "low",
    confidenceMedium: "medium",
    confidenceHigh: "high",

    adminLabel: "Reviewed by a moderator",
    adminPending: "Pending",
    adminApproved: "Confirmed",
    adminRejected: "Not confirmed",

    reasonsLabel: "What the conclusion rests on",

    disclaimerRules:
      "This is not a decision. The analysis was done by keyword search, " +
      "without understanding the meaning — it is often wrong. A person decides.",
    disclaimerModel:
      "*This is a decision by artificial intelligence; the answer may be wrong or misleading. Please wait for a moderator to approve it.",
  },

  reportPage: {
    title: "Report a violation",
    lead: "Anonymous. The AI assesses your report straight away.",

    typeLabel: "What was it",
    typeHint: "Not sure — pick the nearest one; we will clarify during review.",

    storyLabel: "What happened",
    storyHint: "",
    storyPlaceholder: "What was written or shown, where, and when",

    dateLabel: "When it happened",
    dateHint: "Today by default. The case may well be an old one.",

    linkLabel: "Link to the publication",
    linkHint: "",
    linkPlaceholder: "https://",

    regionLabel: "Region",
    regionHint: "If the violation is tied to a place. Optional.",
    regionNone: "Not selected",

    cityLabel: "City or district",
    cityHint: "",

    consentLabel: "I agree to the case being published without my personal details",
    consentHint: "",

    filesLabel: "Screenshot or recording",
    filesHint: "",
    filesChoose: "Choose files",
    filesDropHint: "Or drag files here",
    filesDropNow: "Drop them — we will attach them to the report",
    filesPastedName: "Screenshot",
    filesWrongType: "We do not accept files of this kind — photos and video only",
    filesTooMany: "You cannot attach more than {n} files",
    filesLimits: "Up to {files}: photos and video",
    filesChosen: "Chosen",
    filesRemove: "Remove",
    filesTotal: "Total",

    storyShortHint: "{n} more — so there is something to check",
    storyOkHint: "That is enough. The more detail, the faster the review",

    submit: "Send",
    sendingTitle: "Checking your report",
    sendingLead: "This takes up to fifteen seconds.",
    submitting: "Sending…",

    doneTitle: "Report received",
    doneLead:
      "A person on our team will read it. This usually takes a few days.",
    doneNumber: "Your report number",
    doneYourText: "What you wrote",
    doneAccountHint: "To see your reports on other devices, create an account.",
    donePublished: "View the published case",

    receiptNotFound: "Page not found",
    receiptNotFoundLead:
      "The link is wrong or out of date. If you did submit a report, check " +
      "the address — it was issued once, right after you sent it.",
    doneAnother: "Report another one",
    doneToCases: "Browse verified cases",

    errors: {
      typeRequired: "Choose a type of violation",
      storyShort: "Give more detail — a couple of sentences at least",
      storyLong: "Too long, please shorten it",
      linkInvalid: "Check the link: it must start with http:// or https://",
      consentRequired: "Without your consent we cannot publish the case",
      cityLong: "Too long",
      regionUnknown: "Choose a region from the list",
      dateInvalid: "Check the date",
      dateFuture: "That date is in the future — the violation has not happened yet",
      dateAncient: "Too long ago. Check the year",
      filesTooMany: "Too many files — keep it to {files} at most",
      fileType: "We cannot accept that file. JPG, PNG, WEBP, GIF, MP4, WEBM and MOV will do",
      fileTooBig: "The file is too heavy: images up to {image} MB, video up to {video} MB",
      filesTooHeavy: "Together the files weigh more than {total} MB — remove some",
      tooOftenSeconds:
        "You have sent several reports in a row. The next one can be sent in {n} s.",
      tooOften:
        "You have sent several reports in a row. The next one can be sent in {n} min.",
      form: "Check the form",
    },
  },

  aboutPage: {
    title: "About",
    lead:
      "mediamap.kg is a platform that collects and verifies cases of hate " +
      "speech, disinformation and digital fraud in Kyrgyzstan’s online space.",

    howTitle: "How it works",
    how:
      "People send us cases they have run into online. The team checks each " +
      "one and explains what to do about it.",

    whyTitle: "Why it matters",
    why:
      "A single case shows nothing. A hundred show a pattern: what these " +
      "violations look like and what they lead to.",

    soonTitle: "What we are preparing",
    soon:
      "A checking service: you paste a link or a text and get an analysis — " +
      "what can be verified, what looks like manipulation, and where to find " +
      "the primary source. It does not exist yet, and we will not promise a date.",

    supportTitle: "Who supports the project",
    /*
      Donor text. Sent by the project verbatim and edited only by the
      project: it is an obligation to those who fund the work, not our own
      copy. The English is a translation of that Russian; the sentence about
      the European Union below uses the Union’s own official wording rather
      than a fresh translation.
    */
    supportBody: [
      "The Mediamap.kg platform was created by the Foundation for the " +
        "Development of Media Consulting in Central Asia under the regional " +
        "project “Building Audience Resilience Through Real Stories " +
        "(CARAVAN)”. The project was implemented by Internews with the " +
        "financial support of the European Union. The project’s partner in " +
        "Kyrgyzstan was the Association of Public Media of Kyrgyzstan.",
      "MediaMap.kg is currently supported under the project “MediaMap AI — " +
        "a media monitoring platform with artificial intelligence elements”. " +
        "The project is aimed at developing a localised system for assessing " +
        "and moderating harmful content on the basis of the MediaMap.kg " +
        "platform, using artificial intelligence technologies.",
      "The project is carried out with the support of Canal France " +
        "International (CFI), the state operator of the French Ministry for " +
        "Europe and Foreign Affairs and a subsidiary of the France Médias " +
        "Monde group. CFI supports media development in sub-Saharan Africa, " +
        "the Mediterranean and the Levant, promoting dialogue between local " +
        "authorities and citizens, the fight against disinformation, and the " +
        "protection of the environment, human rights and gender equality.",
      "It is being implemented under the Agile initiative — a project funded " +
        "by the European Union and launched in December 2024 to support " +
        "independent journalism in the face of threats to media freedom. The " +
        "project consortium is led by Internews and includes CFI, Thomson " +
        "Media, ARTICLE 19 and the Fojo Media Institute.",
    ],
    /* The donor disclaimer, same text as in the footer. This is the European
       Union’s own standard English wording, not a re-translation: the point
       of the sentence is that it is the Union’s formula, and improving its
       phrasing would defeat it. */
    supportDisclaimer:
      "The new version of the mediamap.kg website was created with the " +
      "financial support of the European Union. Its contents are the sole " +
      "responsibility of the Foundation for the Development of Media " +
      "Consulting and can under no circumstances be regarded as reflecting " +
      "the position of the European Union.",

    contactsLink: "Get in touch",
  },

  contactsPage: {
    title: "Get in touch",
    lead:
      "If you have questions or suggestions, write to us. To report a " +
      "violation, the form works better — it goes straight to the people who " +
      "do the checking.",

    telegramTitle: "Telegram",
    telegramBody: "The quickest way. Message us or join the group.",
    telegramAction: "Open Telegram",

    emailTitle: "Email",
    emailBody: "For official enquiries and proposals to work together.",

    phoneTitle: "Phone",
    phoneBody: "Available for calls during working hours.",

    reportTitle: "Want to report a violation?",
    reportBody:
      "There is a separate form for that. It goes straight to the people who " +
      "check reports and will not get lost in an inbox.",
  },

  newsPage: {
    title: "Media digest",
    lead:
      "Publications from specialist outlets about the media, hate speech and " +
      "fact-checking. These are other people’s materials — we do not edit them.",

    empty: "The feed is empty for now.",

    onlyReadable: "In a language I read",
    showAll: "Show all",
    hiddenNote: "{n} in other languages hidden",
    found: "{n} in total",

    translateTo: "Translate into",
    translateNone: "No translation",
    translateApply: "Show",
    translate: "Translate",
    translating: "Translating…",
    showOriginal: "Original",
    showTranslation: "Translation",
    machineNote: "machine translation",
    translateFailed: "The translation failed — try again later",
  },

  typesPage: {
    title: "Types of violations",
    lead:
      "The three types we sort reports into. For each: what it is, what the " +
      "law says, and what it looks like in practice.",

    about: "What it is",
    legal: "What the law says",
    penalty: "What it carries",
    examples: "What it looks like",

    casesLink: "Cases of this type",
    casesNone: "No confirmed cases of this type yet",
    backToTypes: "All types of violations",

    disclaimer:
      "The legal information is given for reference and is no substitute for " +
      "a lawyer. Whether the law was broken is decided by a court, not by " +
      "this site.",

    notFound: "No such type of violation",
    notFoundLead: "Check the address, or go back to the list of types.",
  },

  violations,

  footer: {
    /*
      Строка копирайта. Название юридического лица прислано проектом и во
      всех трёх языках стоит одинаково: это имя организации, а не текст,
      который переводят. Печатается после «© <год> ·» — см. Footer.tsx.
    */
    rights: "Проект MediaMap.kg / ОФ «Фонд развития медиаконсалтинга в ЦА»",
    admin: "Staff sign-in",
    /*
      Donor disclaimer. Same sentence as on the About page, in the European
      Union’s own standard English wording. It stands in the footer as well
      as on About because donors normally require it on every page, and the
      footer is the only place that appears on all of them.
    */
    disclaimer:
      "The new version of the mediamap.kg website was created with the " +
      "financial support of the European Union. Its contents are the sole " +
      "responsibility of the Foundation for the Development of Media " +
      "Consulting and can under no circumstances be regarded as reflecting " +
      "the position of the European Union.",
  },

  a11y: {
    skipToContent: "Skip to content",
    cases: "cases",
    externalLink: "Opens on another site",
  },

  checkPage: {
    title: "Image check",
    lead: "Upload a picture and we will show what is known about it.",

    /*
      Two things, and the reader needs both BEFORE pressing the button: what
      the answer is worth, and where the file goes.
    */
    limitsTitle: "Worth knowing before you check",
    limitsGuess:
      "There is no exact answer. Screenshots and pictures from social media " +
      "are where the check goes wrong most often — treat the answer as a " +
      "reason to look closer.",
    limitsThirdParty:
      "The file goes to third-party services in France and the USA. We do " +
      "not keep it ourselves.",

    choose: "Choose an image",
    working: "Checking…",
    formats: "JPEG, PNG, WebP or GIF, up to 12 MB",

    metaTitle: "What the file records",
    metaNone:
      "Nothing: no camera, no capture date. That is what every screenshot " +
      "looks like, and every picture that has passed through social media.",
    metaSigned: "Provenance signature",
    metaSignedYes: "present, intact",
    metaGenerator: "Generator",
    detectorNone: "The check is unavailable right now — the service did not answer.",
    observationsTitle: "Worth a closer look",
    observationsNote: "The model gets things wrong — check with your own eyes.",

    detectorScale: "Confidence that the image was generated",

    detectorsNoteStripped:
      "This is a screenshot or a picture from social media. That is exactly " +
      "where the check goes wrong most often — sometimes confidently and " +
      "wrongly.",

    detectorSure: "Confidently generated",
    detectorLikely: "Probably generated",
    detectorUnlikely: "Probably photographed, not generated",
    detectorNo: "No signs of generation found",
    detectorGenerator: "Looks like",

    errors: {
      wait: "Too often. Try again in {n} seconds.",
      type: "We do not analyse files of this kind — photos only.",
      big: "The file is larger than 12 MB.",
      empty: "The file is empty.",
      bad: "The file could not be read.",
      off: "The check is unavailable right now.",
      failed: "The check failed. Try again later.",
    },
  },

  glossary,

  ...sections,
};

export default en;
