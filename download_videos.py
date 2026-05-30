"""
download_videos.py — Google Drive Video Downloader
====================================================
Downloads CCTV footage from Google Drive into /app/videos/ at container startup.
Uses gdown which handles Google's large-file confirmation gate automatically.

HOW TO GET YOUR FILE IDs:
  1. Upload each CAM video to Google Drive
  2. Right-click → Share → "Anyone with the link" → Copy link
  3. The link looks like: https://drive.google.com/file/d/XXXXXXXXXXXXXXX/view?usp=sharing
  4. The FILE_ID is the XXXXXXXXXXXXXXX part — paste it below.

Videos are only downloaded if the file doesn't already exist, so re-runs are fast.
"""
import os
import logging
import gdown

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("opticretail.downloader")

VIDEO_DIR = "/app/videos"
os.makedirs(VIDEO_DIR, exist_ok=True)

# ─── FILL IN YOUR GOOGLE DRIVE FILE IDs BELOW ────────────────────────────────
# Format: ("filename", "Google Drive File ID")
VIDEOS = [
    ("CAM 1.mp4", "1Wfiq5LbW7cVCfoV0ATwx5-ARSsZp427v"),
    ("CAM 2.mp4", "1y3xQxR5ZsRG9VgNa37jp8j8wVFT6husY"),
    ("CAM 3.mp4", "1KtKU99e65FRj5Yd1-_2WPWFaB2vjdfsy"),
    ("CAM 4.mp4", "1fstBVbIKUc75MaUVwvXjrIN5M_lP_udc"),
    ("CAM 5.mp4", "1ECduXW94UOMWIeAoMAqqhhZKoc1_sMGW"),
]
# ─────────────────────────────────────────────────────────────────────────────


def download_video(filename: str, file_id: str) -> bool:
    dest = os.path.join(VIDEO_DIR, filename)

    if os.path.exists(dest):
        logger.info(f"[SKIP] {filename} already exists at {dest}")
        return True

    if file_id.startswith("PASTE_"):
        logger.warning(f"[SKIP] {filename} — no Drive ID configured. Set it in download_videos.py")
        return False

    url = f"https://drive.google.com/uc?id={file_id}"
    logger.info(f"[DOWNLOAD] {filename} from Google Drive...")
    try:
        gdown.download(url, dest, quiet=False)
        logger.info(f"[OK] {filename} saved to {dest}")
        return True
    except Exception as e:
        logger.error(f"[FAIL] Could not download {filename}: {e}")
        return False


if __name__ == "__main__":
    logger.info("=== OpticRetail Video Downloader ===")
    success_count = 0
    for filename, file_id in VIDEOS:
        if download_video(filename, file_id):
            success_count += 1

    logger.info(f"Download complete: {success_count}/{len(VIDEOS)} videos ready.")
    if success_count == 0:
        logger.warning(
            "No videos available! Fill in Google Drive IDs in download_videos.py, "
            "or use the bind mount option in docker-compose.yml instead."
        )
