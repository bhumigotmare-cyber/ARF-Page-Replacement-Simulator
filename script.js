
const runBtn = document.getElementById("runBtn");

let lastReportData = null;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getSimulation(algorithm, pages, frames) {
    const response = await fetch("/run", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ algorithm, pages, frames })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Simulation failed");
    }

    return data;
}

// IMPROVED INPUT VALIDATION

function getInput() {
    const pagesInput = document.getElementById("pages").value.trim();
    const framesInput = document.getElementById("frames").value.trim();

    if (pagesInput === "") {
        throw new Error("Please enter a page reference string.");
    }

    const pagePattern = /^\d+(\s*,\s*\d+)*$/;

    if (!pagePattern.test(pagesInput)) {
        throw new Error(
            "Use only non-negative whole numbers separated by commas. Example: 1, 2, 3, 1."
        );
    }

    const pages = pagesInput.split(",").map(value => Number(value.trim()));

    if (pages.length > 100) {
        throw new Error("You can enter a maximum of 100 page references.");
    }

    if (framesInput === "") {
        throw new Error("Please enter the number of memory frames.");
    }

    if (!/^\d+$/.test(framesInput)) {
        throw new Error("Memory frames must be a whole number.");
    }

    const frames = Number(framesInput);

    if (frames < 1 || frames > 20) {
        throw new Error("Memory frames must be between 1 and 20.");
    }

    return { pages, frames };
}

// RUN INDIVIDUAL SIMULATION

async function runSimulation() {
    const message = document.getElementById("message");
    const algorithm = document.getElementById("algorithm").value;
    const compareBtn = document.getElementById("compareBtn");
    const resetBtn = document.getElementById("resetBtn");

    try {
        const { pages, frames } = getInput();

        runBtn.disabled = true;
        compareBtn.disabled = true;
        resetBtn.disabled = true;

        message.textContent = "Preparing simulation...";

        const data = await getSimulation(algorithm, pages, frames);

        lastReportData = {
            type: "individual",
            algorithm,
            pages,
            frames,
            data,
            date: new Date().toLocaleString()
        };

        await displayResults(data, algorithm);

        message.textContent = "Simulation completed successfully!";

    } catch (error) {
        message.textContent = "Error: " + error.message;

    } finally {
        runBtn.disabled = false;
        compareBtn.disabled = false;
        resetBtn.disabled = false;
    }
}

// COMPARE ALL ALGORITHMS

async function compareAlgorithms() {
    const message = document.getElementById("message");
    const compareBtn = document.getElementById("compareBtn");
    const resetBtn = document.getElementById("resetBtn");

    const algorithms = ["ARF", "FIFO", "LRU", "LFU"];

    try {
        const { pages, frames } = getInput();

        compareBtn.disabled = true;
        runBtn.disabled = true;
        resetBtn.disabled = true;

        message.textContent = "Comparing all four algorithms...";

        const results = [];

        for (const algorithm of algorithms) {
            const data = await getSimulation(algorithm, pages, frames);

            const hitRatio = data.total
                ? (data.hits / data.total) * 100
                : 0;

            const faultRatio = data.total
                ? (data.faults / data.total) * 100
                : 0;

            results.push({
                algorithm,
                hits: data.hits,
                faults: data.faults,
                total: data.total,
                ratio: hitRatio.toFixed(1),
                faultRatio: faultRatio.toFixed(1)
            });
        }

        lastReportData = {
            type: "comparison",
            pages,
            frames,
            results,
            date: new Date().toLocaleString()
        };

        displayComparison(results);
        displayPerformanceGraph(results);
        displayProjectSummary(results);

        message.textContent =
            "Comparison, graph and project summary generated!";

    } catch (error) {
        message.textContent = "Error: " + error.message;

    } finally {
        compareBtn.disabled = false;
        runBtn.disabled = false;
        resetBtn.disabled = false;
    }
}

// DISPLAY INDIVIDUAL RESULTS

