from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import shutil, tempfile, os, base64
import torch
import torch.nn.functional as F
from transformers import SegformerForSemanticSegmentation, SegformerConfig
import cv2
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=True,
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

CHECKPOINT_PATH = "segformer_best.pt"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
NUM_CLASSES = 14
IMAGE_SIZE = 512

CLASS_COLORS = {
    0:  (0,   0,   0),
    1:  (255, 100, 0),
    2:  (0,   200, 50),
    3:  (200, 0,   200),
    4:  (0,   220, 220),
    5:  (0,   0,   255),
    6:  (180, 180, 0),
    7:  (0,   0,   180),
    8:  (255, 0,   150),
    9:  (100, 255, 100),
    10: (255, 200, 0),
    11: (0,   100, 255),
    12: (150, 50,  255),
    13: (128, 128, 128),
}

CLASS_NAMES = {
    0:  "Background",
    1:  "Abdominal Wall",
    2:  "Liver",
    3:  "GI Tract",
    4:  "Fat",
    5:  "Grasper",
    6:  "Connective Tissue",
    7:  "Blood",
    8:  "Cystic Duct",
    9:  "L-Hook Cautery",
    10: "Gallbladder",
    11: "Hepatic Vein",
    12: "Liver Ligament",
    13: "Other",
}

def load_model():
    config = SegformerConfig(num_labels=NUM_CLASSES)
    model = SegformerForSemanticSegmentation(config)
    ckpt = torch.load(CHECKPOINT_PATH, map_location="cpu")
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval().to(DEVICE)
    print(f"Loaded epoch {ckpt['epoch']}, val mIoU={ckpt['val_miou']:.4f}")
    return model

model = load_model()

def preprocess_frame(frame: np.ndarray) -> torch.Tensor:
    frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    frame = cv2.resize(frame, (IMAGE_SIZE, IMAGE_SIZE))
    tensor = torch.from_numpy(frame).permute(2, 0, 1).float() / 255.0
    mean = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
    std  = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)
    return ((tensor - mean) / std).unsqueeze(0).to(DEVICE)

def seg_map_to_heatmap(seg_map: np.ndarray, original_frame: np.ndarray) -> str:
    h, w = original_frame.shape[:2]
    seg_resized = cv2.resize(seg_map.astype(np.uint8), (w, h), interpolation=cv2.INTER_NEAREST)

    color_mask = np.zeros((h, w, 3), dtype=np.uint8)
    for class_id, color in CLASS_COLORS.items():
        color_mask[seg_resized == class_id] = color

    overlay = original_frame.copy()
    non_bg = seg_resized != 0
    overlay[non_bg] = cv2.addWeighted(original_frame, 0.45, color_mask, 0.55, 0)[non_bg]

    present_classes = [c for c in np.unique(seg_resized) if c != 0]
    legend_x = w - 180
    legend_y = 10
    for i, class_id in enumerate(present_classes):
        color = CLASS_COLORS[class_id]
        label = CLASS_NAMES[class_id]
        y = legend_y + i * 22
        cv2.rectangle(overlay, (legend_x, y), (legend_x + 16, y + 16), color, -1)
        cv2.putText(overlay, label, (legend_x + 22, y + 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

    _, buffer = cv2.imencode(".jpg", overlay, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buffer).decode("utf-8")

def run_your_model(video_path: str) -> dict:
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"error": "Could not open video"}

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    frame_results = []
    frame_idx = 0
    SKIP = 3

    with torch.no_grad():
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % SKIP != 0:
                frame_idx += 1
                continue

            pixel_values = preprocess_frame(frame)
            outputs = model(pixel_values=pixel_values)

            logits = F.interpolate(
                outputs.logits,
                size=(frame.shape[0], frame.shape[1]),
                mode="bilinear",
                align_corners=False,
            )
            seg_map = logits.argmax(dim=1).squeeze().cpu().numpy()

            classes, counts = np.unique(seg_map, return_counts=True)
            dominant_class = int(classes[counts.argmax()])

            heatmap_b64 = seg_map_to_heatmap(seg_map, frame)

            frame_results.append({
                "frame": frame_idx,
                "timestamp": round(frame_idx / fps, 2),
                "dominant_class": dominant_class,
                "dominant_class_name": CLASS_NAMES[dominant_class],
                "heatmap": heatmap_b64,
            })
            frame_idx += 1

    cap.release()
    return {
        "fps": fps,
        "skip": SKIP,
        "total_frames_processed": len(frame_results),
        "frames": frame_results,
    }

@app.post("/process")
async def process_video(video: UploadFile = File(...)):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        shutil.copyfileobj(video.file, tmp)
        tmp_path = tmp.name
    try:
        result = run_your_model(tmp_path)
        return {"result": result}
    finally:
        os.unlink(tmp_path)

@app.get("/videos")
def list_videos():
    videos_dir = "videos"
    files = sorted([
        f.replace(".mp4", "")
        for f in os.listdir(videos_dir)
        if f.endswith(".mp4")
    ])
    return {"videos": files}

@app.get("/videos/{video_name}")
async def serve_video(video_name: str, request: Request):
    path = os.path.join("videos", f"{video_name}.mp4")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Video not found")

    file_size = os.path.getsize(path)
    range_header = request.headers.get("Range")

    if range_header:
        range_val = range_header.strip().replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iter_file(), status_code=206, headers=headers)

    def iter_full():
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    headers = {
        "Accept-Ranges": "bytes",
        "Content-Length": str(file_size),
        "Content-Type": "video/mp4",
    }
    return StreamingResponse(iter_full(), status_code=200, headers=headers)