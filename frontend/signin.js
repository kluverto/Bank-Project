document.addEventListener("DOMContentLoaded", () => {
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");
  const form = document.querySelector(".signin-form");
  const logout = document.querySelector(".logout");
  const errorMsg = document.getElementById("errorMsg");
  
  function togglePassword(input, icon) {
    if (input.type === "password") {
      input.type = "text";
      icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.replace("fa-eye-slash", "fa-eye");
    }
  }

  toggle.addEventListener("click", () => togglePassword(password, toggle));

  

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    

    const res = await fetch("/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

  // Store logged-in user email
    localStorage.setItem("userEmail", data.user.email);
    localStorage.setItem("userRole", data.role);
    
  // Redirect based on role
if (result.success) {

  // Store logged-in user email
  localStorage.setItem("userEmail", result.user.email);
  localStorage.setItem("userRole", result.role);

  // Redirect based on role
    if (result.role === "admin") {
      window.location.href = "admindashboard.html";
    } else {
      window.location.href = "userdashboard.html";
    }

  } else {
    errorMsg.textContent = result.message || "Login failed";
  }
});
});
