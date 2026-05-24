/**
 * @edtech/ui — единая дизайн-система Mixin EdTech UZ.
 *
 * Стиль вдохновлён ChatGPT: чистый белый фон, тонкие нейтральные рамки,
 * крупная читаемая типографика, иконки Heroicons, минимум теней,
 * мягкие микро-анимации (см. styles.css).
 *
 * Все приложения должны импортировать "@edtech/ui/styles.css" в своём
 * корневом css-файле — там лежат tokens, keyframes и утилиты анимаций.
 */
export { cn } from "./lib/utils";

export { Button, buttonVariants, type ButtonProps } from "./components/Button";
export { Input } from "./components/Input";
export { Textarea } from "./components/Textarea";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/Card";
export { Badge, type BadgeProps } from "./components/Badge";
export { Stat, type StatProps } from "./components/Stat";
export { Spinner } from "./components/Spinner";
export {
  LoadingState,
  ErrorState,
  EmptyState,
  SkeletonBlock,
} from "./components/States";
export { PageHeader } from "./components/PageHeader";
export { Toggle } from "./components/Toggle";
export { Avatar } from "./components/Avatar";
export { TopNav } from "./components/TopNav";
export { Section } from "./components/Section";
export { ProgressBar, progressVariantForScore } from "./components/ProgressBar";
export { ScrollArea } from "./components/ScrollArea";
export { Brand } from "./components/Brand";
export {
  AppShell,
  type AppShellProps,
  type AppShellDensity,
  type NavItem,
} from "./components/AppShell";
export {
  AuthGuard,
  type AuthGuardProps,
  type AuthSource,
  type AuthSourceState,
} from "./components/AuthGuard";
