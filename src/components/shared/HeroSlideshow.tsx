import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { listBanners } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { Banner } from "@/types";

function extractYouTubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.55, ease: [0.32, 0.72, 0, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0, transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] } }),
};

interface SlideProps {
  banner: Banner;
}

function ImageSlide({ banner }: SlideProps) {
  return (
    <div className="absolute inset-0">
      <img
        src={banner.url}
        alt={banner.title ?? "Banner"}
        className="h-full w-full object-cover"
        loading="eager"
      />
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
      {/* text */}
      {(banner.title || banner.subtitle || banner.link) && (
        <div className="absolute inset-0 flex items-center">
          <div className="section-pad mx-auto w-full max-w-7xl">
            <div className="max-w-xl">
              {banner.title && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl"
                >
                  {banner.title}
                </motion.h2>
              )}
              {banner.subtitle && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.5 }}
                  className="mt-3 text-sm text-white/85 sm:text-base lg:text-lg"
                >
                  {banner.subtitle}
                </motion.p>
              )}
              {banner.link && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.5 }}
                  className="mt-5"
                >
                  <Link to={banner.link}>
                    <Button size="sm" className="bg-white text-brand-700 hover:bg-brand-50">
                      {banner.linkLabel ?? "Learn more"}
                    </Button>
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoSlide({ banner }: SlideProps) {
  const ytId = extractYouTubeId(banner.url);
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      {ytId ? (
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
          title={banner.title ?? "Video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-white/60">
          <PlayCircle className="h-16 w-16" />
          <p className="text-sm">Invalid YouTube URL</p>
        </div>
      )}
      {banner.title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-6 py-4">
          <p className="font-display text-lg font-bold text-white">{banner.title}</p>
          {banner.subtitle && <p className="mt-0.5 text-sm text-white/75">{banner.subtitle}</p>}
        </div>
      )}
    </div>
  );
}

export function HeroSlideshow() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    listBanners(true).then(setBanners);
  }, []);

  const current = banners[idx];
  const isVideo = current?.type === "video";

  function go(next: number, direction: number) {
    setDir(direction);
    setIdx(next);
  }

  function prev() {
    go((idx - 1 + banners.length) % banners.length, -1);
  }

  function next() {
    go((idx + 1) % banners.length, 1);
  }

  // Auto-advance (paused on video slides)
  useEffect(() => {
    if (banners.length <= 1 || isVideo) return;
    timerRef.current = setInterval(() => {
      setDir(1);
      setIdx((i) => (i + 1) % banners.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length, idx, isVideo]);

  if (!banners.length) return null;

  return (
    <section className="relative w-full overflow-hidden bg-black" style={{ height: "min(52vw, 520px)" }}>
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={idx}
          custom={dir}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          {current.type === "video" ? (
            <VideoSlide banner={current} />
          ) : (
            <ImageSlide banner={current} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Prev / next arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/65 focus:outline-none sm:left-5 sm:p-2.5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-sm transition hover:bg-black/65 focus:outline-none sm:right-5 sm:p-2.5"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i, i > idx ? 1 : -1)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
