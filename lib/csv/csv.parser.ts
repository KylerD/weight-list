import Papa from "papaparse";

export type ParsedCSV = {
  headers: string[];
  rows: Record<string, string>[];
};

export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields ?? [];
        const rows = results.data as Record<string, string>[];
        if (headers.length === 0) {
          reject(new Error("No columns found in CSV"));
          return;
        }
        resolve({ headers, rows });
      },
      error(err) {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}
