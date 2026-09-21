/** Short Q&A for Settings. Field ? tips reuse the same answers. */
export const HelpFaq = [
  {
    q: 'Exact item or taste / vibe?',
    a: 'Exact is a specific thing. Taste / vibe is the feel — cozy, outdoors, quiet luxury. Givers match the board. If a buy link dies they get close swaps, unless you lock Exact or turn on No substitutions.',
  },
  {
    q: 'What does No substitutions do?',
    a: 'Shows a lock to givers. If the buy link is dead they only see a warning — no alternatives.',
  },
  {
    q: 'How do chip-in and reveal work?',
    a: 'Optional target amount lets mates chip in. You see who it’s from on the reveal date they pick — not as soon as it’s funded. Taken and bought stay between givers.',
  },
  {
    q: 'What’s the vibe board?',
    a: 'Chips describe the feel of a gift. Tap a few, or type extras. Givers use them when the exact SKU is gone.',
  },
  {
    q: 'Will I see what people reserved?',
    a: 'No. Friends pick from a share link — you won’t see reserves, pledges, or who bought what until the reveal date.',
  },
  {
    q: 'How do I share my list?',
    a: 'Share / occasions sends a read-only link. Occasion packs (birthday, housewarming) scope the link to those gifts.',
  },
  {
    q: 'How do I find someone’s list?',
    a: 'People → search their Coral Coast handle or email. Display names are not searchable. Pin is private until they accept — unless they already shared a link.',
  },
  {
    q: 'How do I add a photo?',
    a: 'Add photo from your library or camera. A buy link can grab one too. Paste a URL if that’s easier.',
  },
  {
    q: 'Can I paste a shop link?',
    a: 'Yes — paste a buy URL on Add item. We try to fill photo, title, and a short note. Edit anything before you pin. If we miss the photo, add one yourself — Pin still works.',
  },
  {
    q: 'What about Instagram?',
    a: 'Paste a public post URL, or use Share → Gift Decider. We’ll try the page’s photo and caption. If Instagram hides them, add a title and photo yourself — never a fake sample gift. You can still pin.',
  },
] as const;

export const FieldHelp = {
  exactVsTaste: {
    title: 'Exact or taste / vibe',
    body: HelpFaq[0].a,
  },
  noSubs: {
    title: 'No substitutions',
    body: HelpFaq[1].a,
  },
  chipIn: {
    title: 'Chip-in and reveal',
    body: HelpFaq[2].a,
  },
  vibe: {
    title: 'Vibe board',
    body: HelpFaq[3].a,
  },
  photo: {
    title: 'Photo',
    body: HelpFaq[7].a,
  },
  buyLink: {
    title: 'Buy link',
    body: HelpFaq[8].a,
  },
  instagram: {
    title: 'Instagram post',
    body: HelpFaq[9].a,
  },
  findSomeone: {
    title: 'Finding someone',
    body: HelpFaq[6].a,
  },
} as const;
