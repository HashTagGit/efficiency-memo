pub(crate) fn minute_in_window(minute: i64, start: i64, end: i64) -> bool {
    if start < end {
        minute >= start && minute < end
    } else {
        minute >= start || minute < end
    }
}
