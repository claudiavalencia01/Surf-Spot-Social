// app/public/js/auth.js

async function loadAuthState() {
  const res = await fetch("/me");
  const { user } = await res.json();

  const el = document.getElementById("auth-section");
  if (!el) return;

  if (user) {
    el.innerHTML = `
      <a href="/profile.html" class="hover:underline">${user.username}</a>
      <button id="logout-btn" class="text-red-600 hover:underline">Logout</button>
    `;

    document.getElementById("logout-btn").onclick = async () => {
      await fetch("/logout", { method: "POST" });
      window.location.reload();
    };
  } else {
    el.innerHTML = `
      <a href="/login" class="hover:underline">Login</a>
      <a href="/register" class="hover:underline">Sign Up</a>
    `;
  }
}

loadAuthState();
