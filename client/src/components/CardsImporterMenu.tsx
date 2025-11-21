import React from "react";
import fullLogo from "@/assets/fullLogo.png";
import { API_BASE } from "@/constants";

import { useCardsStore, useLoadingStore } from "@/store";
import {
  Button,
  HR,
} from "flowbite-react";
import { MoxfieldImporter } from "./LeftMenuComponents/MoxfieldImporter";
import { MPCAutofillImporter } from './LeftMenuComponents/MPCAutofillImporter'
import { ScryfallImporter } from './LeftMenuComponents/ScryfallImporter'
import axios from "axios";


export function CardsImporterMenu() {

  const { showClearConfirmModal, setShowClearConfirmModal } = useLoadingStore();
  const { setLoadingTask, setLoadingMessage } = useLoadingStore.getState();

  const clearAllCardsAndImages = useCardsStore(
    (state) => state.clearAllCardsAndImages
  );

  const confirmClear = async () => {
    setLoadingTask("Clearing Images");

    try {
      await clearAllCardsAndImages();
      // The server cache clear is now handled by the clearAllCardsAndImages action if needed
      // or can be removed if the server cache is no longer relevant for client-side clear.
      // For now, we'll keep the server call as it might be clearing other things.
      try {
        await axios.delete(`${API_BASE}/api/cards/images`, {
          timeout: 15000,
        });
      } catch (e) {
        console.warn(
          "[Clear] Server cache clear failed (UI already cleared):",
          e
        );
      }
    } catch (err: unknown) {
      console.error("[Clear] Error:", err);
      if (err instanceof Error) {
        alert(err.message || "Failed to clear images.");
      } else {
        alert("An unknown error occurred while clearing images.");
      }
    } finally {
      setLoadingTask(null);
      setShowClearConfirmModal(false);
    }
  };


  return (
    <div className="w-1/5 dark:bg-gray-700 bg-gray-100 flex flex-col">
      <img src={fullLogo} alt="Proxxied Logo" />

      <div className="flex-1 flex flex-col overflow-y-auto gap-6 px-4 pb-4">
        <MoxfieldImporter />
        <HR className="my-0 dark:bg-gray-500" />

        <MPCAutofillImporter />

        <HR className="my-0 dark:bg-gray-500" />

        <ScryfallImporter confirmClearFunction={confirmClear} />

        <HR className="my-0 dark:bg-gray-500" />
      </div>

      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-gray-900/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-96 text-center">
            <div className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
              Confirm Clear Cards
            </div>
            <div className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to clear all cards? This action cannot be
              undone.
            </div>
            <div className="flex justify-center gap-4">
              <Button
                color="failure"
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmClear}
              >
                Yes, I'm sure
              </Button>
              <Button
                color="gray"
                onClick={() => setShowClearConfirmModal(false)}
              >
                No, cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
