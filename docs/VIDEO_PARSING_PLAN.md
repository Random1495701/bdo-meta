# Video Parsing Plan — Detecting Double Casts & Hanging Time

> **Goal**: Improve animation duration accuracy by detecting when a bdocodex
> preview video shows a skill being cast twice, or has "hanging time" (idle
> frames at the end after the skill animation completes).

## Problem

Currently, `ffprobe` returns the total video duration, which we use as the
skill's `animationDurationMs`. However, bdocodex preview videos sometimes:

1. **Loop the skill twice** — the video shows the skill animation, then repeats
   it. The actual animation duration is half the video duration.
2. **Have hanging time** — after the skill animation completes, there are
   several seconds of the character standing idle before the video ends.
3. **Show a partial cast** — the video may start mid-animation or cut short.

This means our `animationDurationMs` values can be 2x too high (double cast)
or inflated by idle frames (hanging time).

## Analysis Plan (Not Yet Executed)

### Phase 1: Statistical Analysis of Existing Durations

Download a sample of 50 preview videos and analyze their frame structure:

```bash
# For each video, extract frame timestamps and detect:
# - Scene changes (indicating a loop/repeat)
# - Static frames (indicating hanging time)
ffprobe -show_frames -select_streams v -print_format json "VIDEO_URL" \
  | jq '.frames[] | {pkt_pts_time, pict_type}'
```

**Detection methods:**

1. **Double-cast detection**: Compare the first half of frames to the second
   half. If they're nearly identical (high correlation), the video loops.
   Use `ffmpeg` to extract two thumbnails at 25% and 75% of duration and
   compare them visually (pixel diff).

2. **Hanging-time detection**: Extract the last 10 frames and check if they're
   identical (static). If the last N frames are identical, subtract that
   duration from the total.

```bash
# Extract frame at 25% and 75% of duration
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "VIDEO_URL")
ffmpeg -ss $(echo "$DURATION * 0.25" | bc) -i "VIDEO_URL" -frames:v 1 frame_25p.png
ffmpeg -ss $(echo "$DURATION * 0.75" | bc) -i "VIDEO_URL" -frames:v 1 frame_75p.png

# Compare the two frames (pixel diff)
# If diff < threshold → video loops → actual duration = DURATION / 2
```

### Phase 2: Frame-Difference Analysis

For each video, compute a "motion curve" — the pixel difference between
consecutive frames over time. This reveals:

- **Active animation**: high frame-to-frame difference (character is moving)
- **Hanging time**: zero/near-zero frame-to-frame difference (character is idle)
- **Loop point**: a sudden drop to zero followed by a restart of the same
  motion pattern

```bash
# Extract motion curve: for each frame, compute average pixel diff with previous
ffmpeg -i "VIDEO_URL" -vf "select=gt(scene\,0.005),showinfo" -f null - 2>&1 \
  | grep "pts_time" | awk '{print $6}'
```

The `scene` filter in ffmpeg detects scene changes. A value near 0 = no change
(hanging time), a spike = scene change (loop restart).

### Phase 3: Duration Correction Algorithm

Based on the analysis, implement a correction algorithm:

```
1. Get raw duration from ffprobe (current approach)
2. Extract the motion curve (frame-to-frame scene change values)
3. Detect hanging time: find the last frame where scene > threshold
   → actual_end = timestamp of that frame
4. Detect double cast: compare motion curve of first half vs second half
   → if correlation > 0.9, divide duration by 2
5. corrected_duration = actual_end (or actual_end / 2 if double cast)
```

### Phase 4: Validation

Compare corrected durations against known BDO frame data:
- BDO runs at 60 FPS internally
- Most skill animations are 30-120 frames (0.5s - 2s)
- Ultimate/awakening skills can be up to 180 frames (3s)
- If our corrected duration is > 5s, it's likely still wrong

### Implementation Plan (When Ready to Execute)

1. **`scripts/analyze-videos.ts`**: Download 50 sample videos, extract motion
   curves, and output a JSON report with detected double-casts and hanging times.

2. **Update `scripts/sync-lurker.ts`**: Replace the simple `ffprobe` call with
   a more sophisticated analysis:
   ```typescript
   async function getVideoDurationMs(url: string): Promise<number | null> {
     // 1. Get raw duration
     const rawSec = await ffprobeDuration(url)
     // 2. Extract motion curve
     const motionCurve = await extractMotionCurve(url)
     // 3. Detect hanging time
     const activeEnd = detectHangingTime(motionCurve)
     // 4. Detect double cast
     const isDoubleCast = detectDoubleCast(motionCurve)
     // 5. Compute corrected duration
     const corrected = isDoubleCast ? activeEnd / 2 : activeEnd
     return Math.round(corrected * 1000)
   }
   ```

3. **Re-process all skills** with the corrected algorithm via the lurker's
   `--videos` mode.

### Tools Required

- `ffmpeg` / `ffprobe` (already installed)
- No additional packages needed — ffmpeg's `scene` filter and `showinfo`
  provide everything we need

### Estimated Effort

- Phase 1 (statistical analysis): ~1 hour
- Phase 2 (motion curve extraction): ~2 hours
- Phase 3 (correction algorithm): ~2 hours
- Phase 4 (validation + re-process): ~1 hour
- **Total**: ~6 hours

### Risks

- Some videos may be very short (< 1s), making frame analysis unreliable
- bdocodex may encode videos with variable frame rates, complicating analysis
- The `scene` filter threshold may need tuning per video quality
- Downloading videos for analysis may trigger bdocodex rate limiting (use the
  lurker's endpoint rotation + JS challenge solver)

### Alternative Approach: Manual Calibration

If automated detection proves unreliable, a simpler approach:
1. Manually time 20 representative skills in-game
2. Compare with ffprobe durations
3. Apply a fixed correction factor (e.g., duration × 0.65) if the inflation
   is consistent

This is less accurate but much faster to implement (~30 minutes).
