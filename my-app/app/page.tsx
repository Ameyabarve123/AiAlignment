'use client';

import { useState } from "react";
export default function Home() {
  const [video, setVideo] = useState<string | null>(null);
  
  function handleClick() {
    console.log("yui");
  }
  return (
    <main className="min-h-screen bg-[#0a0e14] font-mono text-[#c8d8e8]">

      {/* Top bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#060a10] border-b border-[#1a2a3a]">
        <span className="text-[10px] tracking-[3px] text-[#00e5ff] uppercase">
          Nexus
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-3">

        {/* Live Feed & Tumor Segmentation card */}
        <div className="border border-[#1a2a3a] rounded-sm bg-[#0d1117]">
          <div className="px-3 py-1.5 text-[11px] tracking-widest text-[#00e5ff] border-b border-[#1a2a3a] bg-[#00e5ff08]">
            Live Feed &amp; Tumor Segmentation
          </div>
          <div className="p-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

              {/* Raw Input */}
              <div className="flex flex-col gap-1.5">
                <div className="w-full aspect-[4/3] bg-[#06090f] border border-[#1a2a3a] rounded-sm relative overflow-hidden">
                  {video && <video src={video} controls className="w-full h-full object-contain" />}
                </div>
                <span className="text-[10px] tracking-wide text-[#ff2d78]">Raw Input</span>

                <input
                  type="file"
                  accept="video/*"
                  id="video-input"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setVideo(URL.createObjectURL(file));
                  }}
                />
                <button
                  onClick={() => document.getElementById("video-input")?.click()}
                  className="inline border border-solid border-white hover:animate-pulse bg-[#00ff99] text-black"
                >
                  Upload Video
                </button>
              </div>

              {/* Segmented Model */}
              <div className="flex flex-col gap-1.5">
                <div className="w-full aspect-[4/3] bg-[#06090f] border border-[#1a2a3a] rounded-sm relative overflow-hidden">
                  <div
                    className="absolute inset-0 pointer-events-none"
                  />
                </div>
                <span className="text-[10px] tracking-wide text-[#ff2d78]">Segmented Model</span>
              </div>

            </div>
          </div>
        </div>

        {/* Classification & Info card */}
        <div className="border border-[#1a2a3a] rounded-sm bg-[#0d1117]">
          <div className="px-3 py-1.5 text-[11px] tracking-widest text-[#00e5ff] border-b border-[#1a2a3a] bg-[#00e5ff08]">
            Classification &amp; Info
          </div>
          <div className="p-3.5">
            <div className="bg-[#06090f] border border-[#1a2a3a] rounded-sm px-3.5 py-3 text-[12px] text-[#00ff99] min-h-[56px]">
              <span className="text-[#4a6a7a] mr-1.5">&gt;&gt;&gt;</span>
              classification info:{" "}
              <span className="text-[#00e5ff]">[cancer]</span>
              /
              <span className="text-[#00e5ff]">[non-cancer]</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}