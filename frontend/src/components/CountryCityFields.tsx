import {
  DEFAULT_COUNTRY,
  GEO_COUNTRIES,
  getRegionsForCountry,
  isRegionValidForCountry,
} from "@/data/geoRegions";
import { FloatingLabelSearchSelect } from "@/components/FloatingLabelSearchSelect";
import { useI18n } from "@/context/I18nContext";

interface CountryCityFieldsProps {
  country: string;
  city: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
}

export function CountryCityFields({
  country,
  city,
  onCountryChange,
  onCityChange,
}: CountryCityFieldsProps) {
  const { t } = useI18n();
  const cityOptions = getRegionsForCountry(country || DEFAULT_COUNTRY);
  const cityDisabled = !country;

  const handleCountryChange = (nextCountry: string) => {
    onCountryChange(nextCountry);
    if (city && !isRegionValidForCountry(nextCountry, city)) {
      onCityChange("");
    }
  };

  return (
    <>
      <FloatingLabelSearchSelect
        label={t("clients.country")}
        value={country}
        options={GEO_COUNTRIES}
        onValueChange={handleCountryChange}
      />
      <FloatingLabelSearchSelect
        label={t("clients.city")}
        value={city}
        options={cityOptions}
        onValueChange={onCityChange}
        disabled={cityDisabled}
      />
    </>
  );
}

export { DEFAULT_COUNTRY };
