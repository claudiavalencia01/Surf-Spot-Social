// public/js/map.js
(async function () {
  // 1. Init map
  const map = L.map("map").setView([35.4, -75.6], 3); // world-ish view

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap & contributors, © CARTO",
  }).addTo(map);

  // Layer group so we can clear/re-render markers
  const markersLayer = L.layerGroup().addTo(map);
  const userLayer = L.layerGroup().addTo(map);
  let allSpots = [];

  const visibleCountEl = document.getElementById("visible-spot-count");
  const totalCountEl = document.getElementById("total-spot-count");
  const locationStatusEl = document.getElementById("user-location-status");

  // 2. Fix map sizing when switching tabs or resizing window
  const fixMapSize = () => map.invalidateSize(true);
  requestAnimationFrame(fixMapSize);
  setTimeout(fixMapSize, 250);

  document.addEventListener("tab:shown", (e) => {
    if (e.detail?.tab === "map") fixMapSize();
  });
  window.addEventListener("resize", fixMapSize);

  const mapWrapper = document.querySelector(".map-wrapper");
  if (mapWrapper && window.ResizeObserver) {
    const observer = new ResizeObserver(() => fixMapSize());
    observer.observe(mapWrapper);
  }

  function updateVisibleCount(count) {
    if (visibleCountEl) visibleCountEl.textContent = count;
  }

  function updateTotalCount(count) {
    if (totalCountEl) totalCountEl.textContent = count;
  }

  function updateLocationStatus(message) {
    if (locationStatusEl) locationStatusEl.textContent = message;
  }

  // 3. Try to center map on user's current location
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 8);

        userLayer.clearLayers();
        const accuracy = Math.min(Math.max(pos.coords.accuracy || 4000, 500), 20000);
        L.circle([latitude, longitude], {
          radius: accuracy,
          color: "#0ea5e9",
          weight: 1,
          fillOpacity: 0.08,
          fillColor: "#38bdf8",
        }).addTo(userLayer);

        L.circleMarker([latitude, longitude], {
          radius: 8,
          color: "#0ea5e9",
          weight: 2,
          fillColor: "#0284c7",
          fillOpacity: 0.9,
        })
          .addTo(userLayer)
          .bindPopup("You're here")
          .openPopup();

        updateLocationStatus(
          `Locked near ${latitude.toFixed(2)}, ${longitude.toFixed(2)} (zoomed to your coast)`
        );
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        // keep default if denied/fails
        updateLocationStatus("We couldn't access your location — use the search above to explore.");
      }
    );
  } else {
    updateLocationStatus("Location unavailable on this device. Use the search bar to explore.");
  }

  // ---- Helpers for editing & deleting ----
  async function editSpot(s) {
    const newName = prompt("New beach name:", s.name);
    if (!newName) return;

    const newDesc = prompt("New description:", s.description || "") || "";

    try {
      const res = await fetch(`/api/spots/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          description: newDesc,
          latitude: s.latitude,
          longitude: s.longitude,
          country: s.country,
          region: s.region,
        }),
      });

      if (!res.ok) {
        alert("Failed to update spot");
        return;
      }

      const updated = await res.json();
      // update local cache
      allSpots = allSpots.map((spot) =>
        spot.id === updated.id ? updated : spot
      );
      alert("Spot updated!");
      // re-render WITHOUT moving map
      renderSpots(filteredFromSearch(), { fit: false });
    } catch (err) {
      console.error("editSpot error:", err);
      alert("Network error while updating");
    }
  }

  async function deleteSpot(s) {
    if (!confirm(`Delete ${s.name}?`)) return;

    try {
      const res = await fetch(`/api/spots/${s.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete spot");
        return;
      }

      // remove from local cache
      allSpots = allSpots.filter((spot) => spot.id !== s.id);
      alert("Spot deleted");
      // re-render WITHOUT moving map
      renderSpots(filteredFromSearch(), { fit: false });
    } catch (err) {
      console.error("deleteSpot error:", err);
      alert("Network error while deleting");
    }
  }

  // 4. Helper: add ONE marker for a surf spot
  function addSpotMarker(s) {
    const lat = Number(s.latitude);
    const lon = Number(s.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const isUserSpot = s.source === "user";
    const editId = `edit-${s.id}`;
    const deleteId = `delete-${s.id}`;

    const popupHtml = `
      <div style="min-width:160px">
        <strong>${s.name}</strong><br/>
        ${s.region ?? ""} ${s.country ?? ""}
        <div style="margin-top:6px">
          <a href="/spots/${s.id}">Open beach page →</a>
        </div>
        ${
          isUserSpot
            ? `
          <button id="${editId}" style="margin-top:6px; display:block; color:blue;">
            Edit
          </button>
          <button id="${deleteId}" style="margin-top:4px; display:block; color:red;">
            Delete
          </button>
        `
            : ""
        }
      </div>
    `;

    const marker = L.marker([lat, lon]).addTo(markersLayer);
    marker.bindPopup(popupHtml);

    marker.on("popupopen", () => {
      if (!isUserSpot) return;
      const editBtn = document.getElementById(editId);
      const deleteBtn = document.getElementById(deleteId);
      if (editBtn) editBtn.onclick = () => editSpot(s);
      if (deleteBtn) deleteBtn.onclick = () => deleteSpot(s);
    });
  }

  // 5. Render a list of spots = clear markers
  //    Optionally fit map to them (fit=true only when we explicitly want it)
  function renderSpots(spots, { fit = true } = {}) {
    markersLayer.clearLayers();
    const bounds = [];

    for (const s of spots) {
      addSpotMarker(s);
      const lat = Number(s.latitude);
      const lon = Number(s.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        bounds.push([lat, lon]);
      }
    }

    updateVisibleCount(spots.length);

    if (fit && bounds.length) {
      map.fitBounds(bounds, { padding: [20, 20] });
      fixMapSize();
    }
  }

  // Helper: apply current search text to allSpots
  function filteredFromSearch() {
    const input = document.getElementById("spot-search");
    if (!input) return allSpots;
  
    const q = input.value.trim().toLowerCase();
    if (!q) return allSpots;
  
    const matches = allSpots.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const region = (s.region || "").toLowerCase();
      const country = (s.country || "").toLowerCase();
      return (
        name.includes(q) ||
        region.includes(q) ||
        country.includes(q)
      );
    });
  
    // If no existing spot matches the text,
    // don't hide everything — just show all pins.
    return matches.length ? matches : allSpots;
  }
  

  // 6. Geocode & fly (no marker) on Enter
  async function geocodeAndFly(query) {
    if (!query) return;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&limit=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Geocoding failed");

      const results = await res.json();
      if (!results.length) {
        alert("Location not found");
        return;
      }

      const place = results[0];
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);

      // just pan/zoom, no marker
      map.setView([lat, lon], 9);
    } catch (err) {
      console.error("Geocoding error:", err);
      alert("Could not find that place.");
    }
  }

  // 7. Load existing spots and drop pins (WITH fit on first load)
  try {
    const res = await window.fetch("/api/spots");
    if (!res.ok) throw new Error(`Failed to load spots: ${res.status}`);

    const spots = await res.json();
    allSpots = spots;
    updateTotalCount(spots.length);
    updateVisibleCount(spots.length);
    renderSpots(allSpots, { fit: true }); // only time we auto-fit all markers
  } catch (err) {
    console.error("Error loading spots:", err);
    updateLocationStatus("Unable to load surf spots right now.");
  }

  // 8. Search bar: filter spots live as you type, NO map movement
  const searchInput = document.getElementById("spot-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const filtered = filteredFromSearch();
      renderSpots(filtered, { fit: false }); // don't change map view
    });

    // Enter key → global geocode + fly (still no pin)
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) geocodeAndFly(q);
      }
    });
  }

  // 9. Allow users to click the map to add a new spot
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
        let msg = `Failed to save spot (status ${res.status})`;
        try {
          const err = await res.json();
          if (err.message) msg = `Failed to save spot: ${err.message}`;
        } catch (_) {}
        alert(msg);
        return;
      }

      const saved = await res.json();
      // Add to local cache
      allSpots.push(saved);
      // Re-render according to current search, but don't move map
      const filtered = filteredFromSearch();
      renderSpots(filtered, { fit: false });
    } catch (err) {
      console.error("Error adding new spot:", err);
      alert("Network error while saving spot");
    }
  });
})();
