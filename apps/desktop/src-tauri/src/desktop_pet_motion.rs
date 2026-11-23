use std::time::{Duration, Instant};

use serde::{Deserialize, Serialize};
use tauri::{Monitor, PhysicalPosition, WebviewWindow};

use super::{clamp_to_work_area, set_pet_bounds, DockSide};

const IDLE_TO_SLEEP_SECONDS: u64 = 300;
const WALK_DELAY: Duration = Duration::from_secs(18);
const WALK_DURATION: Duration = Duration::from_millis(1800);

#[derive(Clone, Copy, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Preferences {
    pub(super) look_enabled: bool,
    pub(super) walk_enabled: bool,
    pub(super) mini_enabled: bool,
    #[serde(default)]
    pub(super) bubble_style: BubbleStyle,
}

#[derive(Clone, Copy, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum BubbleStyle {
    #[default]
    Classic,
    Argos,
    Shimeji,
    Pixel,
}

#[derive(Clone, Copy, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum Focus {
    #[default]
    Idle,
    Working,
    Paused,
    Waiting,
}

#[derive(Default, Serialize)]
pub(crate) struct Sample {
    gaze: Option<u8>,
    sleeping: bool,
    walking: Option<&'static str>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SampleInput {
    pub(super) held: bool,
    pub(super) reduced_motion: bool,
    pub(super) supports_look: bool,
}

type MonitorGeometry = (i32, i32, u32, u32, u64);

struct Walk {
    geometry: Vec<MonitorGeometry>,
    start: PhysicalPosition<i32>,
    target: PhysicalPosition<i32>,
    direction: &'static str,
    started: Instant,
}

#[derive(Default)]
pub(super) struct Behavior {
    pub(super) preferences: Preferences,
    pub(super) focus: Focus,
    gaze: Option<u8>,
    walk: Option<Walk>,
    next_walk: Option<Instant>,
    awake_until: Option<Instant>,
}

impl Behavior {
    pub(super) fn interrupt(&mut self, wake: bool) {
        let now = Instant::now();
        self.gaze = None;
        self.walk = None;
        self.next_walk = Some(now + WALK_DELAY);
        if wake {
            self.awake_until = Some(now + Duration::from_secs(5));
        }
    }

    pub(super) fn sample(&mut self, window: &WebviewWindow, input: SampleInput) -> tauri::Result<Sample> {
        let now = Instant::now();
        let sleeping = should_sleep(
            self.focus,
            crate::system_idle::get_system_idle_seconds().ok().flatten(),
            input.held || self.awake_until.is_some_and(|until| now < until),
        );
        if sleeping || input.held || input.reduced_motion || self.focus != Focus::Idle {
            self.interrupt(false);
            return Ok(Sample { sleeping, ..Sample::default() });
        }

        let look = self.preferences.look_enabled && input.supports_look;
        if !look && !self.preferences.walk_enabled {
            return Ok(Sample::default());
        }
        let position = window.outer_position()?;
        let size = window.outer_size()?;
        let center_x = f64::from(position.x) + f64::from(size.width) / 2.0;
        let center_y = f64::from(position.y) + f64::from(size.height) / 2.0;
        let Some(monitor) = window.monitor_from_point(center_x, center_y)? else {
            self.interrupt(false);
            super::position_on_work_area(window)?;
            return Ok(Sample::default());
        };

        if self.preferences.walk_enabled {
            if let Some(walk) = &self.walk {
                if walk.geometry != monitor_geometry(window)? {
                    self.interrupt(false);
                    window.set_position(clamp_to_work_area(position, size, &monitor))?;
                    return Ok(Sample::default());
                }
                let duration = now.duration_since(walk.started);
                let fraction = (duration.as_secs_f64() / WALK_DURATION.as_secs_f64()).min(1.0);
                let next = PhysicalPosition::new(
                    interpolate(walk.start.x, walk.target.x, fraction),
                    interpolate(walk.start.y, walk.target.y, fraction),
                );
                if next != position {
                    set_pet_bounds(window, clamp_to_work_area(next, size, &monitor), size)?;
                }
                if duration < WALK_DURATION {
                    return Ok(Sample { walking: Some(walk.direction), ..Sample::default() });
                }
                self.interrupt(false);
            }
        }

        if look {
            let cursor = window.cursor_position()?;
            let scale = monitor.scale_factor();
            self.gaze = gaze_direction((cursor.x - center_x) / scale, (cursor.y - center_y) / scale, self.gaze);
            if self.gaze.is_some() {
                self.next_walk = Some(now + WALK_DELAY);
                return Ok(Sample { gaze: self.gaze, ..Sample::default() });
            }
        }

        if self.preferences.walk_enabled && now >= *self.next_walk.get_or_insert(now + WALK_DELAY) {
            self.next_walk = Some(now + WALK_DELAY);
            let work = monitor.work_area();
            let min = work.position;
            let max = PhysicalPosition::new(
                min.x + work.size.width.saturating_sub(size.width) as i32,
                min.y + work.size.height.saturating_sub(size.height) as i32,
            );
            if let Some((target, direction)) = walk_target(position, min, max, monitor.scale_factor()) {
                self.walk = Some(Walk { geometry: monitor_geometry(window)?, start: position, target, direction, started: now });
                return Ok(Sample { walking: Some(direction), ..Sample::default() });
            }
        }
        Ok(Sample::default())
    }

