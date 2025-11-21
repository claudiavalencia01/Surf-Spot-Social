function formatHourLabel(isoString) {
    if (!isoString) return "";
    let d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    let hours = d.getHours();
    let ampm = hours >= 12 ? "PM" : "AM";
    let h12 = hours % 12 || 12;
    return h12 + ampm;
}

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

    function renderMiniLineChart(container, series) {
        if (!container) return;
        container.textContent = "";

        if (!series || !series.length) {
            let msg = document.createElement("p");
            msg.className = "text-xs text-slate-400";
            msg.textContent = "No data for this period.";
            container.appendChild(msg);
            return;
        }

        let numericPoints = series.filter(p => p.value != null);
        if (!numericPoints.length) {
            let msg = document.createElement("p");
            msg.className = "text-xs text-slate-400";
            msg.textContent = "No data for this period.";
            container.appendChild(msg);
            return;
        }

        let values = numericPoints.map(p => p.value);
        let min = Math.min(...values);
        let max = Math.max(...values);
        let range = max - min || 1;

        let width = container.clientWidth || 400;
        let height = 120;

        let paddingLeft = 40;
        let paddingRight = 10;
        let paddingTop = 10;
        let paddingBottom = 24;

        let innerWidth = width - paddingLeft - paddingRight;
        let innerHeight = height - paddingTop - paddingBottom;

        let stepX = innerWidth / Math.max(1, series.length - 1);

        let points = [];
        for (let i = 0; i < series.length; i++) {
            let v = series[i].value;
            if (v == null) continue;

            let x = paddingLeft + i * stepX;
            let normalized = (v - min) / range;
            let y = paddingTop + (1 - normalized) * innerHeight;
            points.push(x + "," + y);
        }

        if (!points.length) {
            let msg = document.createElement("p");
            msg.className = "text-xs text-slate-400";
            msg.textContent = "No data for this period.";
            container.appendChild(msg);
            return;
        }

        let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", String(height));
        svg.setAttribute("viewBox", "0 0 " + width + " " + height);

        let polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "currentColor");
        polyline.setAttribute("stroke-width", "2");
        polyline.setAttribute("points", points.join(" "));
        svg.appendChild(polyline);

        let yMaxText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        yMaxText.setAttribute("x", "4");
        yMaxText.setAttribute("y", String(paddingTop + 4));
        yMaxText.setAttribute("font-size", "11");
        yMaxText.setAttribute("fill", "#94a3b8"); // slate-400-ish
        yMaxText.textContent = max.toFixed(1) + " ft";
        svg.appendChild(yMaxText);

        let yMinText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        yMinText.setAttribute("x", "4");
        yMinText.setAttribute("y", String(height - paddingBottom));
        yMinText.setAttribute("font-size", "11");
        yMinText.setAttribute("fill", "#94a3b8");
        yMinText.textContent = min.toFixed(1) + " ft";
        svg.appendChild(yMinText);

        let firstTime = series[0].time;
        let lastTime = series[series.length - 1].time;

        let leftX = paddingLeft;
        let midX = paddingLeft + innerWidth / 2;
        let rightX = paddingLeft + innerWidth;
        let xLabelY = height - 6;

        let xLeft = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xLeft.setAttribute("x", String(leftX));
        xLeft.setAttribute("y", String(xLabelY));
        xLeft.setAttribute("font-size", "11");
        xLeft.setAttribute("fill", "#94a3b8");
        xLeft.setAttribute("text-anchor", "middle");
        xLeft.textContent = formatHourLabel(firstTime);
        svg.appendChild(xLeft);

        let xCenter = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xCenter.setAttribute("x", String(midX));
        xCenter.setAttribute("y", String(xLabelY));
        xCenter.setAttribute("font-size", "11");
        xCenter.setAttribute("fill", "#94a3b8");
        xCenter.setAttribute("text-anchor", "middle");
        xCenter.textContent = "Now";
        svg.appendChild(xCenter);

        let xRight = document.createElementNS("http://www.w3.org/2000/svg", "text");
        xRight.setAttribute("x", String(rightX));
        xRight.setAttribute("y", String(xLabelY));
        xRight.setAttribute("font-size", "11");
        xRight.setAttribute("fill", "#94a3b8");
        xRight.setAttribute("text-anchor", "middle");
        xRight.textContent = formatHourLabel(lastTime);
        svg.appendChild(xRight);

        container.appendChild(svg);
    }


    window.wxUtils = {
        metersToFeet,
        degreesToCompassDirection,
        formatForecastDate,
        getCurrentHourIndex,
        createWeatherTile,
        createDirectionTile,
        renderMiniLineChart
    };
})();