async function displayResults(data, algorithm) {
    document.getElementById("totalPages").textContent = data.total;
    document.getElementById("pageHits").textContent = data.hits;
    document.getElementById("pageFaults").textContent = data.faults;

    const ratio = data.total
        ? ((data.hits / data.total) * 100).toFixed(1)
        : 0;

    document.getElementById("hitRatio").textContent = ratio + "%";

    const results = document.getElementById("results");

    let table = `
        <h3 style="margin-bottom:15px;font-size:14px;">
            ${algorithm} Simulation Details
        </h3>

        <table>
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Page</th>
                    <th>Memory Frames</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.steps.forEach((step, index) => {
        table += `
            <tr>
                <td>${index + 1}</td>
                <td>${step.page}</td>
                <td>${step.frames.map(value =>
                    value === null ? "-" : value
                ).join(" | ")}</td>
                <td style="color:${step.hit ? "#15966d" : "#e18a4d"}">
                    ${step.hit ? "HIT" : "FAULT"}
                </td>
            </tr>
        `;
    });

    table += `
            </tbody>
        </table>

        <p style="margin-top:15px;font-size:12px;">
            Total Hits: <b>${data.hits}</b> |
            Total Faults: <b>${data.faults}</b>
        </p>
    `;

    results.innerHTML = table;

    await animateFrames(data.steps);
}

// MEMORY FRAME ANIMATION

async function animateFrames(steps) {
    const framesContainer = document.getElementById("memoryFrames");
    const message = document.getElementById("message");

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        framesContainer.innerHTML = "";

        step.frames.forEach((page, index) => {
            const frame = document.createElement("div");

            frame.className = "frame";
            frame.style.borderColor =
                step.hit ? "#20ae7a" : "#e18a4d";

            frame.style.background =
                step.hit ? "#eafaf3" : "#fff4eb";

            if (page === null) {
                frame.classList.add("empty-frame");
                frame.textContent = "Empty";
            } else {
                frame.textContent = page;
            }

            const label = document.createElement("small");
            label.textContent = "Frame " + (index + 1);

            frame.appendChild(label);
            framesContainer.appendChild(frame);
        });

        const status = document.createElement("div");

        status.style.width = "100%";
        status.style.marginTop = "12px";
        status.style.fontSize = "12px";
        status.style.fontWeight = "600";

        status.style.color =
            step.hit ? "#15966d" : "#e18a4d";

        status.textContent =
            `Step ${i + 1} / ${steps.length} | Page ${step.page} | ` +
            (step.hit ? "PAGE HIT" : "PAGE FAULT");

        framesContainer.appendChild(status);

        message.textContent =
            `Animating ${i + 1} of ${steps.length} page references...`;

        await delay(650);
    }
}

// COMPARISON TABLE WITH DETAILED STATISTICS

function displayComparison(results) {
    const bestFaults = Math.min(
        ...results.map(item => item.faults)
    );

    const bestAlgorithms = results
        .filter(item => item.faults === bestFaults)
        .map(item => item.algorithm);

    const comparison = document.getElementById("results");

    let table = `
        <h3 style="margin-bottom:15px;font-size:14px;">
            Algorithm Performance Comparison
        </h3>

        <table>
            <thead>
                <tr>
                    <th>Algorithm</th>
                    <th>Total Pages</th>
                    <th>Page Hits</th>
                    <th>Page Faults</th>
                    <th>Hit Ratio</th>
                    <th>Fault Ratio</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(item => {
        table += `
            <tr>
                <td><b>${item.algorithm}</b></td>
                <td>${item.total}</td>
                <td>${item.hits}</td>
                <td>${item.faults}</td>
                <td>${item.ratio}%</td>
                <td>${item.faultRatio}%</td>
            </tr>
        `;
    });

    table += `
            </tbody>
        </table>

        <div style="
            margin-top:18px;
            padding:15px;
            background:#f0ebff;
            border-radius:10px;
            color:#5636a5;
        ">
            <b>Best result for this input:</b>
            ${bestAlgorithms.join(", ")}
            <br>
            <small>Lowest page faults: ${bestFaults}</small>
        </div>
    `;

    comparison.innerHTML = table;
}

