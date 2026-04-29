/**
 * Maps IANA timezone strings to ISO 3166-1 alpha-2 country codes.
 * Used by Content Scout to filter region-restricted YouTube videos.
 *
 * Falls back to null if the timezone cannot be mapped, which means
 * the country restriction check will be skipped gracefully.
 */

// Timezone prefix -> country code for regions where prefix is unambiguous
const TIMEZONE_PREFIX_MAP: Record<string, string> = {
  'Australia': 'AU',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'Asia/Shanghai': 'CN',
  'Asia/Chongqing': 'CN',
  'Asia/Harbin': 'CN',
  'Asia/Urumqi': 'CN',
  'Asia/Kashgar': 'CN',
  'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW',
  'Asia/Singapore': 'SG',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Colombo': 'LK',
  'Asia/Dhaka': 'BD',
  'Asia/Karachi': 'PK',
  'Asia/Manila': 'PH',
  'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Saigon': 'VN',
  'Asia/Phnom_Penh': 'KH',
  'Asia/Yangon': 'MM',
  'Asia/Rangoon': 'MM',
  'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Kuwait': 'KW',
  'Asia/Muscat': 'OM',
  'Asia/Tehran': 'IR',
  'Asia/Baghdad': 'IQ',
  'Asia/Jerusalem': 'IL',
  'Asia/Tel_Aviv': 'IL',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Damascus': 'SY',
  'Asia/Kathmandu': 'NP',
  'Asia/Katmandu': 'NP',
  'Asia/Thimphu': 'BT',
  'Asia/Almaty': 'KZ',
  'Asia/Aqtau': 'KZ',
  'Asia/Aqtobe': 'KZ',
  'Asia/Tashkent': 'UZ',
  'Asia/Samarkand': 'UZ',
  'Asia/Tbilisi': 'GE',
  'Asia/Baku': 'AZ',
  'Asia/Yerevan': 'AM',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH',
  'Europe/Vienna': 'AT',
  'Europe/Lisbon': 'PT',
  'Europe/Warsaw': 'PL',
  'Europe/Prague': 'CZ',
  'Europe/Budapest': 'HU',
  'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG',
  'Europe/Athens': 'GR',
  'Europe/Helsinki': 'FI',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Tallinn': 'EE',
  'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT',
  'Europe/Kiev': 'UA',
  'Europe/Kyiv': 'UA',
  'Europe/Moscow': 'RU',
  'Europe/Istanbul': 'TR',
  'Europe/Belgrade': 'RS',
  'Europe/Zagreb': 'HR',
  'Europe/Ljubljana': 'SI',
  'Europe/Bratislava': 'SK',
  'Europe/Luxembourg': 'LU',
  'Europe/Monaco': 'MC',
  'Europe/Malta': 'MT',
  'Europe/Sarajevo': 'BA',
  'Europe/Skopje': 'MK',
  'Europe/Podgorica': 'ME',
  'Europe/Tirane': 'AL',
  'Europe/Chisinau': 'MD',
  'Europe/Minsk': 'BY',
  'Pacific/Auckland': 'NZ',
  'Pacific/Chatham': 'NZ',
  'Pacific/Fiji': 'FJ',
  'Pacific/Honolulu': 'US',
  'Pacific/Guam': 'GU',
  'Africa/Cairo': 'EG',
  'Africa/Lagos': 'NG',
  'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA',
  'Africa/Casablanca': 'MA',
  'Africa/Accra': 'GH',
  'Africa/Addis_Ababa': 'ET',
  'Africa/Dar_es_Salaam': 'TZ',
  'Africa/Kampala': 'UG',
  'Africa/Tunis': 'TN',
  'Africa/Algiers': 'DZ',
  'Africa/Tripoli': 'LY',
  'Indian/Maldives': 'MV',
  'Indian/Mauritius': 'MU',
};

