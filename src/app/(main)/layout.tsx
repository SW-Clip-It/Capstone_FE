import { Navbar } from "@/components/layout/Navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <Navbar />
      <main className="flex-1">{children}</main>
      <footer className="bg-surface-secondary w-full py-8 mt-auto border-t border-outline-variant/60">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-on-surface-variant">
            © {new Date().getFullYear()} CLIP-IT. A Literary Video Platform.
          </p>
          <nav className="flex gap-6">
            <a
              href="#"
              className="text-on-surface-variant text-sm hover:text-accent-primary underline-offset-4 hover:underline transition-all"
            >
              About
            </a>
            <a
              href="#"
              className="text-on-surface-variant text-sm hover:text-accent-primary underline-offset-4 hover:underline transition-all"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-on-surface-variant text-sm hover:text-accent-primary underline-offset-4 hover:underline transition-all"
            >
              Privacy
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
