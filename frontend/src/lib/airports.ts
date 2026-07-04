export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  // United States
  { code: "ATL", name: "Hartsfield-Jackson Atlanta International", city: "Atlanta", country: "United States", lat: 33.6407, lng: -84.4277 },
  { code: "LAX", name: "Los Angeles International", city: "Los Angeles", country: "United States", lat: 33.9416, lng: -118.4085 },
  { code: "ORD", name: "O'Hare International", city: "Chicago", country: "United States", lat: 41.9742, lng: -87.9073 },
  { code: "DFW", name: "Dallas/Fort Worth International", city: "Dallas", country: "United States", lat: 32.8998, lng: -97.0403 },
  { code: "DEN", name: "Denver International", city: "Denver", country: "United States", lat: 39.8561, lng: -104.6737 },
  { code: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", lat: 40.6413, lng: -73.7781 },
  { code: "SFO", name: "San Francisco International", city: "San Francisco", country: "United States", lat: 37.6213, lng: -122.379 },
  { code: "SEA", name: "Seattle-Tacoma International", city: "Seattle", country: "United States", lat: 47.4502, lng: -122.3088 },
  { code: "MIA", name: "Miami International", city: "Miami", country: "United States", lat: 25.7959, lng: -80.287 },
  { code: "LAS", name: "Harry Reid International", city: "Las Vegas", country: "United States", lat: 36.084, lng: -115.1537 },
  { code: "PHX", name: "Phoenix Sky Harbor International", city: "Phoenix", country: "United States", lat: 33.4373, lng: -112.0078 },
  { code: "FAT", name: "Fresno Yosemite International", city: "Fresno", country: "United States", lat: 36.7762, lng: -119.7181 },
  { code: "BOS", name: "Logan International", city: "Boston", country: "United States", lat: 42.3656, lng: -71.0096 },
  { code: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "United States", lat: 29.9902, lng: -95.3368 },
  // United Kingdom
  { code: "LHR", name: "Heathrow", city: "London", country: "United Kingdom", lat: 51.47, lng: -0.4543 },
  { code: "LGW", name: "Gatwick", city: "London", country: "United Kingdom", lat: 51.1537, lng: -0.1821 },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom", lat: 53.3537, lng: -2.275 },
  { code: "EDI", name: "Edinburgh", city: "Edinburgh", country: "United Kingdom", lat: 55.9508, lng: -3.3615 },
  // France
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France", lat: 49.0097, lng: 2.5479 },
  { code: "ORY", name: "Orly", city: "Paris", country: "France", lat: 48.7262, lng: 2.3652 },
  { code: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", lat: 43.6584, lng: 7.2159 },
  // Germany
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "Germany", lat: 50.0379, lng: 8.5622 },
  { code: "MUC", name: "Munich", city: "Munich", country: "Germany", lat: 48.3538, lng: 11.7861 },
  { code: "BER", name: "Berlin Brandenburg", city: "Berlin", country: "Germany", lat: 52.3667, lng: 13.5033 },
  // Spain
  { code: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", country: "Spain", lat: 40.4983, lng: -3.5676 },
  { code: "BCN", name: "Barcelona-El Prat", city: "Barcelona", country: "Spain", lat: 41.2974, lng: 2.0833 },
  // Italy
  { code: "FCO", name: "Leonardo da Vinci-Fiumicino", city: "Rome", country: "Italy", lat: 41.8003, lng: 12.2389 },
  { code: "MXP", name: "Malpensa", city: "Milan", country: "Italy", lat: 45.6306, lng: 8.7281 },
  // Netherlands
  { code: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", lat: 52.3105, lng: 4.7683 },
  // Switzerland
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4647, lng: 8.5492 },
  // Turkey
  { code: "IST", name: "Istanbul", city: "Istanbul", country: "Turkey", lat: 41.2753, lng: 28.7519 },
  // United Arab Emirates
  { code: "DXB", name: "Dubai International", city: "Dubai", country: "United Arab Emirates", lat: 25.2532, lng: 55.3657 },
  { code: "AUH", name: "Abu Dhabi International", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.433, lng: 54.6511 },
  // India
  { code: "DEL", name: "Indira Gandhi International", city: "New Delhi", country: "India", lat: 28.5562, lng: 77.1 },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj International", city: "Mumbai", country: "India", lat: 19.0896, lng: 72.8656 },
  { code: "BLR", name: "Kempegowda International", city: "Bangalore", country: "India", lat: 13.1986, lng: 77.7066 },
  // China
  { code: "PEK", name: "Beijing Capital International", city: "Beijing", country: "China", lat: 40.0799, lng: 116.6031 },
  { code: "PVG", name: "Shanghai Pudong International", city: "Shanghai", country: "China", lat: 31.1443, lng: 121.8083 },
  { code: "CAN", name: "Guangzhou Baiyun International", city: "Guangzhou", country: "China", lat: 23.3924, lng: 113.2988 },
  // Japan
  { code: "HND", name: "Tokyo Haneda", city: "Tokyo", country: "Japan", lat: 35.5494, lng: 139.7798 },
  { code: "NRT", name: "Narita International", city: "Tokyo", country: "Japan", lat: 35.772, lng: 140.3929 },
  { code: "KIX", name: "Kansai International", city: "Osaka", country: "Japan", lat: 34.4347, lng: 135.2441 },
  // South Korea
  { code: "ICN", name: "Incheon International", city: "Seoul", country: "South Korea", lat: 37.4602, lng: 126.4407 },
  // Singapore
  { code: "SIN", name: "Changi", city: "Singapore", country: "Singapore", lat: 1.3644, lng: 103.9915 },
  // Australia
  { code: "SYD", name: "Sydney Kingsford Smith", city: "Sydney", country: "Australia", lat: -33.9461, lng: 151.1772 },
  { code: "MEL", name: "Melbourne", city: "Melbourne", country: "Australia", lat: -37.669, lng: 144.841 },
  { code: "BNE", name: "Brisbane", city: "Brisbane", country: "Australia", lat: -27.3842, lng: 153.1175 },
  // Canada
  { code: "YYZ", name: "Toronto Pearson International", city: "Toronto", country: "Canada", lat: 43.6777, lng: -79.6248 },
  { code: "YVR", name: "Vancouver International", city: "Vancouver", country: "Canada", lat: 49.1967, lng: -123.1815 },
  { code: "YUL", name: "Montréal-Trudeau International", city: "Montreal", country: "Canada", lat: 45.4706, lng: -73.7408 },
  // Mexico
  { code: "MEX", name: "Benito Juárez International", city: "Mexico City", country: "Mexico", lat: 19.4363, lng: -99.0721 },
  { code: "CUN", name: "Cancún International", city: "Cancún", country: "Mexico", lat: 21.0365, lng: -86.8771 },
  // Brazil
  { code: "GRU", name: "São Paulo/Guarulhos International", city: "São Paulo", country: "Brazil", lat: -23.4356, lng: -46.4731 },
  { code: "GIG", name: "Rio de Janeiro/Galeão International", city: "Rio de Janeiro", country: "Brazil", lat: -22.8099, lng: -43.2506 },
  // Argentina
  { code: "EZE", name: "Ministro Pistarini International", city: "Buenos Aires", country: "Argentina", lat: -34.8222, lng: -58.5358 },
  // South Africa
  { code: "JNB", name: "O.R. Tambo International", city: "Johannesburg", country: "South Africa", lat: -26.1392, lng: 28.246 },
  { code: "CPT", name: "Cape Town International", city: "Cape Town", country: "South Africa", lat: -33.9648, lng: 18.6017 },
  // Egypt
  { code: "CAI", name: "Cairo International", city: "Cairo", country: "Egypt", lat: 30.1219, lng: 31.4056 },
  // Qatar
  { code: "DOH", name: "Hamad International", city: "Doha", country: "Qatar", lat: 25.2731, lng: 51.608 },
  // Saudi Arabia
  { code: "RUH", name: "King Khalid International", city: "Riyadh", country: "Saudi Arabia", lat: 24.9576, lng: 46.6988 },
  { code: "JED", name: "King Abdulaziz International", city: "Jeddah", country: "Saudi Arabia", lat: 21.6796, lng: 39.1565 },
  // Thailand
  { code: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand", lat: 13.69, lng: 100.7501 },
  // Malaysia
  { code: "KUL", name: "Kuala Lumpur International", city: "Kuala Lumpur", country: "Malaysia", lat: 2.7456, lng: 101.7099 },
  // Indonesia
  { code: "CGK", name: "Soekarno-Hatta International", city: "Jakarta", country: "Indonesia", lat: -6.1256, lng: 106.6559 },
  // New Zealand
  { code: "AKL", name: "Auckland", city: "Auckland", country: "New Zealand", lat: -37.0082, lng: 174.785 },
  // Russia
  { code: "SVO", name: "Sheremetyevo International", city: "Moscow", country: "Russia", lat: 55.9726, lng: 37.4146 },
  // Poland
  { code: "WAW", name: "Warsaw Chopin", city: "Warsaw", country: "Poland", lat: 52.1657, lng: 20.9671 },
  // Sweden
  { code: "ARN", name: "Stockholm Arlanda", city: "Stockholm", country: "Sweden", lat: 59.6519, lng: 17.9186 },
  // Norway
  { code: "OSL", name: "Oslo Gardermoen", city: "Oslo", country: "Norway", lat: 60.1939, lng: 11.1004 },
  // Portugal
  { code: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "Portugal", lat: 38.7813, lng: -9.1359 },
  // Greece
  { code: "ATH", name: "Athens International", city: "Athens", country: "Greece", lat: 37.9364, lng: 23.9445 },
  // Ireland
  { code: "DUB", name: "Dublin", city: "Dublin", country: "Ireland", lat: 53.4264, lng: -6.2499 },
  // Belgium
  { code: "BRU", name: "Brussels", city: "Brussels", country: "Belgium", lat: 50.9014, lng: 4.4844 },
  // Austria
  { code: "VIE", name: "Vienna International", city: "Vienna", country: "Austria", lat: 48.1103, lng: 16.5697 },
  // Czech Republic
  { code: "PRG", name: "Václav Havel Airport Prague", city: "Prague", country: "Czech Republic", lat: 50.1008, lng: 14.26 },
  // Colombia
  { code: "BOG", name: "El Dorado International", city: "Bogotá", country: "Colombia", lat: 4.7016, lng: -74.1469 },
  // Chile
  { code: "SCL", name: "Arturo Merino Benítez International", city: "Santiago", country: "Chile", lat: -33.393, lng: -70.7858 },
  // Nigeria
  { code: "LOS", name: "Murtala Muhammed International", city: "Lagos", country: "Nigeria", lat: 6.5774, lng: 3.3212 },
  // Kenya
  { code: "NBO", name: "Jomo Kenyatta International", city: "Nairobi", country: "Kenya", lat: -1.3192, lng: 36.9278 },
  // Philippines
  { code: "MNL", name: "Ninoy Aquino International", city: "Manila", country: "Philippines", lat: 14.5086, lng: 121.0198 },
  // Vietnam
  { code: "SGN", name: "Tan Son Nhat International", city: "Ho Chi Minh City", country: "Vietnam", lat: 10.8188, lng: 106.6519 },
  // Taiwan
  { code: "TPE", name: "Taiwan Taoyuan International", city: "Taipei", country: "Taiwan", lat: 25.0797, lng: 121.2342 },
  // Hong Kong
  { code: "HKG", name: "Hong Kong International", city: "Hong Kong", country: "Hong Kong", lat: 22.308, lng: 113.9185 },
  // Israel
  { code: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "Israel", lat: 32.0114, lng: 34.8867 },
];

export interface CountryOption {
  name: string;
  airportCount: number;
}

export function getCountries(): CountryOption[] {
  const counts = new Map<string, number>();
  for (const airport of AIRPORTS) {
    counts.set(airport.country, (counts.get(airport.country) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, airportCount]) => ({ name, airportCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function searchAirports(country: string, query: string): Airport[] {
  const normalizedQuery = query.trim().toLowerCase();
  return AIRPORTS.filter((airport) => {
    if (country && airport.country !== country) return false;
    if (!normalizedQuery) return true;
    return (
      airport.code.toLowerCase().includes(normalizedQuery) ||
      airport.city.toLowerCase().includes(normalizedQuery) ||
      airport.name.toLowerCase().includes(normalizedQuery)
    );
  });
}

export function getAirportsByCountry(country: string): Airport[] {
  return AIRPORTS.filter((airport) => airport.country === country);
}
