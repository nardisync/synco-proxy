import { fetchEventSource } from "@microsoft/fetch-event-source";
import React, { useRef, useState } from "react";
import { db } from "@/db";
import { API_BASE, LANGUAGE_OPTIONS } from "@/constants";
import {
    cardKey,
    parseDeckToInfos,
    type CardInfo,
} from "@/helpers/CardInfoHelper";

import { useLoadingStore, useSettingsStore } from "@/store";
import type { CardOption, ScryfallCard } from "@/types/Card";
import { addCards, addRemoteImage } from "@/helpers/dbUtils";
import {
    Button,
    List,
    ListItem,
    Select,
    Textarea,
    Tooltip,
} from "flowbite-react";
import { ExternalLink, HelpCircle } from "lucide-react";



export function ScryfallImporter(props: { confirmClearFunction: () => any; }) {
    const [deckText, setDeckText] = useState("");
    const fetchController = useRef<AbortController | null>(null);

    const globalLanguage = useSettingsStore((s) => s.globalLanguage ?? "en");
    const setGlobalLanguage = useSettingsStore(
        (s) => s.setGlobalLanguage ?? (() => { })
    );

    const { showClearConfirmModal, setShowClearConfirmModal } = useLoadingStore();

    const { setLoadingTask, setLoadingMessage } = useLoadingStore.getState();


    const handleSubmit = async () => {
        if (fetchController.current) {
            fetchController.current.abort();
        }
        fetchController.current = new AbortController();
        const signal = fetchController.current.signal;

        try {
            const infos = parseDeckToInfos(deckText || "");
            if (!infos.length) return;

            setLoadingTask("Fetching cards");

            const uniqueMap = new Map<string, CardInfo>();
            for (const { info } of infos) uniqueMap.set(cardKey(info), info);
            const uniqueInfos = Array.from(uniqueMap.values());

            const optionByKey: Record<string, ScryfallCard> = {};

            await fetchEventSource(`${API_BASE}/api/stream/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cardQueries: uniqueInfos,
                    language: globalLanguage,
                }),
                signal,
                onopen: async (res) => {
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(
                            `Failed to fetch cards: ${res.status} ${res.statusText} - ${errorText}`
                        );
                    }
                },
                onmessage: async (ev) => {
                    if (ev.event === "progress") {
                        const progress = JSON.parse(ev.data);
                        setLoadingMessage(`(${progress.processed} / ${progress.total})`);
                    } else if (ev.event === "card-found") {
                        const card = JSON.parse(ev.data) as ScryfallCard;
                        if (!card?.name) return;

                        const k = cardKey({
                            name: card.name,
                            set: card.set,
                            number: card.number,
                        });
                        optionByKey[k] = card;
                        const nameOnlyKey = cardKey({ name: card.name });
                        if (!optionByKey[nameOnlyKey]) optionByKey[nameOnlyKey] = card;
                    } else if (ev.event === "done") {
                        const cardsToAdd: (Omit<CardOption, "uuid" | "order"> & {
                            imageId?: string;
                        })[] = [];

                        for (const { info, quantity } of infos) {
                            const k = cardKey(info);
                            const fallbackK = cardKey({ name: info.name });
                            const card = optionByKey[k] ?? optionByKey[fallbackK];
                            const imageId = await addRemoteImage(card?.imageUrls ?? []);

                            for (let i = 0; i < quantity; i++) {
                                cardsToAdd.push({
                                    name: card?.name || info.name,
                                    set: card?.set,
                                    number: card?.number,
                                    lang: card?.lang,
                                    isUserUpload: false,
                                    imageId: imageId,
                                });
                            }
                        }

                        if (cardsToAdd.length > 0) {
                            await addCards(cardsToAdd);
                        }

                        setDeckText("");
                    }
                },
                onclose: () => {
                    setLoadingTask(null);
                    fetchController.current = null;
                },
                onerror: (err) => {
                    // The library handles retries, this is for fatal errors
                    setLoadingTask(null);
                    if (err.name !== "AbortError") {
                        console.error("[FetchCards] Streaming Error:", err);
                        alert("An error occurred while fetching cards. Please try again.");
                    }
                    fetchController.current = null;
                    throw err; // This will stop retries
                },
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                if (err.name !== "AbortError") {
                    setLoadingTask(null);
                    console.error("[FetchCards] Error:", err);
                    alert(err.message || "Something went wrong while fetching cards.");
                }
            } else {
                setLoadingTask(null);
                console.error("[FetchCards] Unknown Error:", err);
                alert("An unknown error occurred while fetching cards.");
            }
        }
    };

    const handleClear = async () => {
        const count = await db.cards.count();
        if (count === 0) {
            await props.confirmClearFunction();
            setShowClearConfirmModal(false);
        } else {
            setShowClearConfirmModal(true);
        }
    };



    return (
        <div className="space-y-4">
            <div className="space-y-1">
                <h6 className="font-medium dark:text-white">
                    Add Cards (
                    <a
                        href="https://scryfall.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-600 dark:hover:text-blue-400"
                    >
                        Scryfall
                        <ExternalLink className="inline-block size-4 ml-1" />
                    </a>
                    )
                </h6>

                <Textarea
                    className="h-64"
                    placeholder={`1x Sol Ring\n2x Counterspell\nFor specific art include set / CN\neg. Strionic Resonator (lcc)\nor Repurposing Bay (dft) 380`}
                    value={deckText}
                    onChange={(e) => setDeckText(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-2">
                <Button color="blue" onClick={handleSubmit}>
                    Fetch Cards
                </Button>
                <Button color="red" onClick={handleClear}>
                    Clear Cards
                </Button>
            </div>

            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h6 className="font-medium dark:text-white">Scryfall Cards Language</h6>
                    <Tooltip content="Used for Scryfall lookups">
                        <HelpCircle className="w-4 h-4 text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 cursor-pointer" />
                    </Tooltip>
                </div>

                <Select
                    className="w-full rounded-md bg-gray-300 dark:bg-gray-600 my-2 text-sm text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
                    value={globalLanguage}
                    onChange={(e) => setGlobalLanguage(e.target.value)}
                >
                    {LANGUAGE_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>
                            {o.label}
                        </option>
                    ))}
                </Select>
            </div>

            <div>
                <h6 className="font-medium dark:text-white">Tips:</h6>

                <List className="text-sm dark:text-white/60">
                    <ListItem>To change a card art - click it</ListItem>
                    <ListItem>
                        To move a card - drag from the box at the top right
                    </ListItem>
                    <ListItem>
                        To duplicate or delete a card - right click it
                    </ListItem>
                </List>
            </div>
        </div>
    )
}