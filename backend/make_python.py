import cv2
import glob
import os
from collections import defaultdict

def frames_to_videos(images_dir: str, output_dir: str, fps: int = 25):
  os.makedirs(output_dir, exist_ok=True)

  # Group by video name only e.g. "video01", "video12"
  videos = defaultdict(list)
  for path in glob.glob(os.path.join(images_dir, "*_frame_*.png")):
    basename = os.path.basename(path)
    # "video01_00080_frame_80.png" → video = "video01"
    video_name = basename.split("_")[0]
    videos[video_name].append(path)

  print(f"Found {len(videos)} videos: {sorted(videos.keys())}")

  for video_name, paths in sorted(videos.items()):
    # Sort by frame number so clips play in order
    paths = sorted(paths, key=lambda p: int(
      os.path.basename(p).split("_frame_")[1].replace(".png", "")
    ))

    first = cv2.imread(paths[0])
    if first is None:
      continue
    h, w = first.shape[:2]

    out_path = os.path.join(output_dir, f"{video_name}.mp4")
    writer = cv2.VideoWriter(
      out_path,
      cv2.VideoWriter_fourcc(*"mp4v"),
      fps,
      (w, h)
    )

    for path in paths:
      frame = cv2.imread(path)
      if frame is not None:
        writer.write(frame)

    writer.release()
    print(f"{video_name}.mp4 ({len(paths)} frames)")

  print("Done")

frames_to_videos("images", "videos")