// America/* timezones mapped to country codes
const AMERICA_TZ_MAP: Record<string, string> = {
  // United States
  'New_York': 'US',
  'Chicago': 'US',
  'Denver': 'US',
  'Los_Angeles': 'US',
  'Phoenix': 'US',
  'Anchorage': 'US',
  'Adak': 'US',
  'Boise': 'US',
  'Detroit': 'US',
  'Indiana': 'US',
  'Juneau': 'US',
  'Kentucky': 'US',
  'Menominee': 'US',
  'Nome': 'US',
  'North_Dakota': 'US',
  'Sitka': 'US',
  'Yakutat': 'US',
  // Canada
  'Toronto': 'CA',
  'Vancouver': 'CA',
  'Edmonton': 'CA',
  'Winnipeg': 'CA',
  'Halifax': 'CA',
  'St_Johns': 'CA',
  'Regina': 'CA',
  'Yellowknife': 'CA',
  'Iqaluit': 'CA',
  'Whitehorse': 'CA',
  'Moncton': 'CA',
  'Goose_Bay': 'CA',
  'Glace_Bay': 'CA',
  'Dawson': 'CA',
  'Dawson_Creek': 'CA',
  'Fort_Nelson': 'CA',
  'Creston': 'CA',
  'Rankin_Inlet': 'CA',
  'Resolute': 'CA',
  'Swift_Current': 'CA',
  'Cambridge_Bay': 'CA',
  'Inuvik': 'CA',
  'Atikokan': 'CA',
  'Nipigon': 'CA',
  'Thunder_Bay': 'CA',
  'Rainy_River': 'CA',
  'Pangnirtung': 'CA',
  // Mexico
  'Mexico_City': 'MX',
  'Cancun': 'MX',
  'Merida': 'MX',
  'Monterrey': 'MX',
  'Matamoros': 'MX',
  'Mazatlan': 'MX',
  'Chihuahua': 'MX',
  'Ojinaga': 'MX',
  'Hermosillo': 'MX',
  'Tijuana': 'MX',
  'Bahia_Banderas': 'MX',
  // Brazil
  'Sao_Paulo': 'BR',
  'Noronha': 'BR',
  'Belem': 'BR',
  'Fortaleza': 'BR',
  'Recife': 'BR',
  'Araguaina': 'BR',
  'Maceio': 'BR',
  'Bahia': 'BR',
  'Campo_Grande': 'BR',
  'Cuiaba': 'BR',
  'Manaus': 'BR',
  'Porto_Velho': 'BR',
  'Boa_Vista': 'BR',
  'Santarem': 'BR',
  'Eirunepe': 'BR',
  'Rio_Branco': 'BR',
  // Argentina
  'Argentina': 'AR',
  'Buenos_Aires': 'AR',
  // Other South/Central America
  'Santiago': 'CL',
  'Bogota': 'CO',
  'Lima': 'PE',
  'Caracas': 'VE',
  'Guayaquil': 'EC',
  'La_Paz': 'BO',
  'Asuncion': 'PY',
  'Montevideo': 'UY',
  'Paramaribo': 'SR',
  'Cayenne': 'GF',
  'Georgetown': 'GY',
  'Havana': 'CU',
  'Jamaica': 'JM',
  'Port-au-Prince': 'HT',
  'Santo_Domingo': 'DO',
  'Puerto_Rico': 'PR',
  'Panama': 'PA',
  'Costa_Rica': 'CR',
  'Guatemala': 'GT',
  'El_Salvador': 'SV',
  'Tegucigalpa': 'HN',
  'Managua': 'NI',
  'Belize': 'BZ',
  'Nassau': 'BS',
  'Barbados': 'BB',
  'Martinique': 'MQ',
  'Port_of_Spain': 'TT',
  'Curacao': 'CW',
  'Aruba': 'AW',
};

/**
 * Converts an IANA timezone string to an ISO 3166-1 alpha-2 country code.
 * Returns null if the timezone cannot be mapped.
 */
export function timezoneToCountryCode(timezone: string): string | null {
  if (!timezone) return null;

  // Direct match first
  if (TIMEZONE_PREFIX_MAP[timezone]) {
    return TIMEZONE_PREFIX_MAP[timezone];
  }

  // Australia/* -> AU (all Australian timezones)
  if (timezone.startsWith('Australia/')) {
    return 'AU';
  }

  // America/* -> look up the city part
  if (timezone.startsWith('America/')) {
    const city = timezone.replace('America/', '');
    // Handle nested like America/Argentina/Buenos_Aires
    const topLevel = city.split('/')[0];
    if (AMERICA_TZ_MAP[topLevel]) {
      return AMERICA_TZ_MAP[topLevel];
    }
  }

  // Try matching the full timezone against prefix map keys that are prefixes
  for (const [tz, code] of Object.entries(TIMEZONE_PREFIX_MAP)) {
    if (timezone === tz) {
      return code;
    }
  }

  return null;
}
