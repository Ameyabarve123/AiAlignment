import os
import shutil

# ===== CONFIG =====
video_list = [1, 12, 35, 48]

src_folder = r"C:\Users\barvea\Downloads\CholecSeg8k\CholecSeg8k\masks"  # or masks
dest_folder = r"C:\Users\barvea\Documents\GitHub\Jeccoman\AiAlignment\data-splitter\masks"

os.makedirs(dest_folder, exist_ok=True)

# ===== COPY FILES =====
total_copied = 0
for fname in os.listdir(src_folder):
    if not fname.endswith(".png"):
        continue

    # Extract video number from "videoXX_..."
    prefix = fname.split("_")[0]  # e.g., "video01"
    try:
        video_num = int(prefix.replace("video", ""))
        if video_num in video_list:
            src_path = os.path.join(src_folder, fname)
            dest_path = os.path.join(dest_folder, fname)
            shutil.copy2(src_path, dest_path)
            total_copied += 1
    except:
        continue

print(f"Total copied files: {total_copied}")