// PERFORMANCE GRAPH

function displayPerformanceGraph(results) {
    const chart = document.getElementById("performanceChart");

    const maxFaults = Math.max(
        1,
        ...results.map(item => item.faults)
    );

    let graphHTML = `
        <div class="graph-axis">
            <span>Page Faults</span>
            <span>Algorithm</span>
        </div>
    `;

    results.forEach(item => {
        const width = (item.faults / maxFaults) * 100;

        graphHTML += `
            <div class="graph-row">
                <div class="graph-label">${item.algorithm}</div>

                <div class="graph-track">
                    <div
                        class="graph-bar"
                        style="width:${width}%"
                    ></div>
                </div>

                <div class="graph-value">${item.faults}</div>
            </div>
        `;
    });

    graphHTML += `
        <p class="graph-note">
            The algorithm with fewer page faults performs better
            for this particular reference string and frame count.
        </p>
    `;

    chart.innerHTML = graphHTML;
}

// PROJECT SUMMARY

function displayProjectSummary(results) {
    const bestFaults = Math.min(
        ...results.map(item => item.faults)
    );

    const bestAlgorithms = results
        .filter(item => item.faults === bestFaults)
        .map(item => item.algorithm);

    document.getElementById("bestAlgorithm").textContent =
        bestAlgorithms.join(", ");

    document.getElementById("bestFaults").textContent =
        `Lowest page faults: ${bestFaults}`;

    document.getElementById("summaryExplanation").textContent =
        `${bestAlgorithms.join(", ")} achieved the lowest number of page faults ` +
        `among the four algorithms for this particular input. ` +
        `The comparison uses the same page reference string and memory frames ` +
        `for every algorithm. Results may change with different inputs.`;
}

// INTERACTIVE ARF SCORE CALCULATOR

function calculateARF() {
    const entries = [];
    const resultBox = document.getElementById("arfCalculatorResult");

    try {
        for (let i = 1; i <= 3; i++) {
            const pageInput = document.getElementById(`arfPage${i}`).value.trim();
            const frequencyInput = document.getElementById(`arfFreq${i}`).value.trim();
            const ageInput = document.getElementById(`arfAge${i}`).value.trim();

            if (pageInput === "" || frequencyInput === "" || ageInput === "") {
                throw new Error(`Please fill in all fields for Page ${i}.`);
            }

            if (!/^\d+$/.test(pageInput)) {
                throw new Error(`Page ${i}: Enter a valid non-negative whole number.`);
            }

            if (!/^\d+$/.test(frequencyInput)) {
                throw new Error(`Page ${i}: Frequency must be a whole number.`);
            }

            if (!/^\d+$/.test(ageInput)) {
                throw new Error(`Page ${i}: Age must be a non-negative whole number.`);
            }

            const page = Number(pageInput);
            const frequency = Number(frequencyInput);
            const age = Number(ageInput);

            if (frequency < 1) {
                throw new Error(`Page ${i}: Frequency must be at least 1.`);
            }

            if (
                !Number.isSafeInteger(page) ||
                !Number.isSafeInteger(frequency) ||
                !Number.isSafeInteger(age)
            ) {
                throw new Error("Please enter smaller whole numbers.");
            }

            if (entries.some(item => item.page === page)) {
                throw new Error("Please enter three different page numbers.");
            }

            const score = frequency / (age + 1);

            entries.push({
                page,
                frequency,
                age,
                score
            });
        }

        // DISPLAY INDIVIDUAL SCORES

        entries.forEach((item, index) => {
            document.getElementById(`arfScore${index + 1}`).textContent =
                item.score.toFixed(3);
        });

        // FIND THE LOWEST SCORE

        const lowestScore = Math.min(
            ...entries.map(item => item.score)
        );

        const replacementCandidates = entries.filter(
            item => Math.abs(item.score - lowestScore) < 0.000000001
        );

        const candidatePages = replacementCandidates
            .map(item => `Page ${item.page}`)
            .join(", ");

        let resultMessage = "";

        if (replacementCandidates.length === 1) {
            resultMessage =
                `<strong>Replacement candidate: ${candidatePages}</strong>`;
        } else {
            resultMessage =
                `<strong>There is a tie between: ${candidatePages}</strong>`;
        }

        const scoreDetails = entries.map(item =>
            `Page ${item.page}: ${item.frequency} / (${item.age} + 1) = ${item.score.toFixed(3)}`
        ).join("<br>");

        resultBox.innerHTML = `
            <div style="
                background:#f0ebff;
                padding:16px;
                border-radius:10px;
                color:#5636a5;
                line-height:1.8;
                margin-top:15px;
            ">
                <h3 style="margin-bottom:10px;">ARF Calculation Result</h3>

                ${scoreDetails}

                <hr style="border:0;border-top:1px solid #d8caff;margin:12px 0;">

                ${resultMessage}

                <p style="font-size:12px;margin-top:8px;">
                    The page with the lowest score is selected as the replacement candidate.
                    If scores are tied, the C implementation selects the first matching
                    frame in memory order.
                </p>
            </div>
        `;

    } catch (error) {
        resultBox.textContent = "Error: " + error.message;
    }
}

