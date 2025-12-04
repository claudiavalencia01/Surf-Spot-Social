// public/js/tabs.js
document.addEventListener("DOMContentLoaded", () => {
  const tabLinks = document.querySelectorAll(".tab-link");
  const tabPanels = document.querySelectorAll(".tab-panel");

  function activateTab(tabName, push = true) {
    // show / hide panels
    tabPanels.forEach(panel => {
      if (panel.id === "tab-" + tabName) panel.classList.remove("hidden");
      else panel.classList.add("hidden");
    });

    // active styles on tabs
    tabLinks.forEach(link => {
      if (link.dataset.tab === tabName) {
        link.classList.add("text-sky-700", "border-sky-500", "font-semibold");
        link.classList.remove("text-slate-500");
      } else {
        link.classList.remove("text-sky-700", "border-sky-500", "font-semibold");
        link.classList.add("text-slate-500");
      }
    });

    // update URL (optional)
    if (push) {
      const url = new URL(window.location);
      url.searchParams.set("tab", tabName);
      window.history.pushState({ tab: tabName }, "", url);
    }

    // 🔔 tell listeners (Leaflet) which tab is now visible
    document.dispatchEvent(new CustomEvent("tab:shown", { detail: { tab: tabName } }));
  }

  // click handling
  tabLinks.forEach(link => {
    link.addEventListener("click", () => activateTab(link.dataset.tab));
  });

  // initial tab (e.g., ?tab=map)
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get("tab") || "home";
  activateTab(initialTab, false);

  // browser back/forward
  window.addEventListener("popstate", (evt) => {
    const tabName = evt.state?.tab || "home";
    activateTab(tabName, false);
  });

  // programmatic open (optional)
  window.addEventListener("openTab", (e) => activateTab(e.detail));
});
