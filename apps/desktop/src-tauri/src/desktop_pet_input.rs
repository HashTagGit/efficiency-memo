use serde::Deserialize;

#[cfg(target_os = "windows")]
pub(super) mod windows {
    use std::{ffi::c_void, io};

    const GWL_EXSTYLE: i32 = -20;
    pub(super) const TRANSPARENT: i32 = 0x0000_0020;
    pub(super) const LAYERED: i32 = 0x0008_0000;

    #[link(name = "user32")]
    extern "system" {
        fn GetWindowLongW(window: *mut c_void, index: i32) -> i32;
        fn SetWindowLongW(window: *mut c_void, index: i32, value: i32) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn SetLastError(code: u32);
    }

    pub(super) fn cursor_style(style: i32, ignore: bool) -> i32 {
        let layered_style = style | LAYERED;
        if ignore { layered_style | TRANSPARENT } else { layered_style & !TRANSPARENT }
    }

    pub(in crate::desktop_pet) fn set_cursor_passthrough(window: &tauri::WebviewWindow, ignore: bool) -> tauri::Result<()> {
        let hwnd = window.hwnd()?.0;
        unsafe { SetLastError(0) };
        let style = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) };
        if style == 0 {
            let error = io::Error::last_os_error();
            if error.raw_os_error() != Some(0) { return Err(error.into()); }
        }
        let updated = cursor_style(style, ignore);
        if style != updated {
            // Keep composition on the same layered surface and avoid a frame redraw on hover.
            unsafe { SetLastError(0) };
            if unsafe { SetWindowLongW(hwnd, GWL_EXSTYLE, updated) } == 0 {
                let error = io::Error::last_os_error();
                if error.raw_os_error() != Some(0) { return Err(error.into()); }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Deserialize)]
pub(crate) struct HitRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    #[serde(default)]
    radius: f64,
}

impl HitRect {
    fn contains(&self, x: f64, y: f64) -> bool {
        if !(x >= self.x && y >= self.y && x < self.x + self.width && y < self.y + self.height) { return false; }
        let radius = self.radius.max(0.0).min(self.width / 2.0).min(self.height / 2.0);
        if radius == 0.0 { return true; }
        let edge_x = (x - self.x).min(self.x + self.width - x);
        let edge_y = (y - self.y).min(self.y + self.height - y);
        (radius - edge_x).max(0.0).hypot((radius - edge_y).max(0.0)) <= radius
    }
}

#[derive(Clone, Deserialize)]
pub(crate) struct SpriteHitMask {
    rect: HitRect,
    width: usize,
    height: usize,
    pixels: String,
}

impl SpriteHitMask {
    fn contains(&self, x: f64, y: f64) -> bool {
        if !self.rect.contains(x, y) { return false; }
        let column = ((x - self.rect.x) / self.rect.width * self.width as f64) as usize;
        let row = ((y - self.rect.y) / self.rect.height * self.height as f64) as usize;
        self.pixels.as_bytes().get(row * self.width + column) == Some(&b'1')
    }
}

#[derive(Clone, Deserialize)]
pub(crate) struct HitRegions {
    pub(super) held: bool,
    avatar: Option<HitRect>,
    sprite: Option<SpriteHitMask>,
    bubble: Option<HitRect>,
}

impl HitRegions {
    pub(super) fn valid(&self) -> bool {
        self.sprite.as_ref().map_or(true, |mask| {
            (1..=100).contains(&mask.width) && (1..=100).contains(&mask.height)
                && mask.pixels.len() == mask.width * mask.height
                && mask.pixels.bytes().all(|pixel| pixel == b'0' || pixel == b'1')
        })
    }

    pub(super) fn contains(&self, x: f64, y: f64) -> bool {
        let avatar = self.sprite.as_ref().map_or_else(
            || self.avatar.as_ref().is_some_and(|rect| rect.contains(x, y)),
            |sprite| sprite.contains(x, y),
        );
        self.held || avatar || self.bubble.as_ref().is_some_and(|bubble| bubble.contains(x, y))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "windows")]
    #[test]
    fn cursor_crossing_the_sprite_keeps_the_window_layered() {
        use super::windows::{cursor_style, LAYERED, TRANSPARENT};
        let topmost = 0x0008;
        let outside = cursor_style(topmost, true);
        assert_eq!(outside, topmost | LAYERED | TRANSPARENT);
        let inside = cursor_style(outside, false);
        assert_eq!(outside ^ inside, TRANSPARENT);
        assert_eq!(cursor_style(inside, true), outside);
    }

    #[test]
    fn opaque_pixels_and_bubble_are_clickable_but_sprite_padding_passes_through() {
        let avatar = HitRect { x: 10.0, y: 20.0, width: 4.0, height: 4.0, radius: 0.0 };
        let regions = HitRegions {
            held: false,
            avatar: Some(avatar.clone()),
            sprite: Some(SpriteHitMask { rect: avatar, width: 2, height: 2, pixels: "1000".to_owned() }),
            bubble: Some(HitRect { x: 2.0, y: 2.0, width: 100.0, height: 14.0, radius: 6.0 }),
        };
        assert!(regions.valid());
        assert!(regions.contains(11.0, 21.0));
        assert!(!regions.contains(13.0, 21.0));
        assert!(regions.contains(90.0, 8.0));
        assert!(!regions.contains(2.0, 2.0));
        assert!(!regions.contains(90.0, 90.0));
    }
}
