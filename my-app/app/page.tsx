'use client';

import { useState, useEffect, useRef } from "react";

interface FrameResult {
  frame: number;
  timestamp: number;
  dominant_class: number;
  heatmap: string;
}

interface InferenceResult {
  fps: number;
  total_frames_processed: number;
  frames: FrameResult[];
}

const CLASS_LABELS: Record<number, string> = {
  0: "Background",
  1: "Abdominal Wall",
  2: "Liver",
  3: "GI Tract",
  4: "Fat",
  5: "Grasper",
  6: "Connective Tissue",
  7: "Blood",
  8: "Cystic Duct",
  9: "L-Hook Cautery",
  10: "Gallbladder",
  11: "Hepatic Vein",
  12: "Liver Ligament",
};

export default function Home() {
  const [videoList, setVideoList] = useState<string[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [result, setResult] = useState<InferenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState<FrameResult | null>(null);
  const [inferenceStarted, setInferenceStarted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/videos")
      .then(r => r.json())
      .then(d => setVideoList(d.videos))
      .catch(() => setError("Could not load video list from server"));
  }, []);

  useEffect(() => {
    if (!result) return;
    function tick() {
      const t = videoRef.current?.currentTime ?? 0;
      const closest = result!.frames.reduce((prev, curr) =>
        Math.abs(curr.timestamp - t) < Math.abs(prev.timestamp - t) ? curr : prev
      );
      setCurrentFrame(closest);
      animFrameRef.current = requestAnimationFrame(tick);
    }
    animFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [result]);

  function handleSelectVideo(name: string) {
    setSelectedVideo(name);
    setResult(null);
    setCurrentFrame(null);
    setError(null);
    setInferenceStarted(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
  }

  function runInference() {
  if (!selectedVideo) return;
  setLoading(true);
  setError(null);
  setResult(null);
  setCurrentFrame(null);
  setInferenceStarted(true);

  const formData = new FormData();

  fetch(`/api/video/${selectedVideo}`)
    .then(r => {
      if (!r.ok) throw new Error(`Video fetch failed: ${r.status} ${r.statusText}`);
      return r.blob();
    })
    .then(blob => {
      formData.append("video", blob, `${selectedVideo}.mp4`);
      return fetch("/api/process-video", { method: "POST", body: formData });
    })
    .then(res => {
      if (!res.ok) throw new Error(`Process failed: ${res.status} ${res.statusText}`);
      return res.json();
    })
    .then(data => {
      console.log("Backend response:", data); // ← add this temporarily
      // Handle both { result: ... } and bare response shapes
      const inferenceResult = data.result ?? data;
      if (!inferenceResult?.frames) throw new Error(`Unexpected response shape: ${JSON.stringify(data)}`);
      setResult(inferenceResult);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Inference error:", err);
      setError(`Inference failed: ${err.message}`);
      setLoading(false);
    });
  }

  // Proxy through Next.js to avoid cross-origin video loading issues
  const videoURL = selectedVideo ? `/api/video/${selectedVideo}` : null;

  return (
    <main className="min-h-screen bg-[#0a0e14] font-mono text-[#c8d8e8] text-base">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#060a10] border-b border-[#1a2a3a]">
        <span className="text-sm tracking-[3px] text-[#00e5ff] uppercase">Nexus</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="border border-[#1a2a3a] rounded-sm bg-[#0d1117]">
          <div className="px-4 py-2.5 text-sm tracking-widest text-[#00e5ff] border-b border-[#1a2a3a] bg-[#00e5ff08]">
            Select Video
          </div>
          <div className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <select
              value={selectedVideo}
              onChange={e => handleSelectVideo(e.target.value)}
              className="bg-[#06090f] border border-[#1a2a3a] text-[#c8d8e8] text-sm px-3 py-2 rounded-sm flex-1 w-full sm:w-auto"
            >
              <option value="">-- choose a video --</option>
              {videoList.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>

            <button
              onClick={runInference}
              disabled={!selectedVideo || loading}
              className={`border text-sm px-4 py-2 rounded-sm transition-opacity ${
                !selectedVideo || loading
                  ? "border-[#1a2a3a] text-[#4a6a7a] cursor-not-allowed"
                  : "border-[#00e5ff] text-[#00e5ff] hover:bg-[#00e5ff15] cursor-pointer"
              }`}
            >
              {loading ? "Running inference..." : "Run Segmentation"}
            </button>

            {result && (
              <span className="text-[#4a6a7a] text-xs">
                {result.total_frames_processed} frames processed
              </span>
            )}
          </div>
        </div>

        <div className="border border-[#1a2a3a] rounded-sm bg-[#0d1117]">
          <div className="px-4 py-2.5 text-sm tracking-widest text-[#00e5ff] border-b border-[#1a2a3a] bg-[#00e5ff08]">
            Live Feed &amp; Segmentation
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">

              {/* Raw video */}
              <div className="flex flex-col gap-2">
                <div className="w-full aspect-[4/3] bg-[#06090f] border border-[#1a2a3a] rounded-sm overflow-hidden">
                  {videoURL ? (
                    <video
                      ref={videoRef}
                      src={videoURL}
                      controls
                      className="w-full h-full object-contain"
                      onError={() => {
                        console.error("Video load error: failed to load", videoURL);
                        setError("Video failed to load — see browser console for details");
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#4a6a7a] text-sm">
                      No video selected
                    </div>
                  )}
                </div>
                <span className="text-sm tracking-wide text-[#ff2d78]">Raw Input</span>
              </div>

              {/* Heatmap */}
              <div className="flex flex-col gap-2">
                <div className="w-full aspect-[4/3] bg-[#06090f] border border-[#1a2a3a] rounded-sm overflow-hidden relative">
                  {loading && !currentFrame && (
                    <div className="absolute inset-0 flex items-center justify-center text-[#00e5ff] text-sm animate-pulse">
                      Processing frames...
                    </div>
                  )}
                  {currentFrame?.heatmap ? (
                    <img
                      src={`data:image/jpeg;base64,${currentFrame.heatmap}`}
                      className="w-full h-full object-contain"
                      alt="segmentation"
                    />
                  ) : !loading && (
                    <div className="absolute inset-0 flex items-center justify-center text-[#4a6a7a] text-sm">
                      {inferenceStarted ? "Play the video to see segmentation" : "Run segmentation to begin"}
                    </div>
                  )}
                </div>
                <span className="text-sm tracking-wide text-[#ff2d78]">Segmentation</span>
              </div>

            </div>

            <div className="border border-[#1a2a3a] rounded-sm px-4 py-3 text-sm flex items-center gap-3 bg-[#06090f]">
              <span className="text-[#4a6a7a]">&gt;&gt;&gt;</span>
              {currentFrame ? (
                <>
                  <span className="text-[#00e5ff]">
                    {CLASS_LABELS[currentFrame.dominant_class] ?? `Class ${currentFrame.dominant_class}`}
                  </span>
                  <span className="text-[#4a6a7a] ml-auto text-xs">
                    t={currentFrame.timestamp.toFixed(2)}s · frame {currentFrame.frame}
                  </span>
                </>
              ) : (
                <span className="text-[#4a6a7a]">Dominant structure will appear here during playback</span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="border border-[#ff2d78] bg-[#ff2d7810] rounded-sm px-4 py-3 text-[#ff2d78] text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}