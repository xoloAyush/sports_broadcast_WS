import express from "express";

const app = express();

app.use(express.json());

// route
app.get("/", (req, res) => {
    res.send("Hello from Express server 🚀");
});

// start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
