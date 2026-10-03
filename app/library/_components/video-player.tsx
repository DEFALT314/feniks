"use client";

import { useState } from "react";
import { embedUrl, thumbnailUrl } from "../_lib/youtube";

// Click-to-play: YouTube loads only after the viewer chooses to watch (privacy, speed)
export function VideoPlayer({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        {playing ? (
          <iframe
            src={embedUrl(id)}
            title={`Film: ${title}`}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#C2452B]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
            <img
              src={thumbnailUrl(id)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
            />
            <span className="bg-navy group-hover:bg-navy-strong relative inline-flex min-h-[56px] items-center gap-3 rounded-full px-6 text-lg font-bold text-white shadow-lg">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
              Odtwórz film<span className="sr-only">: {title}</span>
            </span>
          </button>
        )}
      </div>
      <p className="text-ink-muted m-0 text-base">
        Film z YouTube. Po włączeniu YouTube może zapisać pliki cookie. Napisy włączają się, jeśli
        autor je dodał.
      </p>
    </div>
  );
}
