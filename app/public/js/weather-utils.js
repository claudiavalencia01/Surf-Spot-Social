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

    window.wxUtils = {
        metersToFeet,
        degreesToCompassDirection,
        formatForecastDate,
        getCurrentHourIndex,
        createWeatherTile
    };
})();
