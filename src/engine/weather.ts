// Получает текущую погоду через open-meteo.com (бесплатно, без ключа)
// и возвращает короткую строку для системного промпта.

interface Coords { lat: number; lon: number; }

const TZ_COORDS: Record<string, Coords> = {
  "Europe/Kaliningrad":   { lat: 54.71, lon: 20.51 },
  "Europe/Moscow":        { lat: 55.75, lon: 37.62 },
  "Europe/Samara":        { lat: 53.20, lon: 50.15 },
  "Asia/Yekaterinburg":   { lat: 56.84, lon: 60.61 },
  "Asia/Omsk":            { lat: 54.99, lon: 73.37 },
  "Asia/Novosibirsk":     { lat: 55.03, lon: 82.92 },
  "Asia/Irkutsk":         { lat: 52.29, lon: 104.28 },
  "Asia/Yakutsk":         { lat: 62.03, lon: 129.73 },
  "Asia/Vladivostok":     { lat: 43.11, lon: 131.87 },
  "Asia/Magadan":         { lat: 59.56, lon: 150.81 },
  "Asia/Kamchatka":       { lat: 53.01, lon: 158.65 },
  "Europe/Kyiv":          { lat: 50.45, lon: 30.52 },
  "Europe/Minsk":         { lat: 53.90, lon: 27.57 },
  "Asia/Almaty":          { lat: 43.26, lon: 76.95 },
  "Asia/Tashkent":        { lat: 41.30, lon: 69.24 },
  "Asia/Bishkek":         { lat: 42.87, lon: 74.59 },
  "Asia/Tbilisi":         { lat: 41.69, lon: 44.83 },
  "Asia/Yerevan":         { lat: 40.18, lon: 44.51 },
  "Asia/Baku":            { lat: 40.41, lon: 49.87 },
};

// WMO weather code → короткое описание на русском
function describeCode(code: number): string {
  if (code === 0) return "ясно";
  if (code <= 2) return "переменная облачность";
  if (code === 3) return "пасмурно";
  if (code <= 49) return "туман";
  if (code <= 57) return "морось";
  if (code <= 67) return "дождь";
  if (code <= 77) return "снег";
  if (code <= 82) return "ливень";
  if (code <= 86) return "снегопад";
  if (code <= 99) return "гроза";
  return "переменная облачность";
}

interface WeatherCache { text: string; ts: number; }
const cache = new Map<string, WeatherCache>();
const CACHE_TTL = 60 * 60 * 1000; // 1 час

export async function getWeatherContext(tz: string): Promise<string> {
  const cached = cache.get(tz);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.text;

  const coords = TZ_COORDS[tz];
  if (!coords) return "";

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto&forecast_days=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "";
    const data = await res.json() as any;
    const cur = data?.current;
    if (!cur) return "";

    const temp = Math.round(cur.temperature_2m ?? 0);
    const desc = describeCode(cur.weather_code ?? 0);
    const wind = Math.round(cur.wind_speed_10m ?? 0);
    const hum = Math.round(cur.relative_humidity_2m ?? 0);

    const text = `Погода у неё сейчас: ${temp > 0 ? "+" : ""}${temp}°C, ${desc}, ветер ${wind} м/с, влажность ${hum}%. Это влияет на настроение и активность (дождь/холод = дома, тепло/солнце = может гулять).`;
    cache.set(tz, { text, ts: Date.now() });
    return text;
  } catch {
    return "";
  }
}
