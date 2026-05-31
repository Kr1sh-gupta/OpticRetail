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
import threading
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
    shirt_color: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    pants_color: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    traits: str = "unknown"
    staff_votes: int = 0
    total_votes: int = 0
    emitted_entry: bool = False
    lost_frames: int = 0
    session_seq: int = 0
    zone_id: Optional[str] = None
    zone_enter_time: Optional[datetime] = None
    first_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    exited: bool = False
    exit_time: Optional[datetime] = None
    centroid_history: List[Tuple[float, float]] = field(default_factory=list)
    static_frames: int = 0
    is_static: bool = False

    def update_centroid(self, bbox: Tuple[int, int, int, int]):
        self.bbox = bbox
        cx = (bbox[0] + bbox[2]) / 2.0
        cy = (bbox[1] + bbox[3]) / 2.0
        self.centroid_history.append((cx, cy))
        if len(self.centroid_history) > 30:
            self.centroid_history.pop(0)
        if len(self.centroid_history) >= 12:
            xs = [pt[0] for pt in self.centroid_history]
            ys = [pt[1] for pt in self.centroid_history]
            dx = max(xs) - min(xs)
            dy = max(ys) - min(ys)
            if dx < 6.0 and dy < 6.0:
                self.static_frames += 1
                if self.static_frames >= 10:
                    self.is_static = True
            else:
                self.static_frames = 0
                self.is_static = False


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


# Global Re-ID Registry shared across all camera trackers in the same pipeline run
# Key: visitor_id (e.g. VIS_CEC909)
# Value: Dict containing:
#   - 'color_signature': Tuple[float, float, float] (mean_h, mean_s, mean_v)
#   - 'last_seen_time': datetime
#   - 'camera_id': str
GLOBAL_REID_REGISTRY: Dict[str, dict] = {}
GLOBAL_REID_LOCK = threading.Lock()

# Staff registry: set of unique visitor_ids confirmed as staff at the ENTRY camera (CAM3).
# Interior cameras never add to this set — prevents false staff from crowded scenes.
GLOBAL_STAFF_REGISTRY: set = set()
GLOBAL_STAFF_LOCK = threading.Lock()


