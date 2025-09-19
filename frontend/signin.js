const password= document.getElementById("password");
const togglePassword = document.getElementById("toggle");

togglePassword.addEventListener("click", () => {
    if (password.type == "password") {
        password.type = "text";
        togglePassword.classList.remove("fa-eye");
        togglePassword.classList.add("fa-eye-slash");
    } else {
        password.type = "password";
        togglePassword.classList.remove("fa-eye-slash");
        togglePassword.classList.add("fa-eye");
    }

}); document.querySelector(".signin-form").addEventListener(("submit"), async (e) => {
    e.preventDefault();
});

const formData = new formData(e.target);
const data = Object.fromEntries(formData);

const res = await fetch("/sigin", {
    method: "POST",
    headers: {"Content-type": "application/json"},
    body: JSON.stringify(data)
});

const result = await res.json();
alert(result.message);







