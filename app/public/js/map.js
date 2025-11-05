// public/js/map.js
(async function () {
    const map = L.map("map").setView([35.4, -75.6], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
  
    const fixMapSize = () => map.invalidateSize(true);
    requestAnimationFrame(fixMapSize);
    setTimeout(fixMapSize, 250);
    document.addEventListener("tab:shown", (e) => {
      if (e.detail?.tab === "map") fixMapSize();
    });
    window.addEventListener("resize", fixMapSize);
  
    try {
      const res = await window.fetch("/api/spots");   // ← use window.fetch
      if (!res.ok) throw new Error(`Failed to load spots: ${res.status}`);
      const spots = await res.json();
      console.log("spots:", spots.length, spots[0]);
  
      const bounds = [];
      for (const s of spots) {
        const lat = Number(s.latitude), lon = Number(s.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  
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
        bounds.push([lat, lon]);
      }
      if (bounds.length) { map.fitBounds(bounds, { padding: [20, 20] }); fixMapSize(); }
    } catch (err) {
      console.error(err);
    }
  })();
  