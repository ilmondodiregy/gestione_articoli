import { GoogleGenAI } from "@google/genai";
import { InventoryItem, StockMovement, MovementType } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeInventory = async (items: InventoryItem[], movements: StockMovement[], customPrompt?: string): Promise<string> => {
  try {
    let prompt = '';

    if (customPrompt) {
        prompt = customPrompt;
    } else {
        // Default Logic (Dashboard/Quick View)
        const outMovements = movements.filter(m => m.type === MovementType.OUT);
        
        const itemCounts = new Map<string, number>();
        outMovements.forEach(m => {
            itemCounts.set(m.itemName, (itemCounts.get(m.itemName) || 0) + m.quantity);
        });

        const topSellers = Array.from(itemCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, qty]) => `- ${name}: ${qty} pezzi`)
            .join('\n');

        const totalOut = outMovements.reduce((acc, m) => acc + m.quantity, 0);

        prompt = `
          Agisci come un analista di produzione e vendite.
          Dati di Vendita (Storico):
          - Totale Pezzi Usciti: ${totalOut}
          - Top 5 Articoli più venduti:
          ${topSellers}

          Domanda: Se devo pianificare la produzione/riordino per il prossimo periodo, quali articoli devo privilegiare? 
          Dammi 3 punti elenco secchi e una breve conclusione sulla tendenza.
        `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Impossibile generare l'analisi al momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Errore durante l'analisi AI. Verifica la connessione o la chiave API.";
  }
};

export const generateDescription = async (itemName: string, category: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Scrivi una descrizione commerciale accattivante e tecnica (max 30 parole) per un prodotto di magazzino. 
            Nome: ${itemName}
            Categoria: ${category}
            Lingua: Italiano.`
        });
        return response.text || "";
    } catch (e) {
        return "";
    }
}

export const analyzeProductImage = async (base64Image: string): Promise<{name?: string, category?: string, description?: string}> => {
  try {
    // Clean base64 string if needed
    const base64Data = base64Image.split(',')[1] || base64Image;
    // Detect mime type or fallback
    const mimeType = base64Image.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || 'image/jpeg';

    const prompt = `
      Analizza questa immagine di un prodotto commerciale.
      Agisci come un magazziniere esperto e restituisci un oggetto JSON con questi campi in Italiano:
      - name: Un nome breve e chiaro del prodotto.
      - category: La categoria più appropriata (es. Elettronica, Abbigliamento, Casa, Accessori, Altro).
      - description: Una descrizione tecnica ma sintetica (max 20 parole).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Image Analysis Error:", error);
    return {};
  }
};

/**
 * Natural Language Querying for Warehouse Data
 */
export const queryWarehouse = async (items: InventoryItem[], movements: StockMovement[], userQuery: string): Promise<string> => {
    try {
        // 1. Prepare minimal context to save tokens but provide value
        const totalStock = items.reduce((acc, i) => acc + i.quantity, 0);
        const stockValue = items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
        
        // Simplify Item list (only name, qty, price, category)
        const itemsSummary = items.map(i => `${i.name} (Cat: ${i.category}, Qty: ${i.quantity}, Prezzo: ${i.price}€)`).join('; ');
        
        // Simplify Recent Movements (Last 30)
        const recentMoves = movements
            .sort((a,b) => b.date - a.date)
            .slice(0, 30)
            .map(m => `[${new Date(m.date).toLocaleDateString()}] ${m.type} ${m.quantity}pz ${m.itemName}`)
            .join('\n');

        const prompt = `
            Sei l'assistente virtuale intelligente di un magazzino (Warehouse AI).
            Rispondi alla domanda dell'utente basandoti ESCLUSIVAMENTE sui dati forniti qui sotto.
            
            DATI GENERALI:
            - Totale Pezzi in stock: ${totalStock}
            - Valore Totale Stock: €${stockValue.toFixed(2)}
            
            LISTA ARTICOLI (Snapshot):
            ${itemsSummary}
            
            ULTIMI 30 MOVIMENTI (Log):
            ${recentMoves}
            
            DOMANDA UTENTE: "${userQuery}"
            
            ISTRUZIONI:
            - Rispondi in italiano.
            - Sii conciso e diretto.
            - Se chiedono calcoli specifici non presenti nei dati generali, falli tu basandoti sulla lista articoli.
            - Se l'utente chiede informazioni non presenti nei dati, dì gentilmente che non hai quell'informazione.
            - Usa formattazione markdown (grassetto, elenchi) se utile.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Non sono riuscito a trovare una risposta nei dati forniti.";

    } catch (e) {
        console.error(e);
        return "Mi dispiace, ho avuto un problema nell'analizzare la tua richiesta.";
    }
}