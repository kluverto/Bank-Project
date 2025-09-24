document.addEventListener("DOMContentLoaded", () => {
  const password = document.getElementById("password");
  const toggle = document.getElementById("toggle");
  const form = document.querySelector(".signin-form");
  const logout = document.querySelector(".logout")
  
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
    
    if (result.role === "admin") {
      window.location.href = "/admin.html";
    } else if (result.role === "user"){
      window.location.href = `/userdashboard.html?email=${encodeURIComponent(data.email)}`;
    } else{
      alert("Invalid credentials");
    }
  });
});
