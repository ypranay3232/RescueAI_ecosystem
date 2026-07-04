// Weather data integration using Open-Meteo API (free, no API key required)

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  weatherCode: number;
  humidity: number;
  isDay: number;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
  solarNoon: string;
  dayLength: number; // in hours
}

export interface WeatherForecast {
  current: WeatherData;
  hourly: {
    time: string[];
    temperature: number[];
    windSpeed: number[];
    windDirection: number[];
    weatherCode: number[];
  };
  daily?: {
    sunrise: string[];
    sunset: string[];
  };
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&timezone=auto`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.current) {
      return null;
    }

    return {
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      visibility: 10, // Open-Meteo doesn't provide visibility in free tier, default to 10km
      weatherCode: data.current.weather_code,
      humidity: data.current.relative_humidity_2m,
      isDay: data.current.is_day,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

export async function fetchWeatherForecast(lat: number, lng: number): Promise<WeatherForecast | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&hourly=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&timezone=auto&forecast_hours=24`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Weather forecast API error:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    if (!data.current || !data.hourly) {
      return null;
    }

    return {
      current: {
        temperature: data.current.temperature_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        visibility: 10,
        weatherCode: data.current.weather_code,
        humidity: data.current.relative_humidity_2m,
        isDay: data.current.is_day,
      },
      hourly: {
        time: data.hourly.time,
        temperature: data.hourly.temperature_2m,
        windSpeed: data.hourly.wind_speed_10m,
        windDirection: data.hourly.wind_direction_10m,
        weatherCode: data.hourly.weather_code,
      },
      daily: data.daily ? {
        sunrise: data.daily.sunrise,
        sunset: data.daily.sunset,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    return null;
  }
}

export function getSunTimes(forecast: WeatherForecast): SunTimes | null {
  if (!forecast.daily || !forecast.daily.sunrise || !forecast.daily.sunset) {
    return null;
  }

  const sunrise = new Date(forecast.daily.sunrise[0]);
  const sunset = new Date(forecast.daily.sunset[0]);
  const dayLengthMs = sunset.getTime() - sunrise.getTime();
  const dayLengthHours = dayLengthMs / (1000 * 60 * 60);

  return {
    sunrise: sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sunset: sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    solarNoon: new Date(sunrise.getTime() + dayLengthMs / 2).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    dayLength: dayLengthHours,
  };
}

export function getWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow',
    73: 'Moderate snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  
  return weatherCodes[code] || 'Unknown';
}

export function getWeatherIcon(code: number, isDay: number): string {
  if (code === 0) return isDay ? '☀️' : '🌙';
  if (code <= 3) return isDay ? '⛅' : '☁️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code <= 99) return '⛈️';
  return '🌡️';
}
