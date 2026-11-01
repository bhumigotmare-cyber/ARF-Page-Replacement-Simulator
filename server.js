
const express = require("express");
const { execFile } = require("child_process");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Run the selected page replacement algorithm
app.post("/run", (req, res) => {
    const { algorithm, pages, frames } = req.body;

    // Validate input
    if (
        !Array.isArray(pages) ||
        !Number.isInteger(frames) ||
        frames < 1 ||
        frames > 20 ||
        pages.length < 1 ||
        pages.length > 100 ||
        !pages.every(
            page => Number.isInteger(page) && page >= 0
        ) ||
        !["FIFO", "LRU", "LFU", "ARF"].includes(algorithm)
    ) {
        return res.status(400).json({
            error: "Invalid input. Check your page reference string, frame count, and algorithm."
        });
    }

    // Select the correct executable for Windows or Linux
    const executable = process.platform === "win32"
        ? "arf.exe"
        : "arf";

    const executablePath = path.join(__dirname, executable);

    // Execute the C program
    execFile(
        executablePath,
        [
            algorithm,
            pages.join(","),
            String(frames)
        ],
        {
            timeout: 5000
        },
        (error, stdout, stderr) => {
            if (error) {
                console.error("Execution error:", error);
                return res.status(500).json({
                    error: stderr || error.message
                });
            }

            try {
                const result = JSON.parse(stdout);
                return res.json(result);
            } catch (parseError) {
                console.error("Output parsing error:", parseError);
                return res.status(500).json({
                    error: "The C program returned invalid output."
                });
            }
        }
    );
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`ARF Simulator running on port ${PORT}`);
});
