// Wait until DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector(".form");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirm-password");
  const toggle = document.getElementById("toggle");
  const ctoggle = document.getElementById("ctoggle");

  // Toggle password visibility
  function togglePassword(input, icon) {
    if (input.type === "password") {
      input.type = "text";
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  }

  toggle.addEventListener("click", () => togglePassword(password, toggle));
  ctoggle.addEventListener("click", () => togglePassword(confirmPassword, ctoggle));

  // Form validation
  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stop form from submitting by default

    const firstName = document.getElementById("First name").value.trim();
    const secondName = document.getElementById("Second name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone-number").value.trim();
    const dob = document.getElementById("date-of-birth").value;

    // Basic validations
    if (firstName === "" || secondName === "" || email === "" || phone === "" || dob === "") {
      alert("Please fill out all fields.");
      return;
    }

    // Password match check
    if (password.value !== confirmPassword.value) {
      alert("Passwords do not match.");
      return;
    }

    // Password strength check (example: at least 6 characters)
    if (password.value.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    // If everything is valid
    alert("✅ Sign-up successful! Welcome to Evergreen Financial Bank.");
    form.reset(); // clear the form
  });
});
