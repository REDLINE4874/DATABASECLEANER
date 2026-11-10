importScripts('../../lib/xlsx.full.min.js');

self.onmessage = event => {
  try {
    const workbook = XLSX.read(event.data, { type: 'array', cellText: true, cellDates: false });
    const sheets = workbook.SheetNames.map(name => ({
      name,
      data: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        header: 1, defval: '', raw: false, blankrows: false,
      }),
    }));
    self.postMessage({ sheets });
  } catch (error) {
    self.postMessage({ error: error.message || 'El libro de Excel no se pudo leer.' });
  }
};
