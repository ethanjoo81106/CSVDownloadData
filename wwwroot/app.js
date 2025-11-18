const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", () => {

    const statusText = document.getElementById("statusText");
    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const rangeForm = document.getElementById("rangeForm");
    const fromInput = document.getElementById("fromInput");
    const toInput = document.getElementById("toInput");
    const errorMessage = document.getElementById("errorMessage");

    const testUploadBtn = document.getElementById("testUploadBtn");

    testUploadBtn.addEventListener("click", async () => {
        const csv = "timeMillis,iso8601,bpm\n" +
            "1710600000000,2024-03-16T10:00:00Z,80\n" +
            "1710600060000,2024-03-16T10:01:00Z,82\n";

        try {
            const resp = await fetch(`${API_BASE}/api/bpm/upload`, {
                method: "POST",
                headers: {
                    "Content-Type": "text/csv",
                },
                body: csv,
            });

            if (!resp.ok) {
                alert("Upload failed: " + (await resp.text()));
                return;
            }

            alert("Test CSV uploaded!");
            checkExportStatus();
        } catch (e) {
            console.error(e);
            alert("Upload error: " + e.message);
        }
    });

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
    }

    const clearError = () => {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
    }

    const setEnabled = (enabled) => {
        downloadAllBtn.disabled = !enabled;
        fromInput.disabled = !enabled;
        toInput.disabled = !enabled;
        rangeForm.querySelector("button[type='submit']").disabled = !enabled;
    }

    async function checkExportStatus(){
        try {
            statusText.textContent = "Checking for exported data..."
            setEnabled(false)
            clearError()

            const response = await fetch(`${API_BASE}/api/bpm/status`, {
                cache: "no-store",
            });

            if (!response.ok) {
                statusText.textContent = "Could not contact the export server.";
                return;
            }

            const text = (await response.text()).trim();


            if (text === "ready") {
                statusText.textContent = "Export found. You can download it now.";
                setEnabled(true);
            } else {
                statusText.textContent = "No exports yet. On your watch, open the app and tap “Export” first.";
                setEnabled(false);
            }
        } catch (error) {
            console.error(error);
            statusText.textContent = "Error checking export status.";
            setEnabled(false);
        }
    }

    downloadAllBtn.addEventListener("click", () => {
        clearError();
        window.location.href = `${API_BASE}/api/bpm/export`;
    })

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

        const url = `${API_BASE}/api/bpm/export?start=${startMillis}&end=${endMillis}`;
        window.location.href = url;
    });

    checkExportStatus()

    setInterval(checkExportStatus, 10000);

});