import { ChangeEvent, FormEvent, useRef } from "react";
import {
  ArrowUpIcon,
  XMarkIcon,
  MicrophoneIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { Textarea } from "@edtech/ui";
import { useI18n } from "@edtech/i18n";
import type { ChatAttachment } from "@edtech/api-client";

interface ComposerProps {
  input: string;
  loading: boolean;
  image: ChatAttachment | null;
  onInput: (value: string) => void;
  onImage: (image: ChatAttachment | null) => void;
  onSubmit: () => void;
}

export function Composer({
  input,
  loading,
  image,
  onInput,
  onImage,
  onSubmit,
}: ComposerProps) {
  const { t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSend = (input.trim().length > 0 || image) && !loading;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSend) return;
    onSubmit();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await compressImage(file);
    onImage({
      type: "image",
      dataUrl,
      mimeType: dataUrl.slice(5, dataUrl.indexOf(";")) || file.type,
      name: file.name,
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-[746px]"
    >
      <div className="composer-container rounded-[28px] border border-neutral-300 bg-white px-4 pb-3 pt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
        {image && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-neutral-100 p-2 pr-3">
            <img
              src={image.dataUrl}
              alt={image.name || t("aria.selectedImage")}
              className="size-14 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">
                {image.name || t("chat.photo")}
              </p>
              <p className="text-xs text-neutral-500">{t("chat.willBeSentToAi")}</p>
            </div>
            <button
              type="button"
              onClick={() => onImage(null)}
              className="grid size-8 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-950"
              aria-label={t("aria.removeImage")}
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        )}
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => onInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          rows={1}
          placeholder={t("chat.placeholder")}
          className="max-h-36 min-h-9 w-full resize-none border-0 bg-transparent px-1 py-0 text-[17px] leading-6 text-neutral-950 placeholder:text-neutral-400 focus:border-0 focus:ring-0"
        />

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-neutral-100 bg-white text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            aria-label={t("aria.attachImage")}
          >
            <PlusIcon className="size-5 stroke-[1.8]" />
          </button>
          <div className="flex-1" />
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
            aria-label={t("aria.voiceInput")}
          >
            <MicrophoneIcon className="size-5 stroke-[1.8]" />
          </button>
          <button
            type={canSend ? "submit" : "button"}
            disabled={loading}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-neutral-950 text-white transition-transform hover:bg-neutral-800 active:scale-95 disabled:cursor-wait disabled:opacity-70"
            aria-label={t("aria.sendMessage")}
          >
            <ArrowUpIcon className="size-5 stroke-[2.25]" />
          </button>
        </div>
      </div>
    </form>
  );
}

async function compressImage(file: File): Promise<string> {
  const source = await readImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return fileToDataUrl(file);

  for (const maxSide of [1280, 1024, 800]) {
    const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(source, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length < 900_000) return dataUrl;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.58);
}

async function readImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
