// public/js/spot.js
(async function () {
    const id = window.location.pathname.split("/").pop();
    const res = await fetch(`/api/spots/${id}`);
    if (!res.ok) {
      document.getElementById("spot").innerHTML = "<p>Spot not found.</p>";
      return;
    }
    const { spot, weather } = await res.json();
  
    document.getElementById("spot").innerHTML = `
      <h1 class="text-3xl font-bold">${spot.name}</h1>
      <p class="text-slate-600 mt-2">${spot.description ?? ""}</p>
      <div class="grid grid-cols-2 gap-4 mt-6">
        <div class="bg-white border rounded-xl p-4">
          <h2 class="font-semibold mb-2">Location</h2>
          <p>${spot.region ?? ""} ${spot.country ?? ""}</p>
          <p class="text-sm text-slate-500">
            ${Number(spot.latitude).toFixed(4)}, ${Number(spot.longitude).toFixed(4)}
          </p>
        </div>
        <div class="bg-white border rounded-xl p-4">
          <h2 class="font-semibold mb-2">Current Marine Snapshot</h2>
          <p class="text-sm text-slate-600">
            Wave height: ${weather?.hourly?.wave_height?.[0] ?? "—"} m<br/>
            Wind: ${weather?.hourly?.wind_speed_10m?.[0] ?? "—"} m/s
            @ ${weather?.hourly?.wind_direction_10m?.[0] ?? "—"}°
          </p>
        </div>
      </div>
    `;
  
    // Mini map
    const mini = L.map("mini-map", { zoomControl: false }).setView(
      [spot.latitude, spot.longitude],
      12
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mini);
    L.marker([spot.latitude, spot.longitude]).addTo(mini).bindPopup(spot.name);
  })();
  