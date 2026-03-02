require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { InferenceClient } = require("@huggingface/inference");
const mammoth = require("mammoth");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const taskRoutes = require("./routes/tasksRoute");
const meetingsRoute = require("./routes/meetingsRoute");
const jiraRoutes = require("./routes/jiraRoutes");
const emailRoutes = require("./routes/emailRoutes");
const User = require("./models/user")
const bcrypt = require("bcryptjs");




// Connect to Database
connectDB();

const app = express();
const upload = multer({ dest: "uploads/" });

// enable CORS (development) so that requests from a different origin
// (e.g. the Vite dev server) are not blocked.
app.use(cors());

app.use(express.json());

// log all incoming JSON bodies for troubleshooting sign‑up data
app.use((req, res, next) => {
    if (req.path.startsWith('/api/users') && req.method === 'POST') {
        console.log('Incoming API request body:', req.body);
    }
    next();
});
// app.get("/", (req, res) => {
//   res.sendFile(path.join(__dirname, "public", "signInPage.html"));
// });

app.post("/signIn", async (req, res) => {
  const { userName, password } = req.body;

  const user = await User.findOne({ userName });

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid password" });
  }

  res.json({ 
    success: true, 
    message: "Signed in successfully", 
    userName: user.userName,
    role: user.role 
  });
});

app.use(express.static(path.join(__dirname, "frontend", "dist")));
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/meetings", meetingsRoute);
app.use("/api/jira", jiraRoutes);
app.use("/api/email", emailRoutes);

const client = new InferenceClient(process.env.HF_API_KEY);

app.post("/ask", upload.single("file"), async (req, res) => {
  try {
    const prompt = req.body.prompt;
    const filePath = req.file.path;


    let fileText = "";
    if (req.file.originalname.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ path: filePath });
      fileText = result.value;
    } else {
      fileText = fs.readFileSync(filePath, "utf8");
    }


    const response = await client.chatCompletion({
      model: "Qwen/Qwen2.5-72B-Instruct",
      messages: [
        { role: "system", content: "You are a professional meeting analysis assistant. You MUST respond with exactly two sections delimited by [[SUMMARY]] and [[ACTION_ITEMS]]. Do NOT include action items in the Summary section. Use only plain text, no bolding or asterisks." },
        { role: "user", content: `${prompt}\n\nMeeting Notes / Transcript:\n${fileText}` }
      ],
      max_tokens: 1000,
    });

    const summaryData = response.choices[0].message.content;


    res.send(summaryData);

    // Delete file
    fs.unlinkSync(filePath);

  } catch (err) {
    console.error("HF API Error:", err);
    if (err.httpResponse && err.httpResponse.body) {
      console.error("HF API Error Details:", JSON.stringify(err.httpResponse.body, null, 2));
      res.status(500).json({ error: "Hugging Face API Error", details: err.httpResponse.body });
    } else {
      res.status(500).send("Server Error");
    }
  }
});


app.get("/*path", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
