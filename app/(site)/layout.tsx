import SmoothScroll from "@/components/SmoothScroll";
import ViewportHeight from "@/components/ViewportHeight";
import ServiceWorker from "@/components/ServiceWorker";

/**
 * The public site's behaviour: smooth scroll, the viewport-height fix and the
 * service worker. Kept out of the root layout so the email-campaign CRM
 * (/blast) scrolls like an ordinary app.
 */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SmoothScroll />
      <ViewportHeight />
      <ServiceWorker />
      {children}
    </>
  );
}
