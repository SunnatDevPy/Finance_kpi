export type CountryCode = "uz" | "kz" | "ru";

export interface GeoOption {
  /** DB ga saqlanadigan kanonik qiymat (o'zbek lotin) */
  value: string;
  labelUz: string;
  labelRu: string;
  searchTerms?: string[];
}

export interface GeoCountry extends GeoOption {
  code: CountryCode;
}

export const DEFAULT_COUNTRY = "O'zbekiston";

export const GEO_COUNTRIES: GeoCountry[] = [
  {
    code: "uz",
    value: "O'zbekiston",
    labelUz: "O'zbekiston",
    labelRu: "Узбекистан",
    searchTerms: ["uzbekistan", "uzb", "узбекистан"],
  },
  {
    code: "kz",
    value: "Qozog'iston",
    labelUz: "Qozog'iston",
    labelRu: "Казахстан",
    searchTerms: ["kazakhstan", "kaz", "казахстан", "qozoq"],
  },
  {
    code: "ru",
    value: "Rossiya",
    labelUz: "Rossiya",
    labelRu: "Россия",
    searchTerms: ["russia", "rf", "россия", "ross"],
  },
];

function region(
  value: string,
  labelRu: string,
  searchTerms?: string[],
): GeoOption {
  return { value, labelUz: value, labelRu, searchTerms };
}

const UZ_REGIONS: GeoOption[] = [
  region("Andijon viloyati", "Андижанская область", ["andijon", "андижан"]),
  region("Buxoro viloyati", "Бухарская область", ["buxoro", "бухара"]),
  region("Farg'ona viloyati", "Ферганская область", ["fargona", "fergana", "фергана"]),
  region("Jizzax viloyati", "Джизакская область", ["jizzax", "jizax", "джизак"]),
  region("Xorazm viloyati", "Хорезмская область", ["xorazm", "xorezm", "хорезм"]),
  region("Namangan viloyati", "Наманганская область", ["namangan", "наманган"]),
  region("Navoiy viloyati", "Навоийская область", ["navoiy", "navoi", "навоий"]),
  region("Qashqadaryo viloyati", "Кашкадарьинская область", ["qashqadaryo", "кашкадарья"]),
  region("Samarqand viloyati", "Самаркандская область", ["samarqand", "samarkand", "самарканд"]),
  region("Sirdaryo viloyati", "Сырдарьинская область", ["sirdaryo", "сырдарья"]),
  region("Surxondaryo viloyati", "Сурхандарьинская область", ["surxondaryo", "сурхандарья"]),
  region("Toshkent viloyati", "Ташкентская область", ["toshkent viloyati", "tashkent region"]),
  region("Toshkent shahri", "город Ташкент", ["tosh", "tashkent", "toshkent", "ташкент", "tosh sh"]),
  region("Qoraqalpog'iston Respublikasi", "Республика Каракалпакстан", [
    "qoraqalpogiston",
    "karakalpakstan",
    "каракалпакстан",
  ]),
];

const KZ_REGIONS: GeoOption[] = [
  region("Abay viloyati", "область Абай", ["abay", "абай"]),
  region("Aqmola viloyati", "Акмолинская область", ["aqmola", "akmola", "акмола"]),
  region("Aqtobe viloyati", "Актюбинская область", ["aqtobe", "aktobe", "актобе"]),
  region("Almaty viloyati", "Алматинская область", ["almaty viloyati", "алматы обл"]),
  region("Almaty shahri", "город Алматы", ["almaty", "alma", "алматы"]),
  region("Astana shahri", "город Астана", ["astana", "nursultan", "астана"]),
  region("Atyrau viloyati", "Атырауская область", ["atyrau", "атырау"]),
  region("Shymkent shahri", "город Шымкент", ["shymkent", "chimkent", "шымкент"]),
  region("Sharqiy Qozog'iston viloyati", "Восточно-Казахстанская область", [
    "sharqiy",
    "vko",
    "восточно-казахстанская",
  ]),
  region("Zhambyl viloyati", "Жамбылская область", ["zhambyl", "jambyl", "жамбыл"]),
  region("Jetisu viloyati", "область Жетісу", ["jetisu", "жетісу"]),
  region("Qarag'anda viloyati", "Карагандинская область", ["qaraganda", "karaganda", "караганда"]),
  region("Qostanay viloyati", "Костанайская область", ["qostanay", "kostanay", "костанай"]),
  region("Qyzylorda viloyati", "Кызылординская область", ["qyzylorda", "кызылорда"]),
  region("Mang'ystau viloyati", "Мангистауская область", ["mangystau", "мангистау"]),
  region("Pavlodar viloyati", "Павлодарская область", ["pavlodar", "павлодар"]),
  region("Soltustik Qozog'iston viloyati", "Северо-Казахстанская область", [
    "soltustik",
    "sko",
    "северо-казахстанская",
  ]),
  region("Turkiston viloyati", "Туркестанская область", ["turkiston", "turkestan", "туркестан"]),
  region("Ulytau viloyati", "область Ұлытау", ["ulytau", "ұлытау"]),
  region("Batys Qozog'iston viloyati", "Западно-Казахстанская область", [
    "batys",
    "zko",
    "западно-казахстанская",
  ]),
];

