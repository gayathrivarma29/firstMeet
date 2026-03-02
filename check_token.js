require("dotenv").config();

async function checkToken() {
    try {
        console.log("Checking token info...");
        const response = await fetch("https://huggingface.co/api/whoami-v2", {
            headers: {
                "Authorization": `Bearer ${process.env.HF_API_KEY}`,
            },
        });

        const data = await response.json();
        console.log("Token Info:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error checking token:", err);
    }
}

checkToken();
