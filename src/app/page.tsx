"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/ui/Icon";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import type { Work } from "@/types/database";

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    fetch("/api/works")
      .then((r) => r.json())
      .then((data) => setWorks(data ?? []))
      .catch(() => {});
  }, []);

  // Scroll progress for the side rail indicator
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <div className="min-h-screen bg-background text-on-background overflow-x-hidden">
      <Navbar />

      {/* Side scroll progress rail (desktop only) */}
      <motion.div
        className="fixed top-1/2 -translate-y-1/2 left-3 hidden lg:block w-px h-[40vh] bg-outline-variant/30 rounded-full origin-top z-40"
        aria-hidden
      >
        <motion.div
          style={{ scaleY }}
          className="absolute inset-0 bg-gradient-to-b from-accent-primary to-accent-secondary origin-top rounded-full"
        />
      </motion.div>

      <Hero />
      <QuoteSection />
      <DemoShowcase works={works} i18nLang={i18n.language} t={t} />
      <HowItWorks />
      <FeaturedLibrary works={works} i18nLang={i18n.language} t={t} />
      <StatsSection />
      <FinalCTA />

      <footer className="border-t border-outline-variant/40 py-10 bg-surface-secondary">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-on-surface-variant">
          <p>© {new Date().getFullYear()} CLIP-IT. A Literary Video Platform.</p>
          <nav className="flex gap-6">
            <a href="#" className="hover:text-accent-primary underline-offset-4 hover:underline transition">About</a>
            <a href="#" className="hover:text-accent-primary underline-offset-4 hover:underline transition">Terms</a>
            <a href="#" className="hover:text-accent-primary underline-offset-4 hover:underline transition">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Hero — large headline, parallax orbs, scroll hint
// ============================================================
function Hero() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  // Title moves up + fades; orbs drift in opposite directions
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const orbAY = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const orbBY = useTransform(scrollYProgress, [0, 1], [0, 250]);

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex items-center overflow-hidden"
    >
      {/* Animated gradient orbs */}
      <motion.div
        style={{ y: orbAY }}
        className="absolute top-[15%] left-[10%] w-[500px] h-[500px] bg-accent-primary/15 rounded-full blur-[160px] pointer-events-none"
      />
      <motion.div
        style={{ y: orbBY }}
        className="absolute bottom-[10%] right-[8%] w-[420px] h-[420px] bg-accent-secondary/15 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Faint floating "book spine" lines for depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[10, 30, 55, 75, 90].map((pct, i) => (
          <motion.div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-accent-primary/10 to-transparent"
            style={{ left: `${pct}%` }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 6 + i * 0.7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="relative max-w-[1100px] mx-auto px-6 sm:px-8 w-full">
        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs font-semibold tracking-wider uppercase mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-pulse" />
            Literary Video Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="font-reading text-5xl sm:text-6xl lg:text-[88px] leading-[1.05] font-bold tracking-tight text-on-background mb-6"
          >
            {t("home.title")}
            <br />
            <span className="bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_6s_linear_infinite]">
              {t("home.titleHighlight")}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="font-reading text-lg sm:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-[1.6]"
          >
            {t("home.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/library">
              <button className="group inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-accent-primary text-white font-medium shadow-lg shadow-accent-primary/20 hover:bg-accent-primary/90 hover:shadow-xl hover:shadow-accent-primary/30 transition-all">
                <Icon name="explore" size={20} />
                {t("home.exploreLibrary")}
                <Icon
                  name="arrow_forward"
                  size={18}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </Link>
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-glass-bg border border-glass-border text-on-surface font-medium hover:bg-glass-bg-hover hover:border-accent-primary/40 transition-all">
                <Icon name="person_add" size={20} />
                {t("home.getStarted")}
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-on-surface-variant"
        >
          <span className="text-xs uppercase tracking-[0.2em]">
            {t("home.scrollHint")}
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Icon name="expand_more" size={20} />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// Quote Section — large pull quote, word-by-word reveal
// ============================================================
function QuoteSection() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const text = t("home.quoteText");
  const words = text.split(/(\s+)/);

  return (
    <section
      ref={ref}
      className="relative py-32 sm:py-40 max-w-[1100px] mx-auto px-6 sm:px-8"
    >
      <SectionLabel>{t("home.quoteLabel")}</SectionLabel>

      <h2 className="font-reading text-3xl sm:text-5xl lg:text-[64px] leading-[1.2] font-semibold tracking-tight text-on-background mb-6 max-w-[18ch]">
        {words.map((w, i) =>
          /^\s+$/.test(w) ? (
            w
          ) : (
            <RevealWord
              key={i}
              word={w}
              progress={scrollYProgress}
              start={0.15 + i * 0.018}
              end={0.3 + i * 0.018}
            />
          )
        )}
      </h2>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7 }}
        className="font-reading text-lg sm:text-xl text-on-surface-variant max-w-[60ch] leading-[1.6]"
      >
        {t("home.quoteSub")}
      </motion.p>
    </section>
  );
}

