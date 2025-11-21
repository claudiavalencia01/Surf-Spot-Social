(function() {
    function metersToFeet(meters) { 
        if (meters == null) return null;
        return Math.round(meters * 3.28084 * 10) / 10;
    }

    function degreesToCompassDirection(degrees) {
        if (degrees == null && degrees !== 0) {
            return null;
        }
        let compassDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
        let directionIndex = Math.round((degrees % 360) / 22.5) % 16;
        return compassDirections[directionIndex];
    }

    function formatForecastDate(isoDate) {
        let date = new Date(isoDate + "T00:00:00");
        let weekday = date.toLocaleDateString("en-US", { weekday: "short" });
        let month = date.toLocaleDateString("en-US", { month: "short" });
        let day = date.getDate();
        return `${weekday}, ${month} ${day}`;
    }

    function getCurrentHourIndex(hourList) {
        if (!hourList || !hourList.length) {
            return 0;
        }
    let currentHour = new Date().getHours();
    return currentHour < hourList.length ? currentHour : hourList.length - 1;
    }

    function createWeatherTile(labelText, valueText) {
        let container = document.createElement("div");
        let labelElement = document.createElement("div");
        let valueElement = document.createElement("div");

        labelElement.className = "text-sm font-semibold text-slate-700";
        valueElement.className = "mt-1 text-base";

        labelElement.textContent = labelText;
        valueElement.textContent = valueText;

        container.appendChild(labelElement);
        container.appendChild(valueElement);
        return container;
    }

    function createDirectionTile(label, degrees, compassLabel) {
        let card = document.createElement("div");
        card.className = "rounded-xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between";

        let text = document.createElement("div");

        // Label
        let labelElement = document.createElement("p");
        labelElement.className = "text-xs uppercase tracking-wide text-slate-400";
        labelElement.textContent = label;
        text.appendChild(labelElement);

        // Compass direction
        let compass = document.createElement("p");
        compass.className = "text-sm font-semibold text-slate-800";
        compass.textContent = compassLabel || "—";
        text.appendChild(compass);

        // Degrees value
        let degreesElement = document.createElement("p");
        degreesElement.className = "text-xs text-slate-400";
        degreesElement.textContent = degrees != null ? degrees.toFixed(0) + "°" : "";
        text.appendChild(degreesElement);

        // Arrow container and arrow symbol
        let arrow = document.createElement("div");
        arrow.className = "w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center";

        let arrowSymbol = document.createElement("span");
        arrowSymbol.className = "block text-xl";
        arrowSymbol.textContent = "↑";
        arrow.appendChild(arrowSymbol);

        if (degrees != null) {
            arrow.style.transform = `rotate(${degrees}deg)`;
        }

        card.appendChild(text);
        card.appendChild(arrow);

        return card;
    }
    window.wxUtils = {
        metersToFeet,
        degreesToCompassDirection,
        formatForecastDate,
        getCurrentHourIndex,
        createWeatherTile,
        createDirectionTile
    };
})();
