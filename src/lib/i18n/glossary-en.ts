/*
  Glossary: words that come up in our write-ups and in the digest.

  Written to the same three rules as the Russian original:

    1. No cross-references to other entries on this list. Defining
       astroturfing as “a kind of trolling” sends the reader off to look up a
       second word when they came for the first.
    2. One or two sentences. Longer goes unread, shorter explains nothing.
    3. An example from life rather than from a textbook, where one is needed.

  The `type` field links a word to a violation type: three of them have full
  pages of their own, and there is no point repeating those here — we link.
*/

const glossary = {
  hateSpeech: {
    term: "Hate speech",
    body:
      "Statements that demean a person or a group for who they are: their " +
      "ethnicity, language, faith, gender, age or health. Calls for violence " +
      "and discrimination belong here too.",
    type: "hate-speech",
  },

  disinformation: {
    term: "Disinformation",
    body:
      "False information spread deliberately, by someone who knows it is " +
      "false. The aim is to mislead people, or to push them towards a " +
      "particular decision.",
    type: "disinformation",
  },

  misinformation: {
    term: "Misinformation",
    body:
      "Also untrue, but without intent: someone believed it and passed it " +
      "on. It differs from disinformation only in the intent behind it; the " +
      "harm is the same.",
    type: null,
  },

  fraud: {
    term: "Digital fraud",
    body:
      "Deception online for money or personal data: fake giveaways, " +
      "“investments” with a promised return, requests to transfer money in " +
      "the name of someone you know.",
    type: "digital-fraud",
  },

  fake: {
    term: "Fake",
    body:
      "A colloquial word for an invented news story, a doctored picture or " +
      "an impostor account. We avoid it in our write-ups: it means too many " +
      "things at once.",
    type: null,
  },

  phishing: {
    term: "Phishing",
    body:
      "An email or message posing as your bank, a government service or " +
      "someone you know, leading to a counterfeit login page. Whatever you " +
      "type there goes to whoever built it.",
    type: null,
  },

  deepfake: {
    term: "Deepfake",
    body:
      "Video or audio in which a person’s face and voice have been forged by " +
      "software. It looks convincing, so what needs checking is not the " +
      "picture but the source: who posted it, and whether the person has the " +
      "same thing on their own channel.",
    type: null,
  },

  clickbait: {
    term: "Clickbait",
    body:
      "A headline that promises more than the text delivers, in order to be " +
      "clicked. Not necessarily a lie, but almost always an exaggeration.",
    type: null,
  },

  factchecking: {
    term: "Fact-checking",
    body:
      "The work of comparing a claim against primary sources and showing " +
      "what the conclusion rests on. What gets checked is not opinion but " +
      "what can be checked: dates, numbers, quotes, images.",
    type: null,
  },

  primarySource: {
    term: "Primary source",
    body:
      "Where the information came from: the document itself, the footage " +
      "itself, the statement itself. A retelling of a retelling is not a " +
      "primary source, however many outlets repeated it.",
    type: null,
  },

  bot: {
    term: "Bot",
    body:
      "An account run by software. Harmless on its own, but a hundred bots " +
      "create the impression that many people think this way.",
    type: null,
  },

  troll: {
    term: "Trolling",
    body:
      "Messages written not to have a conversation but to provoke the other " +
      "person and derail the discussion.",
    type: null,
  },

  astroturfing: {
    term: "Astroturfing",
    body:
      "A paid campaign passed off as the opinion of ordinary people: " +
      "identical reviews, identical comments under different posts, accounts " +
      "all created on the same day.",
    type: null,
  },

  echoChamber: {
    term: "Filter bubble",
    body:
      "The situation where your feed shows you only what you already agree " +
      "with. It forms by itself: sites pick material based on what you " +
      "clicked before.",
    type: null,
  },

  doxxing: {
    term: "Doxxing",
    body:
      "Publishing someone’s personal details — address, workplace, phone " +
      "number — so that they can be found and harassed.",
    type: null,
  },

  moderation: {
    term: "Moderation",
    body:
      "Checking what gets published, by people or by software, against a " +
      "platform’s rules. Here every report is read by a person: the decision " +
      "is theirs, not the model’s.",
    type: null,
  },
};

export default glossary;
