"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Modal, Skeleton, Button } from "./ui";
import { api } from "@/lib/api";
import { fmtDate } from "@/lib/date";
import type { Id } from "@/lib/types";

type PlayInfo = { name: string; url: string; campaignName: string; endDate: string };

function toEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1`;
    if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1`;
    }
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.slice(1)}?autoplay=1`;
    if (host === "player.vimeo.com") return url;
  } catch {
    /* ignore */
  }
  return null;
}

function Media({ url, name }: { url: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const embed = toEmbed(url);

  useEffect(() => {
    if (embed) return;
    const v = ref.current;
    if (!v) return;
    let cancelled = false;
    let hls: { destroy: () => void } | undefined;
    if (/\.m3u8($|\?)/i.test(url) && !v.canPlayType("application/vnd.apple.mpegurl")) {
      import("hls.js").then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) return setFailed(true);
        const h = new Hls();
        h.loadSource(url);
        h.attachMedia(v);
        h.on(Hls.Events.ERROR, (_e, d) => d.fatal && setFailed(true));
        hls = h;
        v.play().catch(() => undefined);
      });
    } else {
      v.src = url;
      v.play().catch(() => undefined);
    }
    return () => {
      cancelled = true;
      hls?.destroy();
      v.removeAttribute("src");
      v.load();
    };
  }, [url, embed]);

  if (failed) {
    return (
      <div className="flex aspect-video flex-col items-center justify-center gap-3 rounded-xl bg-slate-900 p-6 text-center text-sm text-slate-300">
        <Icon name="alert" className="size-8 text-amber-400" />
        <p>This stream couldn’t be played in the browser.</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline">
          Open stream in a new tab
        </a>
      </div>
    );
  }
  if (embed) {
    return (
      <iframe
        src={embed}
        title={`${name} live stream`}
        className="aspect-video w-full rounded-xl bg-black"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return <video ref={ref} controls autoPlay playsInline muted onError={() => setFailed(true)} className="aspect-video w-full rounded-xl bg-black" />;
}

export function PlayerModal({ campaignId, channel, onClose }: { campaignId: Id; channel: { id: Id; name: string }; onClose: () => void }) {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["play", campaignId, channel.id],
    queryFn: () => api<PlayInfo>(`/api/play?campaignId=${campaignId}&channelId=${channel.id}`),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });

  return (
    <Modal title={`Now playing · ${channel.name}`} size="xl" onClose={onClose}>
      {isPending ? (
        <Skeleton className="aspect-video w-full" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Icon name="lock" className="size-6" />
          </span>
          <p className="max-w-md text-sm text-slate-600">{error instanceof Error ? error.message : "Playback unavailable"}</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Media url={data.url} name={data.name} />
          <p className="text-sm text-slate-500">
            Campaign <span className="font-medium text-slate-800">{data.campaignName}</span> · playback available until{" "}
            <span className="font-medium text-slate-800">{fmtDate(data.endDate)}</span>
          </p>
        </div>
      )}
    </Modal>
  );
}
