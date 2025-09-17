// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    // 1. Welcome alert
    alert("Welcome to Evergreen Financial Bank 🌱");

    // 2. Highlight navigation links when clicked
    const navLinks = document.querySelectorAll(".nav ul li a");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            navLinks.forEach(l => l.classList.remove("active")); // remove old highlight
            link.classList.add("active"); // add new highlight
        });
    });

    // 4. Copy email to clipboard when clicked
    const emailElement = document.getElementById("email");
    emailElement.addEventListener("click", () => {
        const email = "evergreen@support.com";
        navigator.clipboard.writeText(email).then(() => {
            alert("📧 Email copied: " + email);
        });
    });
});
