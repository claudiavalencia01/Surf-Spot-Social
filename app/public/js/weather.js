// app/public/js/weather.js

async function getWeather(lat, lon) {
  try {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    console.log("Marine weather data:", data);

    // Show data on page if element exists
    const info = document.getElementById("weather-info");
    if (info && data.hourly) {
      info.innerHTML = `
        <h3>Weather at (${lat}, ${lon})</h3>
        <p><b>Wave Height:</b> ${data.hourly.wave_height?.[0] ?? "N/A"} m</p>
        <p><b>Wave Period:</b> ${data.hourly.wave_period?.[0] ?? "N/A"} s</p>
        <p><b>Sea Temp:</b> ${data.hourly.sea_surface_temperature?.[0] ?? "N/A"} °C</p>
        <p><b>Wind Speed:</b> ${data.hourly.wind_speed_10m?.[0] ?? "N/A"} m/s</p>
      `;
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
}

// Example: Santa Cruz coordinates
getWeather(36.97, -122.03);
