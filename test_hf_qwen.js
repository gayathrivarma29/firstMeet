require("dotenv").config();
const { InferenceClient } = require("@huggingface/inference");

const client = new InferenceClient(process.env.HF_API_KEY);

async function test() {
    try {
        console.log("Testing HF API with model: Qwen/Qwen2.5-72B-Instruct");
        const response = await client.chatCompletion({
            model: "Qwen/Qwen2.5-72B-Instruct",
            messages: [
                { role: "user", content: "Hello" }
            ],
            max_tokens: 10,
        });
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (err) {
        if (err.httpResponse && err.httpResponse.body) {
            console.error("HTTP Error Body:", JSON.stringify(err.httpResponse.body, null, 2));
        } else {
            console.error("Error:", err);
        }
    }
}

test();
