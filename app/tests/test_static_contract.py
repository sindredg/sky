from pathlib import Path

ROOT = Path(__file__).parents[2]
STATIC = ROOT / "app" / "static"


def read(name: str) -> str:
    return (STATIC / name).read_text()


def test_hour_labels_are_placed_by_hour_rather_than_by_column():
    script = read("app.js")

    # Equal columns centre each label half a column past its own hour.
    assert "(hour / 24) * 100" in script
    assert "gridTemplateColumns" not in script


def test_the_hour_scale_marks_both_ends_of_the_day():
    script = read("app.js")

    # Without a label at 24 the right edge of the bar has no reference.
    assert "[0, 6, 12, 18, 24]" in script
    assert "[0, 3, 6, 9, 12, 15, 18, 21, 24]" in script
