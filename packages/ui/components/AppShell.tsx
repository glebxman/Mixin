import type { ComponentType, ReactNode, SVGProps } from "react";
import { ScrollArea } from "./ScrollArea";
import { TopNav } from "./TopNav";

export type NavItem = {
  to: string;
  labelKey: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export type AppShellDensity = "compact" | "comfortable";

export type AppShellProps = {
  /** Pre-rendered <Brand .../> from @edtech/ui. */
  brand: ReactNode;
  /** Localised panel label, e.g. t("panels.parent"). */
  panelLabel: string;
  /** Navigation items rendered in the left sidebar. */
  nav: ReadonlyArray<NavItem>;
  /** Currently authenticated user, if known. */
  user: { name: string; sub?: string | null } | null;
  /** Logout handler, invoked from the top nav. */
  onLogout: () => Promise<void> | void;
  /** Concrete react-router-dom Link, injected by the host app. */
  LinkComponent: ComponentType<any>;
  /** Concrete react-router-dom NavLink, injected by the host app. */
  NavLinkComponent: ComponentType<any>;
  /** Concrete LanguageSwitcher from @edtech/i18n, injected by the host app. */
  LanguageSwitcher: ComponentType<{}>;
  /** Translator for nav labelKeys, injected by the host app. */
  translateLabel: (key: string) => string;
  children: ReactNode;
  /** Layout density. Defaults to "compact" (admin/school). */
  density?: AppShellDensity;
  /** Current router pathname, used to key the fade-in animation on <main>. */
  pathname: string;
};

type DensityTokens = {
  container: string;
  aside: string;
  linkBase: string;
  iconSize: string;
  switcherWrap: string;
  mainSpacing: string;
};

const DENSITY: Record<AppShellDensity, DensityTokens> = {
  compact: {
    container: "mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6",
    aside: "hidden w-56 shrink-0 lg:block",
    linkBase:
      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
    iconSize: "size-4",
    switcherWrap: "mt-4 px-3",
    mainSpacing: "animate-fade-in-up min-w-0 flex-1 space-y-6",
  },
  comfortable: {
    container: "mx-auto flex max-w-[1600px] gap-8 px-6 py-8 sm:px-8",
    aside: "hidden w-64 shrink-0 lg:block",
    linkBase:
      "flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition-colors duration-150",
    iconSize: "size-5",
    switcherWrap: "mt-4 px-4",
    mainSpacing: "animate-fade-in-up min-w-0 flex-1 space-y-8",
  },
};

export function AppShell({
  brand,
  panelLabel,
  nav,
  user,
  onLogout,
  LinkComponent,
  NavLinkComponent,
  LanguageSwitcher,
  translateLabel,
  children,
  density = "compact",
  pathname,
}: AppShellProps) {
  const tokens = DENSITY[density];
  // TopNav's `user.sub` is `string | undefined`, so coerce nullable to undefined.
  const topNavUser = user
    ? { name: user.name, sub: user.sub ?? undefined }
    : undefined;

  return (
    <div className="min-h-screen">
      <TopNav
        brand={brand}
        panelLabel={panelLabel}
        user={topNavUser}
        onLogout={() => {
          void onLogout();
        }}
        LinkComponent={LinkComponent}
      />
      <div className={tokens.container}>
        <aside className={tokens.aside}>
          <ScrollArea className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-1 pr-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLinkComponent
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }: { isActive: boolean }) =>
                    `${tokens.linkBase} ${
                      isActive
                        ? "bg-neutral-100 text-neutral-950"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    }`
                  }
                >
                  <Icon className={tokens.iconSize} />
                  {translateLabel(item.labelKey)}
                </NavLinkComponent>
              );
            })}
            <div className={tokens.switcherWrap}>
              <LanguageSwitcher />
            </div>
          </ScrollArea>
        </aside>
        <main key={pathname} className={tokens.mainSpacing}>
          {children}
        </main>
      </div>
    </div>
  );
}
