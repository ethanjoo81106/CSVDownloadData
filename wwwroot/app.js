import {
    uploadCsv,
    fetchExportStatus,
    getFullExportUrl,
    getRangeExportUrl,
} from "./api.js";

const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", () => {
    const statusText = document.getElementById("statusText");
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const rangeForm = document.getElementById("rangeForm");
    const fromInput = document.getElementById("fromInput");
    const toInput = document.getElementById("toInput");
    const errorMessage = document.getElementById("errorMessage");
    const testUploadBtn = document.getElementById("testUploadBtn");

    const graphStatus = document.getElementById("graphStatus");
    const bpmCanvas = document.getElementById("bpmChart");
    const selectedRangeText = document.getElementById("selectedRangeText");
    const downloadSelectedBtn = document.getElementById("downloadSelectedBtn");

    let bpmChart = null;
    let currentPoints = [];

    let selectedStartMillis = null;
    let selectedEndMillis = null;

    testUploadBtn.addEventListener("click", async () => {
        const csv =
            "timeMillis,iso8601,bpm\n" +
            "1710600000000,2024-03-16T10:00:00Z,80\n" +
            "1710600060000,2024-03-16T10:01:00Z,82\n";

        try {
            await uploadCsv(csv);
            alert("Test CSV uploaded!");
            // Show the sample on the graph immediately
            const points = parseCsv(csv);
            renderBpmChart(points);
            await checkExportStatus();
        } catch (e) {
            console.error(e);
            alert("Upload error: " + e.message);
        }
    });

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
    };

    const clearError = () => {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
    };

    const setEnabled = (enabled) => {
        downloadAllBtn.disabled = !enabled;
        fromInput.disabled = !enabled;
        toInput.disabled = !enabled;
        rangeForm.querySelector("button[type='submit']").disabled = !enabled;
    };

    async function checkExportStatus() {
        try {
            statusText.textContent = "Checking for exported data...";
            setEnabled(false);
            clearError();

            const response = await fetch(`${API_BASE}/api/bpm/status`, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Could not contact the export server.");
            }

            const text = (await response.text()).trim();

            if (text === "ready") {
                statusText.textContent = "Export found. You can download it now.";
                setEnabled(true);
                fetchAndShowLatestCsv();
            } else {
                statusText.textContent =
                    "No exports yet. On your watch, open the app and tap “Export” first.";
                setEnabled(false);
                graphStatus.textContent = "No data received yet.";
            }
        } catch (error) {
            console.error(error);
            statusText.textContent = error.message || "Error checking export status.";
            setEnabled(false);
        }
    }

    downloadAllBtn.addEventListener("click", () => {
        clearError();
        window.location.href = getFullExportUrl();
    });

    rangeForm.addEventListener("submit", (event) => {
        event.preventDefault();
        clearError();

        const fromValue = fromInput.value;
        const toValue = toInput.value;

        if (!fromValue || !toValue) {
            showError("Please select both a start and end time.");
            return;
        }

        const startMillis = Date.parse(fromValue);
        const endMillis = Date.parse(toValue);

        if (Number.isNaN(startMillis) || Number.isNaN(endMillis)) {
            showError("Could not parse the dates. Please check your input.");
            return;
        }

        if (startMillis >= endMillis) {
            showError("Start time must be before end time.");
            return;
        }

        const url = getRangeExportUrl(startMillis, endMillis);
        window.location.href = url;
    });

    function parseCsv(csvText) {
        const lines = csvText.split(/\n/);

        if (lines.length <= 1) {
            return [];
        }

        const points = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line){
                continue;
            }

            const [timeMillis, iso8601, bpmStr] =  line.split(",");
            const bpm = Number(bpmStr);

            if (Number.isNaN(bpm)) {
                continue;
            }

            let time;

            if (iso8601) {
                time = new Date(iso8601);
            } else if (timeMillis){
                time = new Date(Number(timeMillis));
            } else {
                continue;
            }

            if (Number.isNaN(time.getTime())) {
                continue;
            }

            points.push({time, bpm});
        }

        points.sort((a, b) => a.time - b.time);

        return points;
    }


    function renderBpmChart(points) {
        if (!bpmCanvas) return;

        currentPoints = points.slice();

        if (!points.length) {
            graphStatus.textContent = "Data received, but no usable rows in CSV.";
            return;
        }

        const labels = points.map(p =>
            p.time.toLocaleString(undefined, {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            })
        );

        const data = points.map(p => p.bpm);

        const ctx = bpmCanvas.getContext("2d");

        if (bpmChart) {
            bpmChart.data.labels = labels;
            bpmChart.data.datasets[0].data = data;
            bpmChart.update();
        } else {
            bpmChart = new Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "BPM",
                            data,
                            tension: 0.2,
                            pointRadius: 0,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    plugins: {
                        legend: {
                            labels: {
                                color: "#e6edf3"
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: {
                                autoSkip: true,
                                maxTicksLimit: 20,
                                color: "#e6edf3"
                            }
                        },
                        y: {
                            ticks: {
                                color: "#e6edf3"
                            },
                            title: {
                                display: true,
                                text: "BPM",
                                color: "#e6edf3"
                            }
                        }
                    }
                }
            });
        }

        graphStatus.textContent = `Showing ${points.length} data points.`;
    }

    async function fetchAndShowLatestCsv() {
        try {
            graphStatus.textContent = "Loading latest data...";
            const response = await fetch(`${API_BASE}/api/bpm/export`, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Could not fetch latest CSV (status ${response.status}).`);
            }

            const csvText = await response.text();
            const points = parseCsv(csvText);
            renderBpmChart(points);
        } catch (err) {
            console.error(err);
            graphStatus.textContent = "Error loading data: " + (err.message || "Unknown error");
        }
    }

    document.getElementById("uploadCsvFileBtn").addEventListener("click", async () => {
        const fileInput = document.getElementById("csvUploadInput");
        if (!fileInput.files.length) {
            alert("Choose a CSV first.");
            return;
        }

        const file = fileInput.files[0];
        const csvText = await file.text();

        try {
            await uploadCsv(csvText);
            alert("Uploaded test CSV!");
            const points = parseCsv(csvText);
            renderBpmChart(points);
        } catch (e) {
            alert("Upload failed: " + e.message);
        }
    });

    let isDragging = false;
    let dragStartX = null;
    let dragEndX = null;

    function drawSelectionOverlay() {
        if (!bpmChart || dragStartX === null || dragEndX === null) return;

        const ctx = bpmChart.ctx;
        const chartArea = bpmChart.chartArea;

        bpmChart.update("none");

        let x1 = Math.min(dragStartX, dragEndX);
        let x2 = Math.max(dragStartX, dragEndX);
        x1 = Math.max(x1, chartArea.left);
        x2 = Math.min(x2, chartArea.right);

        if (x2 <= x1) return;

        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(
            x1,
            chartArea.top,
            x2 - x1,
            chartArea.bottom - chartArea.top
        );
        ctx.restore();
    }

    function clearSelection() {
        dragStartX = null;
        dragEndX = null;
        selectedStartMillis = null;
        selectedEndMillis = null;
        downloadSelectedBtn.disabled = true;
        selectedRangeText.textContent =
            "No range selected. Click and drag on the chart to select a range to download.";
    }

    function finishSelection() {
        if (!isDragging) return;
        isDragging = false;

        if (!bpmChart || !currentPoints.length || dragStartX === null || dragEndX === null) {
            clearSelection();
            return;
        }

        const xScale = bpmChart.scales.x;
        const chartArea = bpmChart.chartArea;

        let x1 = Math.min(dragStartX, dragEndX);
        let x2 = Math.max(dragStartX, dragEndX);
        x1 = Math.max(x1, chartArea.left);
        x2 = Math.min(x2, chartArea.right);

        if (x2 - x1 < 5) {
            selectedRangeText.textContent = "Selection too small. Drag a wider area.";
            clearSelection();
            return;
        }

        let startIndex = Math.floor(xScale.getValueForPixel(x1));
        let endIndex = Math.ceil(xScale.getValueForPixel(x2));

        if (startIndex < 0) startIndex = 0;
        if (endIndex >= currentPoints.length) endIndex = currentPoints.length - 1;
        if (endIndex <= startIndex) {
            selectedRangeText.textContent = "Selection invalid.";
            clearSelection();
            return;
        }

        const startPoint = currentPoints[startIndex];
        const endPoint = currentPoints[endIndex];

        selectedStartMillis = startPoint.time.getTime();
        selectedEndMillis = endPoint.time.getTime();

        selectedRangeText.textContent =
            `Selected ${startPoint.time.toLocaleString()} → ${endPoint.time.toLocaleString()}. ` +
            `Click "Download selected range" to download.`;

        downloadSelectedBtn.disabled = false;
    }

    if (bpmCanvas) {
        bpmCanvas.addEventListener("mousedown", (event) => {
            if (!bpmChart || !currentPoints.length) return;
            const rect = bpmCanvas.getBoundingClientRect();
            isDragging = true;
            dragStartX = event.clientX - rect.left;
            dragEndX = dragStartX;
        });

        bpmCanvas.addEventListener("mousemove", (event) => {
            if (!isDragging) return;
            const rect = bpmCanvas.getBoundingClientRect();
            dragEndX = event.clientX - rect.left;
            drawSelectionOverlay();
        });

        bpmCanvas.addEventListener("mouseup", () => {
            finishSelection();
        });

        bpmCanvas.addEventListener("mouseleave", () => {
            if (isDragging) {
                finishSelection();
            }
        });
    }

    downloadSelectedBtn.addEventListener("click", () => {
        if (selectedStartMillis == null || selectedEndMillis == null) {
            alert("No range selected yet.");
            return;
        }

        const url = getRangeExportUrl(selectedStartMillis, selectedEndMillis);
        window.location.href = url;
    });

    checkExportStatus();
    setInterval(checkExportStatus, 10000);
});