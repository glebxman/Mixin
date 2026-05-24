import { ExclamationTriangleIcon, PhotoIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { useI18n } from "@edtech/i18n";

interface ImageBubbleProps {
  dataUrl?: string;
  prompt: string;
  loading?: boolean;
  error?: string;
}

/**
 * Bubble с изображением, сгенерированным AI.
 * Состояния:
 *   • loading — скелетон 256×256 + надпись
 *   • ready   — реальное изображение
 *   • error   — fallback с текстом ошибки
 */
export function ImageBubble({ dataUrl, prompt, loading, error }: ImageBubbleProps) {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in-up flex items-start gap-3">
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700">
                <PhotoIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-neutral-950">
                  {t("chat.creatingImage")}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {t("chat.drawing", {
                    prompt: prompt.length > 80 ? `${prompt.slice(0, 80)}...` : prompt,
                  })}
                </p>
              </div>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div className="image-generation-progress h-full w-1/2 rounded-full bg-neutral-950" />
            </div>
          </div>
        ) : dataUrl ? (
          <figure className="flex flex-col items-start">
            <img
              src={dataUrl}
              alt={prompt}
              className="max-w-md rounded-2xl border border-neutral-200"
              loading="lazy"
            />
          </figure>
        ) : (
          <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-900">
              <ExclamationTriangleIcon className="size-4" />
              {t("chat.imageError")}
            </div>
            {error && (
              <p className="text-xs leading-relaxed text-amber-800">{error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
