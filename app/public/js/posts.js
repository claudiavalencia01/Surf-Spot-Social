// Require login before showing POSTS tab
async function requireLogin() {
  try {
    const res = await fetch("/me");
    const { user } = await res.json();
    if (!user) {
      alert("Please log in to view and interact with posts.");
      window.location.href = "/login.html";
    }
  } catch (err) {
    console.error("Auth check failed:", err);
    window.location.href = "/login.html";
  }
}

// Run this when POSTS tab is opened
document.addEventListener("tab:shown", (e) => {
  if (e.detail?.tab === "posts") {
    requireLogin();
  }
});
