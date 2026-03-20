import { useState, useEffect } from "react";
import { todayStr } from "../utils/dates";
import { theme } from "../styles/theme";

const WMO = {
  0: "☀️ Sunny",
  1: "🌤 Mainly Clear",
  2: "⛅ Partly Cloudy",
  3: "☁️ Cloudy",
  45: "🌫 Fog",
  48: "🌫 Fog",
  51: "🌦 Light Drizzle",
  53: "🌦 Drizzle",
  55: "🌧 Heavy Drizzle",
  61: "🌦 Light Rain",
  63: "🌧 Rain",
  65: "🌧 Heavy Rain",
  71: "🌨 Light Snow",
  73: "🌨 Snow",
  75: "❄️ Heavy Snow",
  80: "🌦 Showers",
  81: "🌧 Showers",
  82: "🌧 Heavy Showers",
  95: "⛈ Thunderstorm",
  96: "⛈ Thunderstorm",
  99: "⛈ Thunderstorm",
};

export function DayHeader({ streak, lastActive, tempUnit = "F", locationOverride = null }) {
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState(null);

  useEffect(() => {
    const fetchWeatherForCoords = (latitude, longitude) => {
      return fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
      )
        .then((res) => res.json())
        .then((data) => {
          const temp = Math.round(data.current.temperature_2m);
          const code = data.current.weather_code;
          const label = WMO[code] || "—";
          const [emoji] = label.split(" ");
          setWeather({ temp, label, emoji });
        });
    };

    const query = typeof locationOverride === "string" ? locationOverride.trim() : "";

    if (query) {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`)
        .then((res) => res.json())
        .then((data) => {
          const firstResult = data?.results?.[0];
          if (!firstResult) throw new Error("No geocoding result");
          const normalizedLocation = [firstResult.name, firstResult.admin1 || firstResult.country].filter(Boolean).join(", ");
          setLocation(normalizedLocation || query);
          return fetchWeatherForCoords(firstResult.latitude, firstResult.longitude);
        })
        .catch(() => {
          setLocation(query);
          setWeather(null);
        });
      return;
    }

    // Use ipapi.co — HTTPS, no API key, works from browser
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error("IP geolocation failed");
        const { latitude, longitude, city, region, country_name } = data;
        const normalizedLocation = [city, region || country_name].filter(Boolean).join(", ");
        setLocation(normalizedLocation || "Current location");
        return fetchWeatherForCoords(latitude, longitude);
      })
      .catch(() => {
        // Silently fail, just don't show weather
        setWeather(null);
      });
  }, [locationOverride]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: theme.fonts.ui,
      }}
    >
      <div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: theme.colors.muted, fontWeight: 400, fontSize: 24 }}>
            Today is{" "}
          </span>
          <span style={{ color: theme.colors.text, fontWeight: 800, fontSize: 24 }}>
            {dateStr}
          </span>
        </div>
        {weather && (
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.text, fontFamily: theme.fonts.ui }}>
            <span style={{ fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif" }}>{weather.emoji}</span>{" "}
            {tempUnit === "C" ? Math.round((weather.temp - 32) * (5 / 9)) : weather.temp}°{tempUnit}{" "}
            {location && (
              <span style={{ color: theme.colors.muted, fontWeight: 400 }}>
                in {location}
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 15,
              background: streak > 0 ? theme.gradients.streak(theme.colors.streakGradientStart, theme.colors.streakGradientEnd) : theme.colors.subtle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: streak > 0 ? theme.shadows.streak : "none",
              flexShrink: 0,
            }}
        >
          🔥
        </div>
        <div>
          <div
              style={{
              fontSize: 22,
              fontWeight: 800,
              color: streak > 0 ? theme.colors.accent : theme.colors.muted,
              lineHeight: 1,
            }}
          >
            {streak}
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#9ca3af",
                marginLeft: 6,
              }}
            >
              day streak
            </span>
          </div>
          {lastActive === todayStr() && (
            <div
              style={{
                fontSize: 12,
                color: "#9ca3af",
                marginTop: 3,
              }}
            >
              ✓ Checked in today
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
