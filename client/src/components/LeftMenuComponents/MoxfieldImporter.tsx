import React, { useState } from 'react';
import { useCardsStore } from '@/store';
import { Button, TextInput, Label, Tooltip, HelperText } from "flowbite-react";
import { HelpCircle } from "lucide-react";
import { useLoadingStore } from '@/store/loading';
import { urlToFile } from '@/helpers/ImageHelper';

import { } from "flowbite-react";

import type { DeckData } from '@/types/Card'
import { createCardsFromDeckData } from "@/helpers/MoxfieldMagicCardHelper";


// Interfaccia per i dati della carta necessari allo store
export interface NewCardEntry {
    name: string;
    imageUrl: string;
    quantity: number;
}

/**
 * Funzione per estrarre l'ID del mazzo dal link di Moxfield.
 */
function extractDeckId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);

    if (match && match[1]) {
        console.log(`[MoxfieldHandler] ID Moxfield estratto: ${match[1]}`);
        return match[1];
    }

    console.warn(`[MoxfieldHandler] ATTENZIONE - Nessun ID Moxfield trovato.`);
    return null;
}


// Importa la logica core che abbiamo esportato nel Passo 1
import { processMpcUploadFiles } from "@/helpers/dbUtils";


async function autoDownloadAndProcess(uniqueCardEntries: NewCardEntry[]) {
    const { setLoadingTask, setProgress, setLoadingMessage } = useLoadingStore.getState();

    // NUOVO: Usiamo una Map per associare il nome della carta al File scaricato
    const fileMap = new Map<string, File>();

    try {
        // 1. GESTIONE DEL DOWNLOAD
        setLoadingTask("Processing Images");
        const total = uniqueCardEntries.length;

        for (let i = 0; i < total; i++) {
            const entry = uniqueCardEntries[i];
            // Il messaggio mostra ancora il nome della carta unica
            setLoadingMessage(`Downloading artwork for: ${entry.name}`);
            setProgress(Math.round((i / total) * 100));

            // Scarica l'immagine e crea l'oggetto File
            const file = await urlToFile(entry.imageUrl, entry.name);
            // AGGIUNGI IL FILE SCARICATO ALLA MAPPA, USANDO IL NOME COME CHIAVE
            fileMap.set(entry.name, file);
        }

        // Pulizia dello stato del download
        setProgress(100);
        setLoadingMessage("Artwork download complete. Starting local processing...");

        // 2. CHIAMATA ALLA LOGICA CORE
        // Passa la lista delle entry uniche (che include la quantità) e la Map dei file
        await processMpcUploadFiles(uniqueCardEntries, fileMap, { hasBakedBleed: false });

    } catch (error) {
        console.error("Errore critico durante l'importazione:", error);
        setLoadingTask(null);
        setLoadingMessage("Import failed. Check console for details.");
        setProgress(0);
    }
}


/**
 * Funzione di recupero dei dati del deck dall'API Moxfield e di elaborazione con la classe MagicCard.
 */
