// PageSettingsControls.tsx (estratto con le modifiche rilevanti)
import { useCardsStore, useSettingsStore } from "@/store";
import {
  Button,
  HR,
} from "flowbite-react";
import { useState } from "react";
import { ExportActions } from "./LayoutSettings/ExportActions";
import { HiddenSettingsManager } from "./LayoutSettings/HiddenSettingsManager";
import { useImageProcessing } from "@/hooks/useImageProcessing";

type PageSettingsControlsProps = {
  reprocessSelectedImages: ReturnType<typeof useImageProcessing>["reprocessSelectedImages"];
};

export function PageSettingsControls({ reprocessSelectedImages }: PageSettingsControlsProps) {
  // keep any selectors used by Reset / ExportActions etc.
  const resetSettings = useSettingsStore((s) => s.resetSettings);
  const clearAllCardsAndImages = useCardsStore((s) => s.clearAllCardsAndImages);

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleReset = () => setShowResetConfirmModal(true);

  const confirmReset = async () => {
    setShowResetConfirmModal(false);
    try {
      await clearAllCardsAndImages();
      resetSettings();
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((n) => n.startsWith("proxxied-")).map((n) => caches.delete(n)));
      }
    } catch (e) {
      console.error("Error clearing app data:", e);
    } finally {
      window.location.reload();
    }
  };

  return (
    <div className="w-1/4 min-w-[18rem] max-w-[26rem] p-4 bg-gray-100 dark:bg-gray-700 h-full flex flex-col gap-4 overflow-y-auto">
      {/* Hidden manager = mantiene la logica attiva */}
      <HiddenSettingsManager reprocessSelectedImages={reprocessSelectedImages} />

      <h2 className="text-2xl font-semibold dark:text-white">Settings</h2>

      <div className="space-y-4">
        {/* Solo la parte pubblica: ExportActions */}
        <ExportActions />

        <HR className="dark:bg-gray-500" />
      </div>

      <div className="w-full flex justify-center">
        <span
          className="text-gray-400 hover:underline cursor-pointer text-sm font-medium"
          onClick={resetSettings}
        >
          Reset Settings
        </span>
      </div>

      <div className="w-full flex justify-center">
        <span
          className="text-red-600 hover:underline cursor-pointer text-sm font-medium"
          onClick={handleReset}
        >
          Reset App Data
        </span>
      </div>

      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-96 text-center">
            <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Confirm Reset App Data
            </div>
            <div className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              This will clear all saved Proxxied data (cards, cached images,
              settings) and reload the page. Continue?
            </div>
            <div className="flex justify-center gap-4">
              <Button color="failure" className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmReset}>
                Yes, I'm sure
              </Button>
              <Button color="gray" onClick={() => setShowResetConfirmModal(false)}>
                No, cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto space-y-3 pt-4">
        <a
          href="https://github.com/kclipsto/proxies-at-home"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-md underline text-center text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
        >
          Code by Kaiser Clipston (Github)
        </a>
      </div>
    </div>
  );
}
