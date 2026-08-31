// English texts for the violation types; the key is the slug from the database.
//
// The legal wording is translated, not restated: the Kyrgyz statutes are the
// authority, and this is a reading aid for people who do not read Russian.
// Where an article of the Criminal Code is cited, the number is what matters
// and it is left exactly as it stands.

const violations = {
  "hate-speech": {
    name: "Hate speech",
    summary:
      "Discriminatory statements and incitement of ethnic, religious or " +
      "social hostility.",
    about:
      "Hate speech is any form of expression that spreads, provokes, " +
      "encourages or justifies racial hatred, xenophobia, antisemitism or " +
      "other forms of hatred grounded in intolerance.",
    legal:
      "The law of the Kyrgyz Republic prohibits public calls to incite " +
      "hostility (Article 330 of the Criminal Code of the Kyrgyz Republic).",
    penalty:
      "Punishable by fines or two to five years of imprisonment, depending " +
      "on the gravity of the offence.",
    examples: [
      "Calls for discrimination or violence on ethnic or religious grounds in comment threads.",
      "Offensive labels and stereotypes aimed at ethnic groups.",
      "Justifying violence or degrading human dignity on social media.",
    ],
  },

  disinformation: {
    name: "Disinformation",
    summary:
      "Knowingly false information created to mislead people and to " +
      "manipulate them.",
    about:
      "Disinformation is false information deliberately created and spread " +
      "in order to deceive the public, cause harm, or gain political or " +
      "financial advantage. One-sided framing designed to lead the reader to " +
      "a particular conclusion belongs here too.",
    legal:
      "The Kyrgyz law On Protection from False (Unreliable) Information sets " +
      "out how resources publishing fake material are blocked.",
    penalty:
      "Administrative measures, blocking of the online resource by decision " +
      "of the authorised body, and civil liability.",
    examples: [
      "Forged documents or screenshots of ministry “official decrees”.",
      "Fabricated quotes attributed to well-known public figures.",
      "Old or edited photos and video reused to cause panic.",
    ],
  },

  "digital-fraud": {
    name: "Digital fraud",
    summary:
      "Phishing, account takeover, social engineering and theft of money.",
    about:
      "Digital fraud covers social engineering, fake bank websites, bogus " +
      "giveaways and phishing links aimed at stealing money or personal data.",
    legal:
      "Criminal Code of the Kyrgyz Republic, Article 209 (fraud committed " +
      "using information technology).",
    penalty:
      "Fines, corrective labour, or up to seven years of imprisonment.",
    examples: [
      "Mass messages about “urgent state financial aid” carrying a phishing link.",
      "Messages from a fake “messenger support team” demanding an access code.",
      "Calls from people posing as bank staff, trying to obtain a card’s CVV.",
    ],
  },
};

export default violations;
