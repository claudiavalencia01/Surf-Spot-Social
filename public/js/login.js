document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    username: document.getElementById("username").value.trim(),
    password: document.getElementById("password").value
  };

  const msg = document.getElementById("msg");

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const text = await response.text();

    if (response.ok) {
      msg.textContent = "Login successful! Redirecting...";
      msg.className = "text-center text-green-600 mt-3";
      setTimeout(() => (window.location.href = "/index.html"), 1500);
    } else {
      msg.textContent = text || "Invalid credentials.";
      msg.className = "text-center text-red-600 mt-3";
    }
  } catch (err) {
    msg.textContent = "Something went wrong. Try again.";
    msg.className = "text-center text-red-600 mt-3";
  }
});
