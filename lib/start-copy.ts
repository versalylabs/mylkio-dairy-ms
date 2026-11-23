// Wording for the three-step start shown on Home to a farm with no cows and no milk yet, in English and Kiswahili, side by
// side (tests/app-copy.test.ts checks both are complete).

export const START_COPY = {
  en: {
    heading: 'Start your farm in three steps',
    sub: 'Add a little at a time. You can change anything later.',
    done: 'Done',
    steps: {
      milk: { title: 'Record milk', hint: 'Type the litres for the whole farm. You do not need to add any cows first.', button: 'Record milk' },
      cow: { title: 'Add a cow', hint: 'A name or a tag number is enough to begin.', button: 'Add a cow' },
      buyer: { title: 'Add a buyer', hint: 'The cooperative or customer you sell milk to.', button: 'Add a buyer' },
    },
  },
  sw: {
    heading: 'Anza shamba lako kwa hatua tatu',
    sub: 'Ongeza kidogo kidogo. Unaweza kubadilisha chochote baadaye.',
    done: 'Imekamilika',
    steps: {
      milk: { title: 'Rekodi maziwa', hint: 'Andika lita za shamba zima. Huhitaji kuongeza ng’ombe kwanza.', button: 'Rekodi maziwa' },
      cow: { title: 'Ongeza ng’ombe', hint: 'Jina au nambari ya lebo inatosha kuanza.', button: 'Ongeza ng’ombe' },
      buyer: { title: 'Ongeza mnunuzi', hint: 'Chama cha ushirika au mteja unayemuuzia maziwa.', button: 'Ongeza mnunuzi' },
    },
  },
} as const;
