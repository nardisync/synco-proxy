import React from "react";
import {
  getMpcImageUrl,
  inferCardNameFromFilename,
  parseMpcText,
  tryParseMpcSchemaXml,
} from "@/helpers/Mpc";
import { useLoadingStore } from "@/store";
import type { CardOption } from "@/types/Card";
import { addCards, addCustomImage, addRemoteImage} from "@/helpers/dbUtils";
import {
  HelperText
} from "flowbite-react";
import { ExternalLink } from "lucide-react";


async function readText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result || ""));
    r.readAsText(file);
  });
}

export function MPCAutofillImporter() {

    const { setLoadingTask, setLoadingMessage } = useLoadingStore.getState();

  async function addUploadedFiles(
    files: FileList,
    opts: { hasBakedBleed: boolean }
  ) {
    const fileArray = Array.from(files);

    const cardsToAdd: Array<
      Omit<CardOption, "uuid" | "order"> & { imageId: string }
    > = [];

    for (const file of fileArray) {
      const imageId = await addCustomImage(file);
      cardsToAdd.push({
        name: inferCardNameFromFilename(file.name) || `Custom Art`,
        imageId: imageId,
        isUserUpload: true,
        hasBakedBleed: opts.hasBakedBleed,
      });
    }

    if (cardsToAdd.length > 0) {
      await addCards(cardsToAdd);
    }
  }

  const handleUploadMpcFill = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoadingTask("Uploading Images");

    try {
      const files = e.target.files;
      if (files && files.length) {
        await addUploadedFiles(files, { hasBakedBleed: true });
      }
    } finally {
      if (e.target) e.target.value = "";

      setLoadingTask(null);
    }
  };

  const handleUploadStandard = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLoadingTask("Uploading Images");
    try {
      const files = e.target.files;
      if (files && files.length) {
        await addUploadedFiles(files, { hasBakedBleed: false });
      }
    } finally {
      if (e.target) e.target.value = "";
      setLoadingTask(null);
    }
  };

  const handleImportMpcXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      const raw = await readText(file);
      const schemaItems = tryParseMpcSchemaXml(raw);
      const items =
        schemaItems && schemaItems.length ? schemaItems : parseMpcText(raw);

      const cardsToAdd: Array<
        Omit<CardOption, "uuid" | "order"> & { imageId?: string }
      > = [];

      for (const it of items) {
        for (let i = 0; i < (it.qty || 1); i++) {
          const name =
            it.name ||
            (it.filename
              ? inferCardNameFromFilename(it.filename)
              : "Custom Art");

          const mpcUrl = getMpcImageUrl(it.frontId);
          const imageUrls = mpcUrl ? [mpcUrl] : [];
          const imageId = await addRemoteImage(imageUrls);
          cardsToAdd.push({
            name,
            imageId: imageId,
            isUserUpload: true,
            hasBakedBleed: true,
          });
        }
      }

      if (cardsToAdd.length > 0) {
        await addCards(cardsToAdd);
      }
    } finally {
      if (e.target) e.target.value = "";
    }
  };


    return( 

<div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h6 className="font-medium dark:text-white">
              Upload MPC Images (
              <a
                href="https://mpcfill.com"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-blue-600 dark:hover:text-blue-400"
              >
                MPC Autofill
                <ExternalLink className="inline-block size-4 ml-1" />
              </a>
              )
            </h6>

            <label
              htmlFor="upload-mpc"
              className="inline-block w-full text-center cursor-pointer rounded-md bg-gray-300 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Choose Files
            </label>
            <input
              id="upload-mpc"
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadMpcFill}
              onClick={(e) => ((e.target as HTMLInputElement).value = "")}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h6 className="font-medium dark:text-white">
              Import MPC Text (XML)
            </h6>

            <label
              htmlFor="import-mpc-xml"
              className="inline-block w-full text-center cursor-pointer rounded-md bg-gray-300 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Choose File
            </label>
            <input
              id="import-mpc-xml"
              type="file"
              accept=".xml,.txt,.csv,.log,text/xml,text/plain"
              onChange={handleImportMpcXml}
              onClick={(e) => ((e.target as HTMLInputElement).value = "")}
              className="hidden"
            />
          </div>

          <div className="space-y-1">
            <h6 className="font-medium dark:text-white">Upload Other Images</h6>
            <label
              htmlFor="upload-standard"
              className="inline-block w-full text-center cursor-pointer rounded-md bg-gray-300 dark:bg-gray-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Choose Files
            </label>
            <input
              id="upload-standard"
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadStandard}
              onClick={(e) => ((e.target as HTMLInputElement).value = "")}
              className="hidden"
            />
            <HelperText>
              You can upload images from mtgcardsmith, custom designs, etc.
            </HelperText>
          </div>
        </div>)

}
