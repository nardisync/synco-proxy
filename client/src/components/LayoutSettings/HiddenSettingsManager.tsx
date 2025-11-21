// ./LayoutSettings/HiddenSettingsManager.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db";
import { useSettingsStore } from "@/store";

const INCH_TO_MM = 25.4;
const MAX_BROWSER_DIMENSION = 16384;

type Props = {
  reprocessSelectedImages: (cards: any[], newBleedWidth: number) => void;
};

export function HiddenSettingsManager({ reprocessSelectedImages }: Props) {
  // --- selectors (prendi solo quello che serve per i calcoli/effects) ---
  const pageSizeUnit = useSettingsStore((s) => s.pageSizeUnit);
  const pageWidth = useSettingsStore((s) => s.pageWidth);
  const pageHeight = useSettingsStore((s) => s.pageHeight);
  const dpi = useSettingsStore((s) => s.dpi);
  const setDpi = useSettingsStore((s) => s.setDpi);
  const bleedEdgeWidth = useSettingsStore((s) => s.bleedEdgeWidth);

  // cards per reprocess
  const cards = useLiveQuery(() => db.cards.orderBy("order").toArray(), []) || [];
  const cardsRef = useRef(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // --- maxSafeDpiForPage (come prima) ---
  const maxSafeDpiForPage = useMemo(() => {
    const widthIn = pageSizeUnit === "in" ? pageWidth : pageWidth / INCH_TO_MM;
    const heightIn = pageSizeUnit === "in" ? pageHeight : pageHeight / INCH_TO_MM;
    return Math.floor(
      Math.min(MAX_BROWSER_DIMENSION / Math.max(0.0001, widthIn), MAX_BROWSER_DIMENSION / Math.max(0.0001, heightIn))
    );
  }, [pageWidth, pageHeight, pageSizeUnit]);

  // --- availableDpiOptions (come prima) ---
  const availableDpiOptions = useMemo(() => {
    const options: { label: string; value: number }[] = [];
    for (let i = 300; i <= maxSafeDpiForPage; i += 300) {
      options.push({ label: `${i}`, value: i });
    }
    if (maxSafeDpiForPage % 300 !== 0) {
      options.push({ label: `${maxSafeDpiForPage} (Max)`, value: maxSafeDpiForPage });
    }
    return options;
  }, [maxSafeDpiForPage]);

  // --- effect: se dpi non è più valido, setta il più alto disponibile ---
  useEffect(() => {
    if (!availableDpiOptions.some((opt) => opt.value === dpi)) {
      const highestOption = availableDpiOptions[availableDpiOptions.length - 1];
      if (highestOption) {
        setDpi(highestOption.value);
      }
    }
  }, [availableDpiOptions, dpi, setDpi]);

  // --- debounce reprocess quando cambia bleedEdgeWidth ---
  useEffect(() => {
    // se non c'è funzione non c'è bisogno
    if (!reprocessSelectedImages) return;
    const t = setTimeout(() => {
      reprocessSelectedImages(cardsRef.current, bleedEdgeWidth);
    }, 500);

    return () => clearTimeout(t);
  }, [bleedEdgeWidth, reprocessSelectedImages]);

  // Non renderizza nulla: mantiene la logica "dietro le quinte"
  return null;
}