const RU_REGIONS: GeoOption[] = [
  region("Moskva shahri", "город Москва", ["moskva", "moscow", "москва", "msk"]),
  region("Sankt-Peterburg shahri", "город Санкт-Петербург", [
    "peterburg",
    "spb",
    "sankt",
    "санкт-петербург",
    "питер",
  ]),
  region("Moskva viloyati", "Московская область", ["moscow region", "подмосковье"]),
  region("Leningrad viloyati", "Ленинградская область", ["leningrad", "ленинградская"]),
  region("Adigeya Respublikasi", "Республика Адыгея", ["adigeya", "адыгея"]),
  region("Altay Respublikasi", "Республика Алтай", ["altay", "алтай"]),
  region("Bashqortiston Respublikasi", "Республика Башкортостан", ["bashkortostan", "ufa", "башкортостан"]),
  region("Buryatiya Respublikasi", "Республика Бурятия", ["buryatiya", "бурятия"]),
  region("Dagestan Respublikasi", "Республика Дагестан", ["dagestan", "дагестан"]),
  region("Ingushetiya Respublikasi", "Республика Ингушетия", ["ingushetiya"]),
  region("Kabardin-Balkariya Respublikasi", "Кабардино-Балкарская Республика", ["kabardin"]),
  region("Kalmykiya Respublikasi", "Республика Калмыкия", ["kalmykiya"]),
  region("Karachay-Cherkessiya Respublikasi", "Карачаево-Черкесская Республика", ["karachay"]),
  region("Kareliya Respublikasi", "Республика Карелия", ["kareliya", "карелия"]),
  region("Komi Respublikasi", "Республика Коми", ["komi", "коми"]),
  region("Mariy El Respublikasi", "Республика Марий Эл", ["mariy el"]),
  region("Mordoviya Respublikasi", "Республика Мордовия", ["mordoviya"]),
  region("Sakha (Yakutiya) Respublikasi", "Республика Саха (Якутия)", ["yakutiya", "sakha"]),
  region("Ossetiya Respublikasi", "Республика Северная Осетия — Алания", ["ossetiya"]),
  region("Tatariston Respublikasi", "Республика Татарстан", ["tatariston", "kazan", "татарстан"]),
  region("Tyva Respublikasi", "Республика Тыва", ["tyva", "тыва"]),
  region("Udmurtiya Respublikasi", "Удмуртская Республика", ["udmurtiya", "ижевск"]),
  region("Xakasiya Respublikasi", "Республика Хакасия", ["hakasiya"]),
  region("Chechen Respublikasi", "Чеченская Республика", ["chechen", "грозный"]),
  region("Chuvashiya Respublikasi", "Чувашская Республика", ["chuvashiya"]),
  region("Altay o'lkasi", "Алтайский край", ["altay kray"]),
  region("Zabaykal o'lkasi", "Забайкальский край", ["zabaykal", "чита"]),
  region("Kamchatka o'lkasi", "Камчатский край", ["kamchatka", "камчатка"]),
  region("Krasnodar o'lkasi", "Краснодарский край", ["krasnodar", "краснодар"]),
  region("Krasnoyarsk o'lkasi", "Красноярский край", ["krasnoyarsk", "красноярск"]),
  region("Primorskiy o'lkasi", "Приморский край", ["primorskiy", "vladivostok", "владивосток"]),
  region("Stavropol o'lkasi", "Ставропольский край", ["stavropol", "ставрополь"]),
  region("Xabarovsk o'lkasi", "Хабаровский край", ["xabarovsk", "хабаровск"]),
  region("Amur viloyati", "Амурская область", ["amur", "благовещенск"]),
  region("Arxangel viloyati", "Архангельская область", ["arxangel", "архангельск"]),
  region("Astraxan viloyati", "Астраханская область", ["astraxan", "астрахань"]),
  region("Belgorod viloyati", "Белгородская область", ["belgorod", "белгород"]),
  region("Bryansk viloyati", "Брянская область", ["bryansk", "брянск"]),
  region("Vladimir viloyati", "Владимирская область", ["vladimir", "владимир"]),
  region("Volgograd viloyati", "Волгоградская область", ["volgograd", "волгоград"]),
  region("Vologda viloyati", "Вологодская область", ["vologda", "вологда"]),
  region("Voronej viloyati", "Воронежская область", ["voronej", "воронеж"]),
  region("Ivanovo viloyati", "Ивановская область", ["ivanovo", "иваново"]),
  region("Irkutsk viloyati", "Иркутская область", ["irkutsk", "иркутск"]),
  region("Kaliningrad viloyati", "Калининградская область", ["kaliningrad", "калининград"]),
  region("Kaluga viloyati", "Калужская область", ["kaluga", "калуга"]),
  region("Kemerovo viloyati", "Кемеровская область", ["kemerovo", "кемерово"]),
  region("Kirov viloyati", "Кировская область", ["kirov", "киров"]),
  region("Kostroma viloyati", "Костромская область", ["kostroma", "кострома"]),
  region("Kurgan viloyati", "Курганская область", ["kurgan", "курган"]),
  region("Kursk viloyati", "Курская область", ["kursk", "курск"]),
  region("Lipetsk viloyati", "Липецкая область", ["lipetsk", "липецк"]),
  region("Magadan viloyati", "Магаданская область", ["magadan", "магадан"]),
  region("Murmansk viloyati", "Мурманская область", ["murmansk", "мурманск"]),
  region("Nizhniy Novgorod viloyati", "Нижегородская область", ["nizhniy", "нижний новгород"]),
  region("Novgorod viloyati", "Новгородская область", ["novgorod", "новгород"]),
  region("Novosibirsk viloyati", "Новосибирская область", ["novosibirsk", "новосибирск"]),
  region("Omsk viloyati", "Омская область", ["omsk", "омск"]),
  region("Orenburg viloyati", "Оренбургская область", ["orenburg", "оренбург"]),
  region("Oryol viloyati", "Орловская область", ["oryol", "орёл"]),
  region("Penza viloyati", "Пензенская область", ["penza", "пенза"]),
  region("Perm viloyati", "Пермский край", ["perm", "пермь"]),
  region("Pskov viloyati", "Псковская область", ["pskov", "псков"]),
  region("Rostov viloyati", "Ростовская область", ["rostov", "ростов"]),
  region("Ryazan viloyati", "Рязанская область", ["ryazan", "рязань"]),
  region("Samara viloyati", "Самарская область", ["samara", "самара"]),
  region("Saratov viloyati", "Саратовская область", ["saratov", "саратов"]),
  region("Saxalin viloyati", "Сахалинская область", ["saxalin", "сахалин"]),
  region("Sverdlovsk viloyati", "Свердловская область", ["sverdlovsk", "ekaterinburg", "екатеринбург"]),
  region("Smolensk viloyati", "Смоленская область", ["smolensk", "смоленск"]),
  region("Tambov viloyati", "Тамбовская область", ["tambov", "тамбов"]),
  region("Tver viloyati", "Тверская область", ["tver", "тверь"]),
  region("Tomsk viloyati", "Томская область", ["tomsk", "томск"]),
  region("Tula viloyati", "Тульская область", ["tula", "тула"]),
  region("Tyumen viloyati", "Тюменская область", ["tyumen", "тюмень"]),
  region("Ulyanovsk viloyati", "Ульяновская область", ["ulyanovsk", "ульяновск"]),
  region("Chelyabinsk viloyati", "Челябинская область", ["chelyabinsk", "челябинск"]),
  region("Yaroslavl viloyati", "Ярославская область", ["yaroslavl", "ярославль"]),
  region("Yevrey avtonom viloyati", "Еврейская автономная область", ["birobidzhan"]),
  region("Nenets avtonom okrugi", "Ненецкий автономный округ", ["nenets"]),
  region("Xanty-Mansi avtonom okrugi", "Ханты-Мансийский автономный округ", ["xanty", "хмао"]),
  region("Chukotka avtonom okrugi", "Чукотский автономный округ", ["chukotka"]),
  region("Yamalo-Nenets avtonom okrugi", "Ямало-Ненецкий автономный округ", ["yamal", "янао"]),
  region("Krim Respublikasi", "Республика Крым", ["krim", "крым", "sevastopol"]),
  region("Sevastopol shahri", "город Севастополь", ["sevastopol", "севастополь"]),
];

