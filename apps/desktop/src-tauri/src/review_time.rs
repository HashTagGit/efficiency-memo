use chrono::{DateTime, Days, NaiveDate, NaiveTime, Utc};

pub(crate) fn validated_local_range(
    local_date: &str,
    started_at: &str,
    ended_at: &str,
    days: u64,
    min_hours: i64,
    max_hours: i64,
) -> Result<(DateTime<Utc>, DateTime<Utc>), String> {
    let local_date = NaiveDate::parse_from_str(local_date, "%Y-%m-%d")
        .map_err(|_| "invalid-date".to_string())?;
    let started_at = DateTime::parse_from_rfc3339(started_at)
        .map_err(|_| "invalid-date".to_string())?;
    let ended_at = DateTime::parse_from_rfc3339(ended_at)
        .map_err(|_| "invalid-date".to_string())?;
    let next_date = local_date
        .checked_add_days(Days::new(days))
        .ok_or_else(|| "invalid-date".to_string())?;
    let duration_seconds = (ended_at - started_at).num_seconds();
    if started_at.date_naive() != local_date
        || ended_at.date_naive() != next_date
        || started_at.time() != NaiveTime::MIN
        || ended_at.time() != NaiveTime::MIN
        || !(min_hours * 3600..=max_hours * 3600).contains(&duration_seconds)
    {
        return Err("invalid-date".to_string());
    }
    Ok((started_at.with_timezone(&Utc), ended_at.with_timezone(&Utc)))
}

fn overlap_milliseconds(
    started_at: DateTime<Utc>,
    ended_at: DateTime<Utc>,
    range_started_at: DateTime<Utc>,
    range_ended_at: DateTime<Utc>,
) -> i64 {
    let start = started_at.timestamp_millis().max(range_started_at.timestamp_millis());
    let end = ended_at.timestamp_millis().min(range_ended_at.timestamp_millis());
    (end - start).max(0)
}

pub(crate) fn interval_overlap_milliseconds(
    started_at: &str,
    ended_at: &str,
    range_started_at: DateTime<Utc>,
    range_ended_at: DateTime<Utc>,
) -> Result<i64, String> {
    let started_at = DateTime::parse_from_rfc3339(started_at)
        .map_err(|_| "invalid-date".to_string())?
        .with_timezone(&Utc);
    let ended_at = DateTime::parse_from_rfc3339(ended_at)
        .map_err(|_| "invalid-date".to_string())?
        .with_timezone(&Utc);
    Ok(overlap_milliseconds(
        started_at,
        ended_at,
        range_started_at,
        range_ended_at,
    ))
}

pub(crate) fn prorated_elapsed_seconds(
    started_at: &str,
    ended_at: &str,
    elapsed_seconds: i64,
    range_started_at: DateTime<Utc>,
    range_ended_at: DateTime<Utc>,
) -> Result<i64, String> {
    let started_at = DateTime::parse_from_rfc3339(started_at)
        .map_err(|_| "invalid-date".to_string())?
        .with_timezone(&Utc);
    let ended_at = DateTime::parse_from_rfc3339(ended_at)
        .map_err(|_| "invalid-date".to_string())?
        .with_timezone(&Utc);
    let wall_milliseconds = (ended_at - started_at).num_milliseconds().max(1);
    let overlap = overlap_milliseconds(
        started_at,
        ended_at,
        range_started_at,
        range_ended_at,
    );
    Ok((elapsed_seconds as f64 * overlap as f64 / wall_milliseconds as f64).round() as i64)
}

#[cfg(test)]
mod tests {
    use super::validated_local_range;

    #[test]
    fn accepts_dst_sized_local_days_and_weeks() {
        assert!(validated_local_range(
            "2026-03-29",
            "2026-03-29T00:00:00+01:00",
            "2026-03-30T00:00:00+02:00",
            1,
            22,
            26,
        )
        .is_ok());
        assert!(validated_local_range(
            "2026-10-25",
            "2026-10-25T00:00:00+02:00",
            "2026-10-26T00:00:00+01:00",
            1,
            22,
            26,
        )
        .is_ok());
        assert!(validated_local_range(
            "2026-03-23",
            "2026-03-23T00:00:00+01:00",
            "2026-03-30T00:00:00+02:00",
            7,
            166,
            170,
        )
        .is_ok());
        assert!(validated_local_range(
            "2026-10-19",
            "2026-10-19T00:00:00+02:00",
            "2026-10-26T00:00:00+01:00",
            7,
            166,
            170,
        )
        .is_ok());
        assert!(validated_local_range(
            "2026-03-29",
            "2026-03-29T00:00:00+01:00",
            "2026-03-29T21:00:00+01:00",
            1,
            22,
            26,
        )
        .is_err());
    }
}