// CLEAR ARF CALCULATOR

function clearARFCalculator() {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`arfPage${i}`).value = "";
        document.getElementById(`arfFreq${i}`).value = "";
        document.getElementById(`arfAge${i}`).value = "";

        document.getElementById(`arfScore${i}`).textContent =
            "Not calculated";
    }

    document.getElementById("arfCalculatorResult").textContent =
        "Calculator cleared. Enter new values and click Calculate ARF Scores.";
}

// DOWNLOAD / SAVE PDF REPORT

function downloadReport() {
    if (!lastReportData) {
        document.getElementById("message").textContent =
            "Please run a simulation or compare all algorithms before downloading the report.";
        return;
    }

    const report = lastReportData;

    let reportContent = "";

    if (report.type === "comparison") {
        const bestFaults = Math.min(
            ...report.results.map(item => item.faults)
        );

        const bestAlgorithms = report.results
            .filter(item => item.faults === bestFaults)
            .map(item => item.algorithm);

        reportContent = `
            <h2>Algorithm Performance Comparison</h2>

            <table>
                <tr>
                    <th>Algorithm</th>
                    <th>Total Pages</th>
                    <th>Page Hits</th>
                    <th>Page Faults</th>
                    <th>Hit Ratio</th>
                    <th>Fault Ratio</th>
                </tr>

                ${report.results.map(item => `
                    <tr>
                        <td>${item.algorithm}</td>
                        <td>${item.total}</td>
                        <td>${item.hits}</td>
                        <td>${item.faults}</td>
                        <td>${item.ratio}%</td>
                        <td>${item.faultRatio}%</td>
                    </tr>
                `).join("")}
            </table>

            <div class="highlight">
                <strong>Best result for this input:</strong>
                ${bestAlgorithms.join(", ")}
                <br>
                Lowest page faults: ${bestFaults}
            </div>
        `;

    } else {
        const data = report.data;

        const ratio = data.total
            ? ((data.hits / data.total) * 100).toFixed(1)
            : 0;

        const faultRatio = data.total
            ? ((data.faults / data.total) * 100).toFixed(1)
            : 0;

        reportContent = `
            <h2>${report.algorithm} Simulation Details</h2>

            <div class="stats">
                <div><strong>Total Pages</strong><br>${data.total}</div>
                <div><strong>Page Hits</strong><br>${data.hits}</div>
                <div><strong>Page Faults</strong><br>${data.faults}</div>
                <div><strong>Hit Ratio</strong><br>${ratio}%</div>
                <div><strong>Fault Ratio</strong><br>${faultRatio}%</div>
            </div>

            <table>
                <tr>
                    <th>Step</th>
                    <th>Page</th>
                    <th>Memory Frames</th>
                    <th>Status</th>
                </tr>

                ${data.steps.map((step, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${step.page}</td>
                        <td>${step.frames.map(value =>
                            value === null ? "-" : value
                        ).join(" | ")}</td>
                        <td>${step.hit ? "HIT" : "FAULT"}</td>
                    </tr>
                `).join("")}
            </table>
        `;
    }

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
        document.getElementById("message").textContent =
            "Please allow pop-ups for this website to create your PDF report.";
        return;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ARF Simulation Report</title>

            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    color: #222;
                }

                h1 {
                    color: #5636a5;
                    margin-bottom: 5px;
                }

                h2 {
                    color: #5636a5;
                    margin-top: 30px;
                }

                .subtitle {
                    color: #666;
                    margin-bottom: 25px;
                }

                .details {
                    line-height: 1.9;
                    margin-bottom: 20px;
                }

                .stats {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 15px;
                    margin: 20px 0;
                }

                .stats div {
                    border: 1px solid #ddd;
                    padding: 15px;
                    min-width: 110px;
                    border-radius: 8px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    font-size: 12px;
                }

                th, td {
                    border: 1px solid #ccc;
                    padding: 10px;
                    text-align: center;
                }

                th {
                    background: #eee8ff;
                    color: #5636a5;
                }

                .highlight {
                    margin-top: 20px;
                    padding: 15px;
                    background: #f0ebff;
                    border: 1px solid #d8caff;
                    border-radius: 8px;
                    line-height: 1.8;
                }

                footer {
                    margin-top: 40px;
                    border-top: 1px solid #ddd;
                    padding-top: 12px;
                    color: #777;
                    font-size: 12px;
                }

                @media print {
                    body {
                        padding: 10px;
                    }

                    table {
                        page-break-inside: auto;
                    }

                    tr {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>

        <body>

            <h1>ARF Page Replacement Simulator</h1>

            <p class="subtitle">
                Operating Systems Mini Project
            </p>

            <div class="details">
                <strong>Report Generated:</strong> ${report.date}<br>
                <strong>Page Reference String:</strong>
                ${report.pages.join(", ")}<br>
                <strong>Number of Memory Frames:</strong> ${report.frames}
            </div>

            ${reportContent}

            <footer>
                Adaptive Page Replacement Simulator |
                Operating Systems Mini Project
            </footer>

            <script>
                window.onload = function() {
                    window.print();
                };
            <\/script>

        </body>
        </html>
    `);

    printWindow.document.close();

    document.getElementById("message").textContent =
        "Report opened. Choose Save as PDF in the print window.";
}

// RESET SIMULATION

function resetSimulation() {

    lastReportData = null;

    document.getElementById("totalPages").textContent = "0";
    document.getElementById("pageHits").textContent = "0";
    document.getElementById("pageFaults").textContent = "0";
    document.getElementById("hitRatio").textContent = "0%";

    document.getElementById("memoryFrames").innerHTML = `
        <p class="empty">
            Run a simulation to view memory frames.
        </p>
    `;

    document.getElementById("results").innerHTML = `
        <p class="empty">
            Your simulation results will appear here.
        </p>
    `;

    document.getElementById("performanceChart").innerHTML = `
        <p class="empty">
            Run Compare All Algorithms to generate the performance graph.
        </p>
    `;

    document.getElementById("bestAlgorithm").textContent =
        "Not calculated yet";

    document.getElementById("bestFaults").textContent =
        "Run Compare All Algorithms to see the result.";

    document.getElementById("summaryExplanation").textContent =
        "The simulator compares ARF, FIFO, LRU and LFU using the same page reference string and number of memory frames.";

    document.getElementById("message").textContent =
        "Simulation has been reset successfully!";
}