function RevealWord({
  word,
  progress,
  start,
  end,
}: {
  word: string;
  progress: MotionValue<number>;
  start: number;
  end: number;
}) {
  const opacity = useTransform(progress, [start, end], [0.15, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}
    </motion.span>
  );
}

// ============================================================
// Demo Showcase — sticky scroll, text↔video sync animation
// ============================================================
function DemoShowcase({
  works,
  i18nLang,
  t,
}: {
  works: Work[];
  i18nLang: string;
  t: (k: string) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Three scenes — each takes a third of the scroll
  const sceneIndex = useTransform(scrollYProgress, [0, 0.33, 0.66, 1], [0, 0, 1, 2]);
  const [scene, setScene] = useState(0);

  useEffect(() => {
    const unsub = sceneIndex.on("change", (v) => {
      setScene(Math.floor(v));
    });
    return () => unsub();
  }, [sceneIndex]);

  const scenes = [
    {
      label: t("home.demoStep1"),
      excerpt:
        i18nLang === "ko"
          ? "재산을 가진 독신 남자에게 아내가 필요하다는 것은 보편적으로 인정되는 진리이다."
          : "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
      meta:
        i18nLang === "ko"
          ? "오만과 편견 · 첫인상"
          : "Pride and Prejudice · First Impressions",
      colorA: "#6366f1",
      colorB: "#8b5cf6",
    },
    {
      label: t("home.demoStep2"),
      excerpt:
        i18nLang === "ko"
          ? "나를 이슈마엘이라 부르라. 몇 해 전, 지갑에 돈이 거의 없어, 나는 잠시 바다로 나가 보기로 했다."
          : "Call me Ishmael. Some years ago — having little or no money in my purse, I thought I would sail about a little.",
      meta:
        i18nLang === "ko"
          ? "모비 딕 · 나를 이슈마엘이라 부르라"
          : "Moby Dick · Call Me Ishmael",
      colorA: "#0ea5e9",
      colorB: "#1e293b",
    },
    {
      label: t("home.demoStep3"),
      excerpt:
        i18nLang === "ko"
          ? "4월의 밝고 차가운 어느 날, 시계가 열세 번을 치고 있었다."
          : "It was a bright cold day in April, and the clocks were striking thirteen.",
      meta:
        i18nLang === "ko"
          ? "1984 · 빅 브라더가 너를 보고 있다"
          : "1984 · Big Brother is Watching",
      colorA: "#dc2626",
      colorB: "#ea580c",
    },
  ];

  const cur = scenes[scene];

  return (
    <section
      ref={ref}
      className="relative bg-surface-secondary"
      style={{ height: "260vh" }}
    >
      <div className="sticky top-20 h-[calc(100svh-5rem)] flex flex-col justify-center max-w-[1280px] mx-auto px-6 sm:px-8">
        <SectionLabel>{t("home.demoLabel")}</SectionLabel>
        <h2 className="font-reading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-on-background mb-3 max-w-[22ch]">
          {t("home.demoTitle")}
        </h2>
        <p className="font-reading text-lg text-on-surface-variant max-w-[55ch] mb-10">
          {t("home.demoSubtitle")}
        </p>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-10 items-center">
          {/* Mock video */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-glass-border shadow-xl bg-black">
            <AnimatePresence mode="wait">
              <motion.div
                key={scene}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${cur.colorA}, ${cur.colorB})`,
                }}
              >
                {/* Decorative animated lines */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-50"
                  viewBox="0 0 100 60"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M0 30 Q 25 10 50 30 T 100 30"
                    stroke="rgba(255,255,255,0.4)"
                    strokeWidth="0.3"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                  <motion.path
                    d="M0 40 Q 25 20 50 40 T 100 40"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="0.2"
                    fill="none"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2.5, ease: "easeOut", delay: 0.2 }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-end p-6">
                  <div className="text-white">
                    <div className="text-xs uppercase tracking-widest opacity-80 mb-1">
                      {t("home.demoLabel")}
                    </div>
                    <div className="text-lg font-semibold">{cur.meta}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Play indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur px-2 py-1 rounded-full text-white text-[10px] font-semibold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Now Playing
            </div>
          </div>

          {/* Mock text blocks */}
          <div className="space-y-3">
            {scenes.map((s, i) => (
              <motion.div
                key={i}
                animate={{
                  scale: i === scene ? 1 : 0.97,
                  opacity: i === scene ? 1 : 0.5,
                }}
                transition={{ duration: 0.4 }}
                className={cn(
                  "relative rounded-xl p-4 border transition-colors",
                  i === scene
                    ? "border-accent-primary bg-accent-primary/5"
                    : "border-glass-border bg-glass-bg"
                )}
              >
                {i === scene && (
                  <motion.div
                    layoutId="demo-pulse"
                    className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-accent-primary text-white text-[10px] font-semibold flex items-center gap-1"
                  >
                    <Icon name="play_arrow" size={10} fill />
                    {s.label}
                  </motion.div>
                )}
                <p
                  className={cn(
                    "font-reading text-sm leading-relaxed",
                    i === scene
                      ? "text-on-surface font-medium"
                      : "text-on-surface-variant"
                  )}
                >
                  {s.excerpt}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  {s.meta}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// How It Works — 3 steps with connecting line + number counter
// ============================================================
function HowItWorks() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "end 60%"],
  });
  const lineScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const steps = [
    {
      icon: "menu_book",
      title: t("home.featureRead"),
      desc: t("home.featureReadDesc"),
    },
    {
      icon: "play_circle",
      title: t("home.featureWatch"),
      desc: t("home.featureWatchDesc"),
    },
    {
      icon: "touch_app",
      title: t("home.featureExperience"),
      desc: t("home.featureExperienceDesc"),
    },
  ];

  return (
    <section ref={ref} className="py-28 sm:py-36 max-w-[1100px] mx-auto px-6 sm:px-8">
      <div className="text-center mb-14">
        <SectionLabel center>{t("home.howItWorks")}</SectionLabel>
        <h2 className="font-reading text-3xl sm:text-5xl font-bold tracking-tight text-on-background mb-3">
          {t("home.howItWorks")}
        </h2>
        <p className="font-reading text-lg text-on-surface-variant max-w-xl mx-auto">
          {t("home.howItWorksSub")}
        </p>
      </div>

      <div className="relative grid md:grid-cols-3 gap-8 md:gap-6">
        {/* Connecting line (desktop) */}
        <motion.div
          className="absolute top-10 left-[16%] right-[16%] h-px bg-gradient-to-r from-accent-primary via-accent-secondary to-accent-primary hidden md:block origin-left"
          style={{ scaleX: lineScale }}
        />

        {steps.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, delay: i * 0.15 }}
            className="relative flex flex-col items-center text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-background border-2 border-accent-primary/30 flex items-center justify-center shadow-sm">
                <Icon
                  name={s.icon}
                  size={32}
                  className="text-accent-primary"
                  fill
                />
              </div>
              <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent-primary text-white text-xs font-bold flex items-center justify-center shadow-md">
                {i + 1}
              </div>
            </div>
            <h3 className="mt-6 text-xl font-semibold text-on-surface">
              {s.title}
            </h3>
            <p className="mt-2 text-on-surface-variant text-sm leading-relaxed max-w-[26ch]">
              {s.desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ============================================================
// Featured Library — book covers with tilt/scroll effects
// ============================================================
function FeaturedLibrary({
  works,
  i18nLang,
  t,
}: {
  works: Work[];
  i18nLang: string;
  t: (k: string) => string;
}) {
  return (
    <section className="py-28 sm:py-36 bg-surface-secondary">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <SectionLabel>{t("home.libraryLabel")}</SectionLabel>
            <h2 className="font-reading text-3xl sm:text-5xl font-bold tracking-tight text-on-background mb-3 max-w-[20ch]">
              {t("home.libraryTitle")}
            </h2>
            <p className="font-reading text-lg text-on-surface-variant max-w-[50ch]">
              {t("home.librarySub")}
            </p>
          </div>
          <Link href="/library">
            <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-background border border-glass-border text-accent-primary font-medium hover:bg-glass-bg-hover transition-colors">
              {t("home.exploreAll")}
              <Icon name="arrow_forward" size={16} />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6">
          {works.slice(0, 6).map((w, i) => (
            <FeaturedBook
              key={w.id}
              work={w}
              index={i}
              lang={i18nLang}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedBook({
  work,
  index,
  lang,
}: {
  work: Work;
  index: number;
  lang: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Each book bobs slightly at a different phase based on its index
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [index % 2 === 0 ? 30 : -30, index % 2 === 0 ? -30 : 30]
  );

  const title = lang === "ko" && work.title_ko ? work.title_ko : work.title;

  return (
    <Link href={`/works/${work.id}`}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: index * 0.05 }}
        className="group cursor-pointer"
      >
        <motion.div
          style={{ y }}
          className="aspect-[3/4] rounded-lg overflow-hidden border border-glass-border bg-background shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-all relative"
        >
          {work.cover_image && (
            <Image
              src={work.cover_image}
              alt={title}
              fill
              sizes="200px"
              className="object-cover"
              unoptimized
            />
          )}
        </motion.div>
        <div className="mt-3">
          <h3 className="text-sm font-semibold text-on-surface truncate group-hover:text-accent-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-on-surface-variant truncate">
            {work.author}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}

// ============================================================
// Stats — animated counters
// ============================================================
function StatsSection() {
  const { t } = useTranslation();
  const stats = [
    { value: 6, suffix: "", label: t("home.stat1") },
    { value: 23, suffix: "+", label: t("home.stat2") },
    { value: 2, suffix: "", label: t("home.stat3") },
  ];

  return (
    <section className="py-24 sm:py-32 max-w-[1100px] mx-auto px-6 sm:px-8">
      <div className="text-center mb-12">
        <SectionLabel center>{t("home.statsLabel")}</SectionLabel>
      </div>
      <div className="grid grid-cols-3 gap-4 sm:gap-8">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="text-center"
          >
            <div className="font-reading text-5xl sm:text-7xl font-bold bg-gradient-to-br from-accent-primary to-accent-secondary bg-clip-text text-transparent tabular-nums">
              <Counter to={s.value} />
              {s.suffix}
            </div>
            <div className="text-sm sm:text-base text-on-surface-variant mt-2">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Counter({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animatedRef.current) {
          animatedRef.current = true;
          const duration = 1500;
          const start = performance.now();
          function tick(now: number) {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setVal(Math.round(to * eased));
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);

  return <span ref={ref}>{val}</span>;
}

// ============================================================
// Final CTA
// ============================================================
function FinalCTA() {
  const { t } = useTranslation();
  return (
    <section className="relative py-32 sm:py-40 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-accent-primary/10 rounded-full blur-[180px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="relative max-w-2xl mx-auto px-6 text-center"
      >
        <h2 className="font-reading text-4xl sm:text-6xl font-bold tracking-tight text-on-background mb-5">
          {t("home.ctaTitle")}
        </h2>
        <p className="font-reading text-lg text-on-surface-variant mb-9">
          {t("home.ctaSub")}
        </p>
        <Link href="/signup">
          <button className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-primary text-white font-semibold text-base shadow-xl shadow-accent-primary/30 hover:shadow-2xl hover:shadow-accent-primary/40 hover:-translate-y-0.5 transition-all">
            <Icon name="auto_stories" size={20} fill />
            {t("home.ctaButton")}
            <Icon
              name="arrow_forward"
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
        </Link>
      </motion.div>
    </section>
  );
}

// ============================================================
// Shared bits
// ============================================================
function SectionLabel({
  children,
  center,
}: {
  children: ReactNode;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 mb-5",
        center && "justify-center w-full"
      )}
    >
      <span className="w-6 h-px bg-accent-primary" />
      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-primary">
        {children}
      </span>
      <span className="w-6 h-px bg-accent-primary" />
    </div>
  );
}
