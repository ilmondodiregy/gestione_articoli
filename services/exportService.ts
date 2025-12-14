import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { StockMovement, MovementType } from '../types';

export const exportService = {
  
  /**
   * Esporta i movimenti in Excel (.xlsx)
   */
  exportMovementsToExcel: (movements: StockMovement[]) => {
    // 1. Prepare Data for Excel
    const data = movements.map(m => ({
      'ID Movimento': m.id,
      'Data': new Date(m.date).toLocaleString('it-IT'),
      'Articolo': m.itemName,
      'Tipo': m.type === MovementType.IN ? 'CARICO' : 'SCARICO',
      'Quantità': m.quantity,
      'Note': m.reason || '-'
    }));

    // 2. Create Sheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-width columns (basic approximation)
    const wscols = [
        { wch: 30 }, // ID
        { wch: 20 }, // Data
        { wch: 30 }, // Articolo
        { wch: 10 }, // Tipo
        { wch: 10 }, // Qty
        { wch: 20 }  // Note
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Movimenti");

    // 3. Download
    XLSX.writeFile(workbook, `Movimenti_Magazzino_${new Date().toISOString().slice(0,10)}.xlsx`);
  },

  /**
   * Esporta i movimenti in PDF formattato (DDT Style)
   */
  exportMovementsToPdf: (movements: StockMovement[], filtersInfo: string = '') => {
    const doc: any = new jsPDF();

    // Header Aziendale (Simulato)
    doc.setFontSize(18);
    doc.text("Magazzino Pro Cloud", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Report Movimenti di Magazzino", 14, 28);
    doc.text(`Generato il: ${new Date().toLocaleString('it-IT')}`, 14, 33);
    
    if (filtersInfo) {
        doc.text(`Filtri attivi: ${filtersInfo}`, 14, 38);
    }

    // Table Data
    const tableColumn = ["Data", "Articolo", "Tipo", "Q.tà", "ID"];
    const tableRows: any[] = [];

    movements.forEach(m => {
      const movementData = [
        new Date(m.date).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour:'2-digit', minute:'2-digit'}),
        m.itemName,
        m.type === MovementType.IN ? 'CARICO' : 'SCARICO',
        m.quantity,
        m.id.substring(0, 8) + '...'
      ];
      tableRows.push(movementData);
    });

    // Generate Table
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20 },
          3: { cellWidth: 15, halign: 'right' },
          4: { cellWidth: 25, fontStyle: 'italic' }
      },
      didParseCell: function(data: any) {
          // Color coding for IN/OUT
          if (data.section === 'body' && data.column.index === 2) {
              if (data.cell.raw === 'CARICO') {
                  data.cell.styles.textColor = [16, 185, 129]; // Emerald
              } else {
                  data.cell.styles.textColor = [225, 29, 72]; // Rose
              }
          }
      }
    });

    // Footer Stats
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalIn = movements.filter(m => m.type === MovementType.IN).reduce((a,b) => a + b.quantity, 0);
    const totalOut = movements.filter(m => m.type === MovementType.OUT).reduce((a,b) => a + b.quantity, 0);

    doc.setFontSize(9);
    doc.setTextColor(50);
    doc.text(`Totale Carichi: ${totalIn} pz`, 14, finalY);
    doc.text(`Totale Scarichi: ${totalOut} pz`, 14, finalY + 5);
    doc.text(`Totale Righe: ${movements.length}`, 14, finalY + 10);

    doc.save(`Report_Magazzino_${new Date().toISOString().slice(0,10)}.pdf`);
  }
};