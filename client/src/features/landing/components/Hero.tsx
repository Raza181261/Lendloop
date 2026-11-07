import { siteConfig } from "@/config/site";
import { AuthButtons } from "@/features/auth/components/AuthButtons";

export function Hero() {
  return (
    <header className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
        {siteConfig.name}
      </p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        {siteConfig.tagline}
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-stone-600">
        A neighborhood board where neighbors share the tools they rarely use.
      </p>
      <div className="mt-8 flex justify-center">
        <AuthButtons />
      </div>
    </header>
  );
}