def reset_global_reid_registry():
    """Wipes the global cross-camera registry and staff registry for a fresh run."""
    global GLOBAL_STAFF_REGISTRY
    with GLOBAL_REID_LOCK:
        GLOBAL_REID_REGISTRY.clear()
    with GLOBAL_STAFF_LOCK:
        GLOBAL_STAFF_REGISTRY.clear()
    logger.info("[TRACKER] Global Cross-Cam Re-ID Registry has been reset.")


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
        detections: List[Tuple[Tuple[int, int, int, int], bool, float, Tuple[float, float, float], Tuple[float, float, float], str]],
        now: datetime,
        camera_id: str = "CAM1",
        camera_role: str = "INTERIOR"
    ) -> Tuple[List[Tuple[Track, str]], List[Track]]:
        """
        Matches new detections to existing tracks using IOU and cross-camera Re-ID.
        Accrues staff votes and confirms tracks after 3 active frames to capture fast-moving visitors.
        Utilizes thread-safe lock for parallel execution across all cameras.

        Returns:
          - matched: list of (track, event_type) — "ENTRY", "REENTRY", or None (ongoing)
          - lost: list of tracks that exceeded MAX_LOST_FRAMES (triggers EXIT)
        """
        matched_ids = set()
        new_events: List[Tuple[Track, str]] = []

        # Step 1: Match each detection to an existing active track
        for (bbox, is_staff, confidence, shirt_color, pants_color, traits) in detections:
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
                track.update_centroid(bbox)
                track.last_seen = now
                track.lost_frames = 0
                track.confidence = confidence
                
                # Accumulate staff votes and re-evaluate classification dynamically
                track.total_votes += 1
                track.staff_votes += 1 if is_staff else 0
                track.is_staff = (track.staff_votes / track.total_votes) > 0.5

                # Smooth/update shirt & pants color signature
                track.shirt_color = (
                    track.shirt_color[0] * 0.8 + shirt_color[0] * 0.2,
                    track.shirt_color[1] * 0.8 + shirt_color[1] * 0.2,
                    track.shirt_color[2] * 0.8 + shirt_color[2] * 0.2,
                )
                track.pants_color = (
                    track.pants_color[0] * 0.8 + pants_color[0] * 0.2,
                    track.pants_color[1] * 0.8 + pants_color[1] * 0.2,
                    track.pants_color[2] * 0.8 + pants_color[2] * 0.2,
                )
                matched_ids.add(best_id)

                # Confirm and emit entry events only after 3 frames of stable tracking (ideal for entrance cameras)
                if track.total_votes >= 3 and not track.emitted_entry and not track.is_static:
                    track.emitted_entry = True
                    # Check registry safe with lock
                    with GLOBAL_REID_LOCK:
                        has_global = track.visitor_id in GLOBAL_REID_REGISTRY
                    event_type = "REENTRY" if track.session_seq > 0 or has_global else "ENTRY"
                    new_events.append((track, event_type))
                    
                    # Register brand new verified visitors in the global registry only AFTER they have been confirmed and emitted!
                    if not track.is_staff and not has_global:
                        with GLOBAL_REID_LOCK:
                            GLOBAL_REID_REGISTRY[track.visitor_id] = {
                                "shirt_color": track.shirt_color,
                                "pants_color": track.pants_color,
                                "traits": track.traits,
                                "last_seen_time": now,
                                "camera_id": camera_id
                            }
            else:
                # New detection — check for local re-entry first
                reentry_id = self._find_reentry_match(bbox, now)
                if reentry_id:
                    old_track = self.exited_tracks.pop(reentry_id)
                    old_track.update_centroid(bbox)
                    old_track.exited = False
                    old_track.exit_time = None
                    old_track.last_seen = now
                    old_track.session_seq += 1
                    old_track.emitted_entry = True  # Already verified and emitted before
                    self.active_tracks[reentry_id] = old_track
                    matched_ids.add(reentry_id)
                    new_events.append((old_track, "REENTRY"))
                    logger.info(f"[TRACKER] Local REENTRY detected for {reentry_id}")
                else:
                    # Brand new visitor in this camera — check GLOBAL Re-ID registry first
                    matched_global_id = None
                    best_dist = 28.0  # Threshold of 28.0 distance in HSV space
                    
                    if not is_staff:  # Visitors get Re-ID'ed, staff are handled by separate metrics
                        with GLOBAL_REID_LOCK:
                            registry_snapshot = list(GLOBAL_REID_REGISTRY.items())
                            
                        for reg_vid, reg_info in registry_snapshot:
                            # Avoid matching if they are seen on the same camera at the exact same moment (prevents duplicate matching)
                            time_diff = abs((now - reg_info["last_seen_time"]).total_seconds())
                            if reg_info["camera_id"] == camera_id and time_diff < 2:
                                continue
                            
                            # Euclidean distance in HSV space for BOTH shirt and pants
                            sig_a_shirt = shirt_color
                            sig_b_shirt = reg_info["shirt_color"]
                            dist_shirt = ((sig_a_shirt[0] - sig_b_shirt[0])**2 + (sig_a_shirt[1] - sig_b_shirt[1])**2 + (sig_a_shirt[2] - sig_b_shirt[2])**2)**0.5
                            
                            sig_a_pants = pants_color
                            sig_b_pants = reg_info["pants_color"]
                            dist_pants = ((sig_a_pants[0] - sig_b_pants[0])**2 + (sig_a_pants[1] - sig_b_pants[1])**2 + (sig_a_pants[2] - sig_b_pants[2])**2)**0.5
                            
                            # Combined clothing signature distance
                            dist = (dist_shirt + dist_pants) / 2
                            
                            # Limit Re-ID match window to 10 minutes (600 seconds)
                            if dist < best_dist and time_diff < 600:
                                best_dist = dist
                                matched_global_id = reg_vid
 
                    if matched_global_id:
                        vid = matched_global_id
                        with GLOBAL_REID_LOCK:
                            registered_traits = GLOBAL_REID_REGISTRY[vid]["traits"]
                        logger.info(f"[TRACKER] Global Re-ID matched existing visitor {vid} with traits ({registered_traits}) from {GLOBAL_REID_REGISTRY[vid]['camera_id']} to {camera_id} (HSV dist: {best_dist:.2f})")
                        
                        # Create track with the matched global visitor ID
                        new_track = Track(
                            visitor_id=vid,
                            bbox=bbox,
                            is_staff=is_staff,
                            staff_votes=1 if is_staff else 0,
                            total_votes=1,
                            confidence=confidence,
                            shirt_color=shirt_color,
                            pants_color=pants_color,
                            traits=traits,
                            first_seen=now,
                            last_seen=now,
                            emitted_entry=False
                        )
                        new_track.update_centroid(bbox)
                        self.active_tracks[vid] = new_track
                        matched_ids.add(vid)
                        
                        # Update registry with thread-safe lock
                        with GLOBAL_REID_LOCK:
                            GLOBAL_REID_REGISTRY[vid]["last_seen_time"] = now
                            GLOBAL_REID_REGISTRY[vid]["camera_id"] = camera_id
                    else:
                        # Brand new person — only create new IDs at the ENTRY camera (CAM3).
                        # Interior/billing cameras see people who were ALREADY inside the store.
                        # Creating new IDs from crowded interior frames is the root cause of
                        # inflated visitor/staff counts.
                        if camera_role != "ENTRY":
                            # Unknown person in interior/billing camera → skip.
                            # Either staff (handled by ENTRY camera) or visitor not yet seen at entrance.
                            continue
 
                        vid = self._generate_visitor_id()
                        new_track = Track(
                            visitor_id=vid,
                            bbox=bbox,
                            is_staff=is_staff,
                            staff_votes=1 if is_staff else 0,
                            total_votes=1,
                            confidence=confidence,
                            shirt_color=shirt_color,
                            pants_color=pants_color,
                            traits=traits,
                            first_seen=now,
                            last_seen=now,
                            emitted_entry=False
                        )
                        new_track.update_centroid(bbox)
                        self.active_tracks[vid] = new_track
                        matched_ids.add(vid)
                        logger.info(f"[TRACKER] [{camera_id}/ENTRY] Tracking brand new {'STAFF' if is_staff else 'VISITOR'} → {vid} with traits ({traits}) (awaiting confirmation)")
                        


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