    pub(super) fn sample_peek(&mut self, window: &WebviewWindow, input: SampleInput, side: DockSide) -> tauri::Result<Sample> {
        if input.held || input.reduced_motion || !input.supports_look || !self.preferences.look_enabled {
            self.gaze = None;
            return Ok(Sample::default());
        }
        let origin = window.inner_position()?;
        let size = window.inner_size()?;
        let cursor = window.cursor_position()?;
        let dpi = window.scale_factor()?;
        let x = (cursor.x - f64::from(origin.x)) / dpi;
        let inward = match side {
            DockSide::Left => x,
            DockSide::Right => f64::from(size.width) / dpi - x,
        };
        let y = (cursor.y - f64::from(origin.y) - f64::from(size.height)) / dpi + 40.0;
        self.gaze = peek_gaze(inward, y, side, self.gaze);
        Ok(Sample { gaze: self.gaze, ..Sample::default() })
    }
}

fn should_sleep(focus: Focus, idle_seconds: Option<u64>, recently_interacted: bool) -> bool {
    matches!(focus, Focus::Idle | Focus::Paused)
        && !recently_interacted
        && idle_seconds.is_some_and(|seconds| seconds >= IDLE_TO_SLEEP_SECONDS)
}

fn gaze_direction(x: f64, y: f64, previous: Option<u8>) -> Option<u8> {
    let radius = x.hypot(y);
    if radius < 12.0 || radius > if previous.is_some() { 180.0 } else { 140.0 } {
        return None;
    }
    // Codex starts at twelve o'clock and numbers frames clockwise.
    let angle = x.atan2(-y).to_degrees().rem_euclid(360.0);
    Some((angle / 22.5).round() as u8 % 16)
}

fn peek_gaze(inward: f64, y: f64, side: DockSide, previous: Option<u8>) -> Option<u8> {
    if inward < 0.0 {
        return None;
    }
    // The visible half of the face is about 12 logical pixels from the edge.
    let x = inward - 12.0;
    let radius = x.hypot(y);
    if radius > if previous.is_some() { 180.0 } else { 140.0 } {
        return None;
    }
    let forward: u8 = if side == DockSide::Left { 4 } else { 12 };
    if radius < 12.0 {
        return Some(forward);
    }
    let offset = y.atan2(x.max(0.0)).to_degrees().clamp(-67.5, 67.5);
    let angle = f64::from(forward) * 22.5 + if side == DockSide::Left { offset } else { -offset };
    // Keep the last atlas direction for a few degrees past each sector boundary.
    if let Some(frame) = previous {
        if (angle - f64::from(frame) * 22.5).abs() <= 15.0 {
            return Some(frame);
        }
    }
    Some((angle / 22.5).round() as u8)
}

