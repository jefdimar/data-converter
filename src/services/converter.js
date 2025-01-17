const PDFExtract = require('pdf.js-extract').PDFExtract;
const pdfExtract = new PDFExtract();
const path = require('path');
const fs = require('fs');

class Converter {
  static async processFile(filePath) {
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF files are supported');
    }
    return await this.pdfToJson(filePath);
  }

  static extractTableData(content) {
    const filteredContent = content
      .filter(item => item.str.trim().length > 0)
      .sort((a, b) => a.y - b.y);

    const uniqueYPositions = [...new Set(filteredContent.map(item => item.y))];

    const firstRowY = uniqueYPositions[0];
    const headerElements = filteredContent
      .filter(el => Math.abs(el.y - firstRowY) < 1)
      .sort((a, b) => a.x - b.x)
      .filter(el => el.str.trim().length > 0);

    const keysValue = headerElements.map(el =>
      el.str.trim().toLowerCase().replace(/[\s-]/g, '_')
    );

    const data = [];
    for (let i = 1; i < uniqueYPositions.length; i++) {
      const rowY = uniqueYPositions[i];
      const rowElements = filteredContent
        .filter(el => Math.abs(el.y - rowY) < 1)
        .sort((a, b) => a.x - b.x)
        .filter(el => el.str.trim().length > 0);

      if (rowElements.length > 0) {
        const rowData = {};
        rowElements.forEach((el, index) => {
          if (index < keysValue.length) {
            const key = keysValue[index];
            const value = el.str.trim();
            rowData[key] = ['kode_indikator', 'id_sasaran_fk', 'ordering'].includes(key)
              ? parseInt(value) || value
              : value;
          }
        });
        data.push(rowData);
      }
    }

    return { keysValue, data };
  }

  static async pdfToJson(filePath) {
    try {
      const data = await pdfExtract.extract(filePath, {});
      const firstPage = data.pages[0];

      const { keysValue, data: tableData } = this.extractTableData(firstPage.content);

      const result = {
        status: "success",
        data: {
          fileName: path.basename(filePath),
          totalRecords: tableData.length,
          keysValue: keysValue,
          data: tableData
        }
      };

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, '../../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      // Write to JSON file
      const jsonPath = path.join(tempDir, `${Date.now()}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      return {
        status: "error",
        message: error.message
      };
    }
  }
}

module.exports = Converter;