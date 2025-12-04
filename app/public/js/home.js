// app/public/js/home.js

document.addEventListener("DOMContentLoaded", () => {
    const nearbyContainer = document.getElementById("nearby-spots");
    const subtitleEl = document.getElementById("nearby-subtitle");
    const errorEl = document.getElementById("nearby-error");
  
    // If we're not on the home tab markup for some reason, bail
    if (!nearbyContainer || !subtitleEl || !errorEl) return;
  
    if (!("geolocation" in navigator)) {
      subtitleEl.textContent = "Your browser doesn't support location.";
      errorEl.textContent = "Try using a different browser or device.";
      errorEl.classList.remove("hidden");
      return;
    }
  
    subtitleEl.textContent = "Finding spots near you…";
  
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
  
        try {
          const resp = await fetch(
            `/api/spots/near?lat=${latitude}&lng=${longitude}&limit=6`
          );
  
          if (!resp.ok) {
            throw new Error(`Server responded with ${resp.status}`);
          }
  
          const spots = await resp.json();
  
          if (!Array.isArray(spots) || spots.length === 0) {
            subtitleEl.textContent = "No surf spots found near you yet.";
            return;
          }
  
          subtitleEl.textContent = `Here are ${spots.length} surf spots close to you:`;
          errorEl.classList.add("hidden");
          nearbyContainer.innerHTML = "";
  
          spots.forEach((spot) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className =
              "text-left bg-white/90 rounded-2xl border border-sky-100 p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-sky-300 transition";
  
            const locationLabel = spot.region || spot.country || "Nearby surf spot";
            const description =
              spot.description && spot.description.length > 80
                ? spot.description.slice(0, 77) + "…"
                : spot.description || "";
  
            card.innerHTML = `
              <p class="text-sm text-slate-500">${locationLabel}</p>
              <p class="font-semibold">${spot.name}</p>
              ${
                description
                  ? `<p class="text-xs mt-2 text-slate-500">${description}</p>`
                  : ""
              }
            `;
  
            card.addEventListener("click", () => {
              window.location.href = `/spot.html?id=${spot.id}`;
            });
  
            nearbyContainer.appendChild(card);
          });
        } catch (err) {
          console.error("Error loading nearby spots:", err);
          subtitleEl.textContent = "We couldn't load nearby surf spots.";
          errorEl.textContent = "Please try again in a moment.";
          errorEl.classList.remove("hidden");
        }
      },
      (geoErr) => {
        console.warn("Geolocation error:", geoErr);
        subtitleEl.textContent = "We couldn't access your location.";
        errorEl.textContent =
          "To see surf spots near you, allow location access in your browser settings and refresh.";
        errorEl.classList.remove("hidden");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 10 * 60 * 1000, // 10 minutes
      }
    );
  });
  
