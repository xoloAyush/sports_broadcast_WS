import express from "express";
import { matchRouter } from "./src/routes/matches.js";

const app = express();

app.use(express.json());

// route
app.get("/", (req, res) => {
    res.send("Hello from Express server 🚀");
});

app.use("/matches", matchRouter);

// start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
