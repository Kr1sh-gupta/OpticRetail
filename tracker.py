"""
tracker.py — Centroid-Based Person Tracker with Re-ID
======================================================
Assigns stable visitor_id tokens across video frames using
IOU (Intersection-over-Union) bounding box matching.
Handles re-entry detection: if a visitor who previously exited
reappears, emits REENTRY instead of a second ENTRY event.
"""
import uuid
import logging
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, field
from datetime import datetime, timezone

logger = logging.getLogger("opticretail.tracker")

# How many frames a track can be "lost" before it is considered exited
MAX_LOST_FRAMES = 30

# IOU threshold to match a detection to an existing track
IOU_MATCH_THRESHOLD = 0.30

# Re-entry window: seconds after an EXIT before re-appearance is a REENTRY
REENTRY_WINDOW_SECS = 300  # 5 minutes


@dataclass
class Track:
    visitor_id: str
    bbox: Tuple[int, int, int, int]   # x1, y1, x2, y2
    is_staff: bool
    confidence: float
    lost_frames: int = 0
    session_seq: int = 0
    zone_id: Optional[str] = None
    zone_enter_time: Optional[datetime] = None
    first_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    exited: bool = False
    exit_time: Optional[datetime] = None


def compute_iou(box_a: Tuple, box_b: Tuple) -> float:
    """Computes Intersection over Union between two bounding boxes."""
    xa = max(box_a[0], box_b[0])
    ya = max(box_a[1], box_b[1])
    xb = min(box_a[2], box_b[2])
    yb = min(box_a[3], box_b[3])

    inter_area = max(0, xb - xa) * max(0, yb - ya)
    if inter_area == 0:
        return 0.0

    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union_area = area_a + area_b - inter_area
    return inter_area / union_area if union_area > 0 else 0.0


class Tracker:
    def __init__(self):
        self.active_tracks: Dict[str, Track] = {}
        self.exited_tracks: Dict[str, Track] = {}  # visitor_id → exited track for re-ID

    def _generate_visitor_id(self) -> str:
        return "VIS_" + uuid.uuid4().hex[:6].upper()

    def _find_reentry_match(self, bbox: Tuple, now: datetime) -> Optional[str]:
        """
        Checks if this bounding box matches a recently-exited track.
        Used for Re-ID: same person returning = REENTRY, not new ENTRY.
        """
        for vid, track in list(self.exited_tracks.items()):
            if track.exit_time is None:
                continue
            elapsed = (now - track.exit_time).total_seconds()
            if elapsed > REENTRY_WINDOW_SECS:
                del self.exited_tracks[vid]
                continue
            # Loose centroid proximity check for re-entry
            cx_new = (bbox[0] + bbox[2]) / 2
            cy_new = (bbox[1] + bbox[3]) / 2
            cx_old = (track.bbox[0] + track.bbox[2]) / 2
            cy_old = (track.bbox[1] + track.bbox[3]) / 2
            if abs(cx_new - cx_old) < 150 and abs(cy_new - cy_old) < 150:
                return vid
        return None

    def update(
        self,
        detections: List[Tuple[Tuple[int, int, int, int], bool, float]],
        now: datetime
    ) -> Tuple[List[Tuple[Track, str]], List[Track]]:
        """
        Matches new detections to existing tracks using IOU.

        Returns:
          - matched: list of (track, event_type) — "ENTRY", "REENTRY", or None (ongoing)
          - lost: list of tracks that exceeded MAX_LOST_FRAMES (triggers EXIT)
        """
        matched_ids = set()
        new_events: List[Tuple[Track, str]] = []

        # Step 1: Match each detection to an existing active track
        for (bbox, is_staff, confidence) in detections:
            best_iou = IOU_MATCH_THRESHOLD
            best_id = None

            for vid, track in self.active_tracks.items():
                iou = compute_iou(bbox, track.bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_id = vid

            if best_id:
                # Update existing track
                track = self.active_tracks[best_id]
                track.bbox = bbox
                track.last_seen = now
                track.lost_frames = 0
                track.confidence = confidence
                matched_ids.add(best_id)
            else:
                # New detection — check for re-entry first
                reentry_id = self._find_reentry_match(bbox, now)
                if reentry_id:
                    old_track = self.exited_tracks.pop(reentry_id)
                    old_track.bbox = bbox
                    old_track.exited = False
                    old_track.exit_time = None
                    old_track.last_seen = now
                    old_track.session_seq += 1
                    self.active_tracks[reentry_id] = old_track
                    matched_ids.add(reentry_id)
                    new_events.append((old_track, "REENTRY"))
                    logger.info(f"[TRACKER] REENTRY detected for {reentry_id}")
                else:
                    # Brand new visitor
                    vid = self._generate_visitor_id()
                    new_track = Track(
                        visitor_id=vid,
                        bbox=bbox,
                        is_staff=is_staff,
                        confidence=confidence,
                        first_seen=now,
                        last_seen=now
                    )
                    self.active_tracks[vid] = new_track
                    matched_ids.add(vid)
                    new_events.append((new_track, "ENTRY"))
                    logger.debug(f"[TRACKER] New {'STAFF' if is_staff else 'VISITOR'} → {vid}")

        # Step 2: Increment lost_frames for unmatched tracks
        lost_tracks = []
        for vid in list(self.active_tracks.keys()):
            if vid not in matched_ids:
                self.active_tracks[vid].lost_frames += 1
                if self.active_tracks[vid].lost_frames > MAX_LOST_FRAMES:
                    track = self.active_tracks.pop(vid)
                    track.exited = True
                    track.exit_time = now
                    self.exited_tracks[vid] = track
                    lost_tracks.append(track)

        return new_events, lost_tracks
