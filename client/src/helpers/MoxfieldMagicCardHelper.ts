import {MagicCard} from "../types/Card"
import type {DeckData} from "../types/Card"

/**
 * Crea una lista di oggetti MagicCard basandosi sui dati del deck.
 * Prioritizza il Commander da 'data.commanders' e previene la duplicazione
 * se lo stesso Commander è presente anche in 'data.mainboard'.
 */
export function createCardsFromDeckData(data: DeckData): MagicCard[] {
    const cardObjects: MagicCard[] = [];
    // Set per tracciare i nomi dei Commander già aggiunti.
    const commanderCardNames: Set<string> = new Set(); 
    
    // --- 1. Gestione dei Commander (Priorità su data.commanders) ---
    console.log("Processing Commander(s) from data.commanders...");
    
    // Si assume che 'data.commanders' contenga il Commander corretto
    if (data.commanders) {
        const commanderdKeys = Object.keys(data.commanders);
        for (const commanderKey of commanderdKeys) {
            const commanderItem = data.commanders[commanderKey];
            // I dati della carta sono annidati in .card in questo formato (corretto per DFC)
            const cardData = commanderItem.card; 
            
            if (cardData) {
                try {
                    const card = new MagicCard(cardData, true);
                    console.log("Commander Card added:", card.name);
                    cardObjects.push(card);
                    commanderCardNames.add(cardData.name);
                } catch (e) {
                    console.error(`Failed to process Commander card ${cardData}:`, e);
                }
            }
        }
    } 
    // Opzionale: Aggiungo il supporto per 'data.main' come fallback solo se non ci sono 'data.commanders'
    else if (data.main) {
        try {
            const cardData = data.main; 
            const card = new MagicCard(cardData, true);
            console.log("Single Commander Card from data.main (Fallback):", card.name);
            cardObjects.push(card);
            commanderCardNames.add(cardData.name);
        } catch (e) {
             console.error("Failed to process Single Commander from data.main:", e);
        }
    }
    
    if (commanderCardNames.size === 0) {
         console.warn("WARNING: Commander card was not found in 'data.commanders' or 'data.main'.");
    }
    

    // --- 2. Gestione delle carte Mainboard ---
    console.log("Processing Mainboard cards...");
    const mainboardKeys = Object.keys(data.mainboard);

    for (const cardName of mainboardKeys) {
        // CORREZIONE DEFINITIVA: Salta la carta se è già stata aggiunta come Commander
        if (commanderCardNames.has(cardName)) {
            console.log(`Skipping mainboard entry for Commander to prevent duplication: ${cardName}`);
            continue; 
        }

        const mainboardItem = data.mainboard[cardName];
        
        const cardData = mainboardItem.card;
        const quantity = mainboardItem.quantity;

        // Crea un oggetto MagicCard per *ogni copia* della carta
        for (let i = 0; i < quantity; i++) {
            try {
                // Passa false per il flag isCommander
                const card = new MagicCard(cardData, false);
                cardObjects.push(card); 
            } catch (e) {
                console.error(`Failed to process mainboard card ${cardName} (Copy ${i + 1}):`, e);
            }
        }
    }
    
    // --- 3. Gestione delle carte Sideboard (opzionale) ---
    // Aggiunto per completezza, gestendo lo stesso meccanismo di duplicazione/esclusione
    if (data.sideboard) {
         console.log("Processing Sideboard cards...");
         const sideboardKeys = Object.keys(data.sideboard);
         
         for (const cardName of sideboardKeys) {
            // Salta se la carta è già stata aggiunta come Commander
            if (commanderCardNames.has(cardName)) {
                 console.log(`Skipping sideboard entry for Commander: ${cardName}`);
                 continue;
            }
             
            const sideboardItem = data.sideboard[cardName];
            const cardData = sideboardItem.card;
            const quantity = sideboardItem.quantity;
            
            // Aggiungi le carte in sideboard
             for (let i = 0; i < quantity; i++) {
                try {
                    const card = new MagicCard(cardData, false);
                    cardObjects.push(card); 
                } catch (e) {
                    console.error(`Failed to process sideboard card ${cardName} (Copy ${i + 1}):`, e);
                }
            }
         }
    }

    console.log(`Successfully created ${cardObjects.length} card objects.`);
    return cardObjects;
}