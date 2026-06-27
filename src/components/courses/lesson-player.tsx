// 影片播放器抽象層（對應 SPEC 模組八 第二節）。
// MVP：youtube。未來：vimeo。切換只需改單元的 provider/id，本元件已支援兩者。
// 進度追蹤（onProgress）留待 Phase 4 再接，此處先做純嵌入。

export default function LessonPlayer({
  provider,
  videoId,
  hash,
  title,
}: {
  provider: string;
  videoId: string;
  hash?: string | null;
  title?: string;
}) {
  const src =
    provider === "vimeo"
      ? `https://player.vimeo.com/video/${videoId}${hash ? `?h=${hash}` : ""}`
      : `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src={src}
        title={title || "課程影片"}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