export const REGIONS_BY_COUNTRY: Record<CountryCode, GeoOption[]> = {
  uz: UZ_REGIONS,
  kz: KZ_REGIONS,
  ru: RU_REGIONS,
};

function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[''`ʻʼ]/g, "'")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim();
}

function optionHaystack(option: GeoOption): string {
  return [option.value, option.labelUz, option.labelRu, ...(option.searchTerms ?? [])]
    .map(normalizeSearch)
    .join(" ");
}

export function geoOptionLabel(option: GeoOption, locale: "uz" | "ru"): string {
  return locale === "ru" ? option.labelRu : option.labelUz;
}

export function filterGeoOptions(options: GeoOption[], query: string): GeoOption[] {
  const q = normalizeSearch(query);
  if (!q) return options;
  return options.filter((option) => {
    const haystack = optionHaystack(option);
    if (haystack.includes(q)) return true;
    return [option.labelUz, option.labelRu, ...(option.searchTerms ?? [])].some((term) =>
      normalizeSearch(term).startsWith(q),
    );
  });
}

function findCountryByStored(stored: string): GeoCountry | undefined {
  if (!stored) return undefined;
  const normalized = normalizeSearch(stored);
  return GEO_COUNTRIES.find((country) => {
    if (normalizeSearch(country.value) === normalized) return true;
    if (normalizeSearch(country.labelRu) === normalized) return true;
    return country.searchTerms?.some((term) => normalizeSearch(term) === normalized);
  });
}

function findRegionByStored(options: GeoOption[], stored: string): GeoOption | undefined {
  if (!stored) return undefined;
  const normalized = normalizeSearch(stored);
  return options.find((region) => {
    if (normalizeSearch(region.value) === normalized) return true;
    if (normalizeSearch(region.labelRu) === normalized) return true;
    return region.searchTerms?.some((term) => normalizeSearch(term) === normalized);
  });
}

export function getCountryCode(countryValue: string): CountryCode | null {
  return findCountryByStored(countryValue)?.code ?? null;
}

export function resolveCountryValue(stored: string): string {
  if (!stored) return DEFAULT_COUNTRY;
  return findCountryByStored(stored)?.value ?? stored;
}

export function resolveRegionValue(countryValue: string, stored: string): string {
  if (!stored) return "";
  const code = getCountryCode(countryValue);
  if (!code) return stored;
  return findRegionByStored(REGIONS_BY_COUNTRY[code], stored)?.value ?? stored;
}

export function getRegionsForCountry(countryValue: string): GeoOption[] {
  const code = getCountryCode(countryValue);
  if (!code) return [];
  return REGIONS_BY_COUNTRY[code];
}

export function isRegionValidForCountry(countryValue: string, regionValue: string): boolean {
  if (!regionValue) return true;
  const code = getCountryCode(countryValue);
  if (!code) return true;
  return REGIONS_BY_COUNTRY[code].some((region) => region.value === regionValue);
}
