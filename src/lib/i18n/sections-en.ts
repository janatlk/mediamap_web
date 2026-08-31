/*
  English texts for the newer sections: analytics, search, resources,
  glossary, quizzes, donor banners.

  A separate file, mirroring sections-ru.ts key for key. Both are read as one
  object by the dictionary, so a key missing here would be a compile error,
  not a silent gap on the page.
*/

const sections = {
  partners: {
    title: "Supported by",
    donors: "Donors",
    partners: "Partners",
  },

  analyticsPage: {
    title: "Analytics",
    lead:
      "What the reports we have received add up to. Both confirmed cases and " +
      "those still in the queue are counted.",

    /* The honest caveat. The section is public, and people are entitled to
       know that part of these numbers are unverified reports which may not
       hold up. */
    scopeNote:
      "Unverified reports are counted too. These are what people told us, " +
      "not established facts: some will not be confirmed.",
    scopeConfirmed: "of them confirmed by review",

    totalTitle: "Reports in total",
    typesTitle: "By type of violation",
    typesLead: "The share of each type among all reports.",
    trendTitle: "Over the past year",
    trendLead:
      "By month, each type separately. All three share one scale — otherwise " +
      "charts that look alike would mean different numbers.",
    sourcesTitle: "Where it happens",
    sourcesLead: "The platforms people complain about most.",
    regionsTitle: "By region",
    regionsLead: "Naming a region is optional, so not every report is here.",

    confirmed: "confirmed",
    pending: "under review",
    empty: "No data yet — at least one report is needed.",
    regionUnknown: "Region not given",
    sourceUnknown: "Platform not given",
  },

  searchPage: {
    title: "Search",
    lead: "Searches cases, the digest, violation types and the glossary.",
    placeholder: "What to look for",
    action: "Search",
    hint: "Type at least two characters.",
    nothing: "Nothing found for “{q}”.",
    nothingHint: "Try a single word instead of a phrase.",
    found: "Found: {n}",

    groupCases: "Cases",
    groupNews: "Media digest",
    groupTypes: "Types of violations",
    groupGlossary: "Glossary",
  },

  resourcesPage: {
    title: "Useful resources",
    lead:
      "Where to go if you want to check something yourself. These are other " +
      "people’s sites — we neither run them nor answer for what is on them.",

    groupVerify: "Tools for checking things yourself",
    groupFactcheck: "Organisations that check full time",
    groupFreedom: "Free speech and protection of journalists",

    /* Notes on each resource. The key is the id from src/lib/resources.ts. */
    notes: {
      factCheckExplorer:
        "A search across checks already published: someone may have looked " +
        "into this claim before you.",
      tineye: "Reverse image search. Shows where a picture appeared earlier.",
      bellingcat:
        "Open-source investigations, and teaching material on how to run them.",
      ifcn:
        "An association of fact-checking organisations and the code of " +
        "principles they work by.",
      factcheckOrg: "Checks of public statements, with the sources shown.",
      snopes: "The oldest archive of debunked rumours and hoaxes.",
      cpj: "Pressure on journalists, country by country, our region included.",
      article19: "Freedom of expression: research and legal analysis.",
      internews:
        "Media support programmes; MediaMap was made under one of them.",
    },

    localTitle: "No Kyrgyzstani resources here yet",
    localBody:
      "We would rather not add a link at random. If you know a local project " +
      "that belongs here, write to us and we will add it.",
  },

  glossaryPage: {
    title: "Glossary",
    lead:
      "Words that come up in our write-ups and in the digest. Short, and " +
      "without sending you to another word on the same list.",
    typeLink: "More about this type of violation",
  },

  quizPage: {
    title: "Test yourself",
    lead:
      "Short quizzes: tell a news report from a fake, take apart a headline, " +
      "recognise hate speech in a comment.",
    soonTitle: "Quizzes are being written",
    soonBody:
      "The questions are being written together with the review team, from " +
      "real cases in our own database rather than invented ones. We will not " +
      "name a date until we are sure of it.",
    meanwhileTitle: "In the meantime",
    meanwhileBody:
      "The violation types and the glossary answer the same questions, only " +
      "without a score.",
    toTypes: "Types of violations",
    toGlossary: "Glossary",
  },
};

export default sections;