fn monitor_geometry(window: &WebviewWindow) -> tauri::Result<Vec<MonitorGeometry>> {
    let mut monitors: Vec<_> = window.available_monitors()?.iter().map(|monitor: &Monitor| {
        let work = monitor.work_area();
        (work.position.x, work.position.y, work.size.width, work.size.height, monitor.scale_factor().to_bits())
    }).collect();
    monitors.sort_unstable();
    Ok(monitors)
}

fn interpolate(start: i32, target: i32, fraction: f64) -> i32 {
    (f64::from(start) + f64::from(target - start) * fraction).round() as i32
}

fn walk_target(
    position: PhysicalPosition<i32>,
    min: PhysicalPosition<i32>,
    max: PhysicalPosition<i32>,
    scale: f64,
) -> Option<(PhysicalPosition<i32>, &'static str)> {
    if position.x < min.x || position.x > max.x || position.y < min.y || position.y > max.y {
        return None;
    }
    let edge_tolerance = (24.0 * scale).round() as i32;
    let distance = (96.0 * scale).round() as i32;
    let left = position.x - min.x;
    let right = max.x - position.x;
    let up = position.y - min.y;
    let down = max.y - position.y;
    let mut target = position;
    let direction = if up.min(down) <= edge_tolerance {
        if right > left {
            target.x += distance.min(right);
            "right"
        } else {
            target.x -= distance.min(left);
            "left"
        }
    } else if left.min(right) <= edge_tolerance {
        if down > up { target.y += distance.min(down); } else { target.y -= distance.min(up); }
        if left < right { "right" } else { "left" }
    } else {
        return None;
    };
    (target != position).then_some((target, direction))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gaze_follows_clockwise_frames_and_tip_distance_has_hysteresis() {
        for ((x, y), frame) in [((0.0, -50.0), 0), ((50.0, 0.0), 4), ((0.0, 50.0), 8), ((-50.0, 0.0), 12)] {
            assert_eq!(gaze_direction(x, y, None), Some(frame));
        }
        assert_eq!(gaze_direction(160.0, 0.0, None), None);
        assert_eq!(gaze_direction(160.0, 0.0, Some(4)), Some(4));
        assert_eq!(gaze_direction(181.0, 0.0, Some(4)), None);
    }

    #[test]
    fn docked_gaze_tracks_inward_with_distance_and_angle_hysteresis() {
        assert_eq!(peek_gaze(70.0, -60.0, DockSide::Left, None), Some(2));
        assert_eq!(peek_gaze(70.0, -60.0, DockSide::Right, None), Some(14));
        assert_eq!(peek_gaze(-1.0, 0.0, DockSide::Left, Some(4)), None);
        assert_eq!(peek_gaze(170.0, 0.0, DockSide::Left, None), None);
        assert_eq!(peek_gaze(170.0, 0.0, DockSide::Left, Some(4)), Some(4));
        assert_eq!(peek_gaze(193.0, 0.0, DockSide::Left, Some(4)), None);
        assert_eq!(peek_gaze(112.0, -24.0, DockSide::Left, None), Some(3));
        assert_eq!(peek_gaze(112.0, -24.0, DockSide::Left, Some(4)), Some(4));
    }

    #[test]
    fn sleep_depends_on_idle_time_and_focus() {
        assert!(should_sleep(Focus::Idle, Some(300), false));
        assert!(!should_sleep(Focus::Idle, Some(299), false));
        assert!(!should_sleep(Focus::Idle, None, false));
        assert!(!should_sleep(Focus::Idle, Some(500), true));
        assert!(!should_sleep(Focus::Working, Some(500), false));
        assert!(!should_sleep(Focus::Waiting, Some(500), false));
    }

    #[test]
    fn walking_stays_parallel_to_an_edge_with_dpi_scaled_distance() {
        let min = PhysicalPosition::new(-1600, 0);
        let max = PhysicalPosition::new(-200, 800);
        assert_eq!(walk_target(PhysicalPosition::new(-200, 780), min, max, 1.5), Some((PhysicalPosition::new(-344, 780), "left")));
        assert_eq!(walk_target(PhysicalPosition::new(-1580, 200), min, max, 1.5), Some((PhysicalPosition::new(-1580, 344), "right")));
        assert_eq!(walk_target(PhysicalPosition::new(-900, 400), min, max, 1.5), None);
    }
}