async function getMoxfieldDecklist(deckId: string): Promise<NewCardEntry[]> {
    const PROXY_URL = `/mox-api/v2/decks/all/${deckId}`;

    console.log(`[MoxfieldHandler] Richiesta API in corso a: ${PROXY_URL}`);

    try {
        const response = await fetch(PROXY_URL, {
            headers: { 'User-Agent': 'ProxxiesAtHomeMoxfieldImporter/1.0' }
        });

        if (!response.ok) {
            console.error(`[MoxfieldHandler] Errore HTTP! Stato: ${response.status}`);
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const deckData = await response.json();
        console.log(`[MoxfieldHandler] Dati JSON ricevuti. Inizio elaborazione con MagicCard...`);
        console.log(`[MoxfieldHandler] Dati JSON :`, deckData);

        // 1. Usa la tua funzione per creare gli oggetti MagicCard
        const allCardObjects = createCardsFromDeckData(deckData as DeckData);

        // 2. Raggruppa gli oggetti per nome e usa il metodo di recupero immagine
        const cardMap = new Map<string, { count: number, imageUrl: string }>();

        console.log("Full deck:", allCardObjects)

        // Poiché `createCardsFromDeckData` crea un oggetto per ogni copia, 
        // dobbiamo raggrupparli e contare le quantità.
        for (const cardObj of allCardObjects) {
            const name = cardObj.name;

            // Scegli l'URL dell'immagine da usare. 
            // Preferiamo Scryfall per alta risoluzione e affidabilità se Moxfield non è cruciale.
            // Se preferisci Moxfield, usa cardObj.getMoxfieldImageUrl()
            const imageUrl = cardObj.getScryfallImageUrl();

            if (cardMap.has(name)) {
                cardMap.get(name)!.count += 1;
            } else {
                cardMap.set(name, { count: 1, imageUrl });
            }
        }

        // 3. Converte la mappa nel formato `NewCardEntry` richiesto dallo store
        const cardEntries: NewCardEntry[] = Array.from(cardMap.entries()).map(([name, data]) => ({
            name: name,
            imageUrl: data.imageUrl,
            quantity: data.count,
        }));

        console.log(`[MoxfieldHandler] Elaborazione completata. Trovate ${cardEntries.length} carte uniche.`);
        return cardEntries; // La funzione si limita a restituire la lista

    } catch (error) {
        console.error('[MoxfieldHandler] Errore grave durante il recupero del deck:', error);
        return [];
    }
}


// ==========================================================
// COMPONENTE REACT
// ==========================================================
export function MoxfieldImporter() {
    const [moxfieldLink, setMoxfieldLink] = useState('');
    const [isLoadingMoxfield, setIsLoadingMoxfield] = useState(false);


    const addCardsFromMoxfield = useCardsStore((state) => (state as any).addCardsFromMoxfield);


    const handleImportMoxfield = async () => {
        console.log("[MoxfieldHandler] Passo 2.1: Inizio processo di importazione.");
        if (isLoadingMoxfield) return;

        const deckId = extractDeckId(moxfieldLink);

        if (!deckId) {
            alert("URL Moxfield non valido. Assicurati che il link sia nel formato corretto.");
            setIsLoadingMoxfield(false);
            return;
        }

        setIsLoadingMoxfield(true);

        try {
            console.log("[MoxfieldHandler] Passo 3.2: Inizio recupero dati con ID:", deckId);
            // 1. Recupera i dati (senza avviare il download)
            const cardEntries = await getMoxfieldDecklist(deckId);

            if (cardEntries.length === 0) {
                console.warn("[MoxfieldHandler] Nessuna carta valida trovata nel mazzo.");
                alert("Nessuna carta valida trovata nel mazzo Moxfield.");
                return;
            }

            // 2. Avvia il download e il salvataggio nel DB (che gestisce il proprio stato di loading)
            // La logica di autoDownloadAndProcess è completamente ASINCRONA
            await autoDownloadAndProcess(cardEntries);

            // Rimuovi la logica obsoleta 'addCardsFromMoxfield' e il fallback
            // perché il lavoro è stato fatto da autoDownloadAndProcess -> processMpcUploadFiles.

            console.log(`[MoxfieldHandler] Processo Moxfield completato con successo. Aggiunte ${cardEntries.length} carte uniche.`);
            setMoxfieldLink(''); // Pulisci il campo input

        } catch (error) {
            console.error("[MoxfieldHandler] Errore durante l'importazione:", error);
            alert("Si è verificato un errore durante l'importazione del mazzo.");
        } finally {
            setIsLoadingMoxfield(false);
        }
    };


    return (
        <div className="space-y-2 p-3 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-gray-800">
            <div className='flex items-center justify-between'>
                <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                    Moxfield Deck Importer
                </h3>
                <Tooltip content="Automatically import all cards (including Commander, sideboards, etc.) from a Moxfield link, using the MagicCard class to retrieve high-quality Scryfall images.">
                    <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 cursor-pointer" />
                </Tooltip>
            </div>

            <Label htmlFor="moxfield-link" />
            <TextInput
                id="moxfield-link"
                className="w-full"
                type="text"
                value={moxfieldLink}
                onChange={(e) => setMoxfieldLink(e.target.value)}
                placeholder="Esempio: https://moxfield.com/decks/..."
                disabled={isLoadingMoxfield}
            />

            <Button
                color="blue"
                className="w-full mt-2"
                onClick={handleImportMoxfield}
                disabled={isLoadingMoxfield || !moxfieldLink.includes('moxfield.com/decks/')}
            >
                {isLoadingMoxfield ? 'Importazione in corso...' : 'Importa Carte e Immagini'}
            </Button>
            <HelperText className="text-blue-700 dark:text-blue-300">
                L'importazione da Moxfield usa immagini da Scryfall.
            </HelperText>
        </div>
    );
}