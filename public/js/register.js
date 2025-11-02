document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    username: document.getElementById("username").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value
  };

  const msg = document.getElementById("msg");

  try {
    const response = await fetch("/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const text = await response.text();
   
  if (response.ok) {
  msg.textContent = "Account created! Redirecting to login...";
  msg.className = "text-center text-green-600 mt-3";
  setTimeout(() => (window.location.href = "/login.html"), 1500);
  }else {
      msg.textContent = text || "Failed to create account.";
      msg.className = "text-center text-red-600 mt-3";
    }
  } catch (err) {
    msg.textContent = "Something went wrong. Try again.";
    msg.className = "text-center text-red-600 mt-3";
  }
});
