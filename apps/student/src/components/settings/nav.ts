import {
  Cog6ToothIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

export type SettingsSection =
  | "account"
  | "general"
  | "billing"
  | "personalization"
  | "mail"
  | "data";

export type SettingsIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type SettingsNavGroup = {
  titleKey: string;
  items: Array<{ id: SettingsSection; labelKey: string; icon: SettingsIcon }>;
};

export const SETTINGS_NAV_GROUPS: ReadonlyArray<SettingsNavGroup> = [
  {
    titleKey: "settings.groups.account",
    items: [
      { id: "account", labelKey: "settings.nav.account", icon: UserIcon },
      { id: "general", labelKey: "settings.nav.general", icon: Cog6ToothIcon },
      { id: "billing", labelKey: "settings.nav.billing", icon: CreditCardIcon },
      {
        id: "personalization",
        labelKey: "settings.nav.personalization",
        icon: SparklesIcon,
      },
    ],
  },
  {
    titleKey: "settings.groups.features",
    items: [
      { id: "mail", labelKey: "settings.nav.mail", icon: EnvelopeIcon },
      { id: "data", labelKey: "settings.nav.data", icon: ShieldCheckIcon },
    ],
  },
];

export type SubscriptionInfo = {
  plan: string;
  remainingCredits: number;
  limits: { dailyCredits: number };
};
