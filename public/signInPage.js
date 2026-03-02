async function submitSignIn() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;

    try {
        const response = await fetch("/signIn", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, firstName, lastName })
        });

        const data = await response.json();

        if (data) {
            // Redirect to home page
            window.location.href = "homePage.html";
        } else {
            alert("Sign in failed: " + (data.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Error signing in:", error);
        alert("An error occurred during sign in.");
    }
}
