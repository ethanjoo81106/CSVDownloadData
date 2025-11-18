const API_BASE = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", () => {

    const downloadAllBtn = document.getElementById("downloadAllBtn");
    const rangeForm = document.getElementById("rangeForm");
    const fromInput = document.getElementById("fromInput");
    const toInput = document.getElementById("toInput");
    const errorMessage = document.getElementById("errorMessage");

    const showError = (msg) => {
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
    }

    const clearError = () => {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
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

})