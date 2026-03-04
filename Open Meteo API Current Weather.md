# Open-Meteo API: current weather technical reference

**The endpoint is `https://api.open-meteo.com/v1/forecast`** — no API key needed. Pass latitude, longitude, and the `current` parameter to get real-time temperature and weather codes. The API is free for non-commercial use under 10,000 requests/day.

## Endpoint and required parameters

```
GET https://api.open-meteo.com/v1/forecast
```

| Parameter   | Type    | Required | Example                          |
|-------------|---------|----------|----------------------------------|
| `latitude`  | float   | ✅       | `52.52`                          |
| `longitude` | float   | ✅       | `13.41`                          |
| `current`   | string  | ✅*      | `temperature_2m,weather_code`    |

*Technically optional, but required to get current weather data rather than just hourly forecasts.

**Full example request:**
```
https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,weather_code
```

Useful optional parameters include **`temperature_unit`** (`celsius` | `fahrenheit`, default `celsius`), **`timezone`** (e.g. `auto`, `Europe/Berlin`, default `GMT`), and `timeformat` (`iso8601` | `unixtime`). Other available `current` variables include `relative_humidity_2m`, `apparent_temperature`, `is_day`, `precipitation`, `rain`, `snowfall`, `cloud_cover`, `wind_speed_10m`, `wind_direction_10m`, and `wind_gusts_10m`.

## Response JSON shape

```json
{
  "latitude": 52.52,
  "longitude": 13.419998,
  "elevation": 44.812,
  "generationtime_ms": 2.2119,
  "utc_offset_seconds": 0,
  "timezone": "GMT",
  "timezone_abbreviation": "GMT",
  "current_units": {
    "time": "iso8601",
    "interval": "seconds",
    "temperature_2m": "°C",
    "weather_code": "wmo code"
  },
  "current": {
    "time": "2024-09-10T09:15",
    "interval": 900,
    "temperature_2m": 28.9,
    "weather_code": 1
  }
}
```

The key fields: **`current.temperature_2m`** is a float in °C (or °F if changed), **`current.weather_code`** is an integer WMO code, and `current.time` is the observation timestamp. The `interval` field (`900` = 15 minutes) indicates the backward-looking window for aggregated values. The `latitude`/`longitude` in the response reflect the actual grid-cell center used, which may differ slightly from your input. Errors return HTTP 400 with `{"error": true, "reason": "..."}`.

## WMO weather code mapping

Open-Meteo returns a subset of WMO code table 4677. Here is the **complete set of codes the API can return**, mapped to simple descriptions:

| Code | WMO Description             | Simple Label     |
|------|-----------------------------|------------------|
| 0    | Clear sky                   | ☀️ Sunny / Clear  |
| 1    | Mainly clear                | 🌤 Mainly Sunny   |
| 2    | Partly cloudy               | ⛅ Partly Cloudy  |
| 3    | Overcast                    | ☁️ Cloudy         |
| 45   | Fog                         | 🌫 Fog            |
| 48   | Depositing rime fog         | 🌫 Rime Fog       |
| 51   | Drizzle (light)             | 🌦 Light Drizzle  |
| 53   | Drizzle (moderate)          | 🌦 Drizzle        |
| 55   | Drizzle (dense)             | 🌧 Heavy Drizzle  |
| 56   | Freezing drizzle (light)    | 🌧 Freezing Drizzle |
| 57   | Freezing drizzle (dense)    | 🌧 Freezing Drizzle |
| 61   | Rain (slight)               | 🌦 Light Rain     |
| 63   | Rain (moderate)             | 🌧 Rain           |
| 65   | Rain (heavy)                | 🌧 Heavy Rain     |
| 66   | Freezing rain (light)       | 🌧 Freezing Rain  |
| 67   | Freezing rain (heavy)       | 🌧 Freezing Rain  |
| 71   | Snowfall (slight)           | 🌨 Light Snow     |
| 73   | Snowfall (moderate)         | 🌨 Snow           |
| 75   | Snowfall (heavy)            | ❄️ Heavy Snow     |
| 77   | Snow grains                 | ❄️ Snow Grains    |
| 80   | Rain showers (slight)       | 🌦 Light Showers  |
| 81   | Rain showers (moderate)     | 🌧 Showers        |
| 82   | Rain showers (violent)      | 🌧 Heavy Showers  |
| 85   | Snow showers (slight)       | 🌨 Light Snow Showers |
| 86   | Snow showers (heavy)        | 🌨 Snow Showers   |
| 95   | Thunderstorm                | ⛈ Thunderstorm   |
| 96   | Thunderstorm w/ slight hail | ⛈ Thunderstorm + Hail |
| 99   | Thunderstorm w/ heavy hail  | ⛈ Thunderstorm + Hail |

**Codes 96 and 99** are only returned for Central Europe; all other regions cap thunderstorms at code 95.

## Ready-to-use code mapping

Here's a copy-paste-ready JS/TS object for translating codes into simple labels:

```js
const WMO_CODES = {
  0: "Sunny",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Light Showers",
  81: "Showers",
  82: "Heavy Showers",
  85: "Light Snow Showers",
  86: "Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm with Hail",
  99: "Thunderstorm with Hail",
};
```

Use the **`is_day`** current variable (add it to `&current=temperature_2m,weather_code,is_day`) to differentiate day/night labels — `is_day` returns `1` during daytime and `0` at night, so you can swap "Sunny" → "Clear" for code 0 at night.

## Conclusion

The Open-Meteo forecast endpoint gives you current weather with zero auth overhead — just `latitude`, `longitude`, and `current=temperature_2m,weather_code`. The response nests everything under a `current` object with matching `current_units`. The 28 possible WMO codes map cleanly into about a dozen user-friendly categories. Adding `is_day` to the request lets you handle day/night display variants without any external sun-position calculations.