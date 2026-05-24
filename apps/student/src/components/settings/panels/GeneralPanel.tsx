import { useState } from "react";
import { ChevronDownIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { useI18n, type Lang, SUPPORTED_LANGS, LANG_LABELS } from "@edtech/i18n";
import { useTheme } from "@/lib/theme";
import { AutoThemeIcon } from "@/components/settings/controls/AutoThemeIcon";
import { ThemeCard } from "@/components/settings/controls/ThemeCard";
import { ToggleRow } from "@/components/settings/controls/ToggleRow";

export function GeneralPanel() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();

  const [updates, setUpdates] = useState(true);
  const [taskEmail, setTaskEmail] = useState(true);
  const [ads, setAds] = useState(true);

  return (
    <div className="space-y-9">
      <section>
        <h3 className="mb-5 text-base font-semibold text-neutral-950">
          {t("settings.general.appearance")}
        </h3>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm text-neutral-700">
              {t("common.language")}
            </label>
            <div className="relative max-w-xs">
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="block w-full appearance-none rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-9 text-sm text-neutral-950 transition-colors hover:border-neutral-300 focus:border-neutral-400 focus:outline-none"
              >
                {SUPPORTED_LANGS.map((l) => (
                  <option key={l} value={l}>
                    {LANG_LABELS[l]}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-neutral-700">
              {t("settings.general.theme")}
            </label>
            <div className="grid max-w-md grid-cols-3 gap-3">
              <ThemeCard
                active={theme === "light"}
                icon={SunIcon}
                label={t("settings.general.themeLight")}
                onClick={() => setTheme("light")}
              />
              <ThemeCard
                active={theme === "dark"}
                icon={MoonIcon}
                label={t("settings.general.themeDark")}
                onClick={() => setTheme("dark")}
              />
              <ThemeCard
                active={theme === "auto"}
                icon={AutoThemeIcon}
                label={t("settings.general.themeAuto")}
                onClick={() => setTheme("auto")}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-5 text-base font-semibold text-neutral-950">
          {t("settings.general.communication")}
        </h3>
        <div className="divide-y divide-neutral-100">
          <ToggleRow
            title={t("settings.general.productUpdates")}
            description={t("settings.general.productUpdatesDesc")}
            checked={updates}
            onChange={setUpdates}
          />
          <ToggleRow
            title={t("settings.general.taskEmail")}
            description={t("settings.general.taskEmailDesc")}
            checked={taskEmail}
            onChange={setTaskEmail}
          />
          <ToggleRow
            title={t("settings.general.ads")}
            description={t("settings.general.adsDesc")}
            checked={ads}
            onChange={setAds}
          />
        </div>
      </section>
    </div>
  );
}
