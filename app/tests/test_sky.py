from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from app.src import sky


@pytest.mark.parametrize(
    ("day", "elapsed_hours"),
    (
        (date(2026, 3, 29), 23),
        (date(2026, 10, 25), 25),
    ),
)
def test_sample_day_spans_the_actual_local_day_on_dst_transitions(day, elapsed_hours):
    zone = ZoneInfo("Europe/Oslo")

    samples = sky.sample_day(day, lambda _: 0.0, zone)

    assert len(samples) == elapsed_hours * 60 + 1
    assert samples[-1].at - samples[0].at == timedelta(hours=elapsed_hours)
    assert samples[0].at.astimezone(zone) == datetime(
        day.year, day.month, day.day, tzinfo=zone
    )
    tomorrow = day + timedelta(days=1)
    assert samples[-1].at.astimezone(zone) == datetime(
        tomorrow.year, tomorrow.month, tomorrow.day, tzinfo=zone
    )


def test_sampling_between_two_instants_covers_the_span():
    from datetime import UTC, datetime, timedelta

    start = datetime(2026, 6, 21, 12, tzinfo=UTC)
    end = start + timedelta(hours=24)
    samples = sky.sample_between(start, end, lambda w: 0.0, step_minutes=60)

    assert samples[0].at == start
    assert samples[-1].at == end
    assert len(samples) == 25
