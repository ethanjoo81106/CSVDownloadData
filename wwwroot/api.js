// api.js
const API_BASE = "http://localhost:8080";

// Upload CSV data
export async function uploadCsv(csv) {
    const resp = await fetch(`${API_BASE}/api/bpm/upload`, {
        method: "POST",
        headers: {
            "Content-Type": "text/csv",
        },
        body: csv,
    });

    if (!resp.ok) {
        const message = (await resp.text()) || "Upload failed";
        throw new Error(message);
    }
}

export async function fetchExportStatus() {
    const response = await fetch(`${API_BASE}/api/bpm/status`, {
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error("Could not contact the export server.");
    }

    const text = (await response.text()).trim();
    return text;
}

// URL for downloading the full export
export function getFullExportUrl() {
    return `${API_BASE}/api/bpm/export`;
}

// URL for downloading a range export
export function getRangeExportUrl(startMillis, endMillis) {
    return `${API_BASE}/api/bpm/export?start=${startMillis}&end=${endMillis}`;
}