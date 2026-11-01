
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(__dirname));

app.post("/run", (req, res) => {
    const { algorithm, pages, frames } = req.body;

    if (!Array.isArray(pages) || !Number.isInteger(frames) ||
        frames < 1 || frames > 20 ||
        pages.length < 1 || pages.length > 100 ||
        !pages.every(Number.isInteger) ||
        !["FIFO", "LRU", "LFU", "ARF"].includes(algorithm)) {
        return res.status(400).json({ error: "Invalid input" });
    }

    execFile(
        path.join(__dirname, "arf.exe"),
        [algorithm, pages.join(","), String(frames)],
        { timeout: 5000 },
        (error, stdout, stderr) => {
            if (error) {
                return res.status(500).json({
                    error: stderr || error.message
                });
            }

            try {
                res.json(JSON.parse(stdout));
            } catch {
                res.status(500).json({ error: "Invalid program output" });
            }
        }
    );
});

app.listen(PORT, () => {
    console.log(`ARF Simulator running at http://localhost:${PORT}`);
});
