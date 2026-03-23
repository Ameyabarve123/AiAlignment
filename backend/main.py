from fastapi import FastAPI, UploadFile, File
import shutil, tempfile, os

app = FastAPI()

@app.post("/process")
async def process_video(video: UploadFile = File(...)):
  # Save the file temporarily
  with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
    shutil.copyfileobj(video.file, tmp)
    tmp_path = tmp.name

  try:
    result = run_your_model(tmp_path)
    return {"result": result}
  finally:
    os.unlink(tmp_path)

def run_your_model(video_path: str):
  # AI model logic here
  return {"label": "example", "confidence": 0.95}