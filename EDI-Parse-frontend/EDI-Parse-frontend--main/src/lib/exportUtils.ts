import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Download any object as a JSON file
 */
export const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.json`;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * Export data to CSV
 */
export const downloadCSV = (data: any[], headers: string[], filename: string) => {
    if (!data || data.length === 0) return;

    const csvRows = [];
    csvRows.push(headers.join(","));

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header.toLowerCase().replace(/ /g, "")] ?? row[header] ?? "";
            return `"${String(val).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
};

/**
 * Generate a PDF Error Report
 */
export const generateErrorReportPDF = (errors: any[], aiExplanation: string, filename: string) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(124, 92, 255); // #7c5cff
    doc.text("EDI Insight: Error Diagnostic Report", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Source File: ${filename}`, 14, 35);

    // AI Diagnosis Section
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("AI Business Risk Diagnosis", 14, 50);

    doc.setFontSize(11);
    const splitExplanation = doc.splitTextToSize(aiExplanation || "No AI explanation available.", 180);
    doc.text(splitExplanation, 14, 60);

    const explanationHeight = (splitExplanation.length * 5) + 65;

    // Technical Errors Table
    doc.setFontSize(16);
    doc.text("Technical Validation Errors", 14, explanationHeight + 10);

    const tableRows = errors.map(err => [
        err.id || "??",
        err.segment || "??",
        err.severity || "error",
        err.message || "Unknown error"
    ]);

    autoTable(doc, {
        startY: explanationHeight + 15,
        head: [['ID', 'Segment', 'Severity', 'Message']],
        body: tableRows,
        headStyles: { fillColor: [124, 92, 255] },
        alternateRowStyles: { fillColor: [245, 245, 255] },
        margin: { top: 30 }
    });

    doc.save(`report_${filename.split('.')[0]}.pdf`);
};

/**
 * Download raw text (e.g. corrected EDI)
 */
export const downloadText = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
