import HomePage, { homeMetadata } from "@/components/HomePage";

/**
 * The Spanish build of the home page. Never linked or visited directly:
 * middleware serves it at /?lang=es (and to visitors who last chose Spanish),
 * and sends anyone who types /es there.
 */
export const metadata = homeMetadata("es");

export default function HomeEs() {
  return <HomePage lang="es" />;
}
