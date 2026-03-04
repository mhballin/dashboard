import { useState, useEffect } from "react";

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
    if (locationOverride) {
      setLocation(locationOverride);
      return;
    }
    // Fetch location from IP address using ip-api.com (supports CORS)
    fetch("http://ip-api.com/json/")
      .then((res) => res.json())
      .then((data) => {
        const { lat, lon, city, regionName } = data;
        setLocation(`${city}, ${regionName}`);
        return fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
        );
      })
      .then((res) => res.json())
      .then((data) => {
        const temp = Math.round(data.current.temperature_2m);
        const code = data.current.weather_code;
        const label = WMO[code] || "—";
        const [emoji] = label.split(" ");
        setWeather({ temp, label, emoji });
      })
      .catch(() => {
        // Silently fail, just don't show weather
      });
  }, [locationOverride]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 24 }}>
            Today is{" "}
          </span>
          <span style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 24 }}>
            {dateStr}
          </span>
        </div>
        {weather && (
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
            {weather.emoji} {tempUnit === "C" ? Math.round((weather.temp - 32) * (5 / 9)) : weather.temp}°{tempUnit}{" "}
            {location && (
              <span style={{ color: "#9ca3af", fontWeight: 400 }}>
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
            background: streak > 0 ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            boxShadow: streak > 0 ? "0 2px 10px rgba(245,158,11,0.3)" : "none",
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
              color: streak > 0 ? "#d97706" : "#9ca3af",
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
          {lastActive === todayStr && (
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
