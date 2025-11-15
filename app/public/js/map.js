// public/js/map.js
(async function () {
  const map = L.map("map").setView([35.4, -75.6], 6);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  // Fix map sizing when switching tabs or resizing
  const fixMapSize = () => map.invalidateSize(true);
  requestAnimationFrame(fixMapSize);
  setTimeout(fixMapSize, 250);
  document.addEventListener("tab:shown", (e) => {
    if (e.detail?.tab === "map") fixMapSize();
  });
  window.addEventListener("resize", fixMapSize);

  // Helper to add a marker for a surf spot
  function addSpotMarker(s) {
    const lat = Number(s.latitude), lon = Number(s.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const m = L.marker([lat, lon]).addTo(map);
    m.bindPopup(
      `<div style="min-width:160px">
         <strong>${s.name}</strong><br/>
         ${s.region ?? ""} ${s.country ?? ""}
         <div style="margin-top:6px">
           <a href="/spots/${s.id}">Open beach page →</a>
         </div>
       </div>`
    );
    m.on("click", () => (window.location.href = `/spots/${s.id}`));
  }

  // Load existing surf spots from the backend
  try {
    const res = await window.fetch("/api/spots");
    if (!res.ok) throw new Error(`Failed to load spots: ${res.status}`);
    const spots = await res.json();
    console.log("spots:", spots.length, spots[0]);

    const bounds = [];
    for (const s of spots) {
      addSpotMarker(s);
      bounds.push([Number(s.latitude), Number(s.longitude)]);
    }

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [20, 20] });
      fixMapSize();
    }
  } catch (err) {
    console.error(err);
  }

  // 🟢 Allow users to click on the map to add new surf spots
  map.on("click", async (e) => {
    const { lat, lng } = e.latlng;

    const name = prompt("Beach name?");
    if (!name) return;

    const description = prompt("Any tips/notes? (optional)") || "";

    try {
      const res = await fetch("/api/spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          latitude: lat,
          longitude: lng,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert("Failed to save spot: " + (err.message || res.status));
        return;
      }

      const saved = await res.json();
      addSpotMarker(saved);
      map.setView([lat, lng], 9);
    } catch (err) {
      console.error("Error adding new spot:", err);
      alert("Network error while saving spot");
    }
  });
})();
