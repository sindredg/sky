"use strict";

// The bar is coloured from the real altitude curve, so the picture is the data.
const BANDS = [
  { above: 6, colour: "--day" },
  { above: -0.833, colour: "--golden" },
  { above: -4, colour: "--golden" },
  { above: -6, colour: "--blue-hour" },
  { above: -12, colour: "--nautical" },
  { above: -18, colour: "--astronomical" },
];

const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function colourFor(altitude) {
  for (const band of BANDS) {
    if (altitude > band.above) return css(band.colour);
  }
  return css("--night");
}

function paintBar(curve) {
  const stops = curve.map((altitude, index) => {
    const percent = (index / (curve.length - 1)) * 100;
    return `${colourFor(altitude)} ${percent.toFixed(2)}%`;
  });
  document.getElementById("bar").style.background =
    `linear-gradient(to right, ${stops.join(", ")})`;
}

function paintTicks() {
  const labels = ["00", "03", "06", "09", "12", "15", "18", "21"];
  document.getElementById("ticks").innerHTML = labels
    .map((h) => `<span>${h}</span>`)
    .join("");
}

const clock = (iso) => (iso ? iso.slice(11, 16) : null);

function describe(light) {
  if (light.midnight_sun) {
    return "The sun does not set. It dips toward the horizon and climbs again.";
  }
  if (light.polar_night) {
    return "The sun does not rise. The brightest the sky gets is a long blue twilight.";
  }
  const evening = light.golden_hour_evening;
  if (evening.start && evening.end) {
    return `Best light this evening between <b>${clock(evening.start)}</b> and <b>${clock(evening.end)}</b>.`;
  }
  return "";
}

function rows(target, pairs) {
  document.getElementById(target).innerHTML = pairs
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join("");
}

// Lit limb as a semicircle closed by the terminator ellipse.
function moonPath(fraction, waxing, radius) {
  const rx = radius * Math.abs(1 - 2 * fraction);
  const outer = waxing ? 1 : 0;
  const inner = fraction > 0.5 ? outer : 1 - outer;
  return [
    `M 0 ${-radius}`,
    `A ${radius} ${radius} 0 0 ${outer} 0 ${radius}`,
    `A ${rx} ${radius} 0 0 ${inner} 0 ${-radius}`,
    "Z",
  ].join(" ");
}

async function load() {
  const place = document.getElementById("place").value;
  const on = document.getElementById("date").value;
  const query = `place=${encodeURIComponent(place)}&on=${on}`;

  const [light, moon] = await Promise.all([
    fetch(`/api/light?${query}`).then((r) => r.json()),
    fetch(`/api/moon?${query}`).then((r) => r.json()),
  ]);

  paintBar(light.curve);
  document.getElementById("verdict").innerHTML = describe(light);

  rows("times", [
    ["Sunrise", clock(light.sunrise) ?? "does not rise"],
    ["Sunset", clock(light.sunset) ?? "does not set"],
    ["Golden hour, morning", clock(light.golden_hour_morning.start)],
    ["Golden hour, evening", clock(light.golden_hour_evening.start)],
    ["Sun at its highest", `${light.highest.altitude}\u00b0 at ${clock(light.highest.at)}`],
    ["Daylight", `${Math.floor(light.daylight_minutes / 60)} h ${light.daylight_minutes % 60} m`],
  ]);

  const waxing = moon.phase_angle < 180;
  document
    .getElementById("moon-lit")
    .setAttribute("d", moonPath(moon.illumination, waxing, 50));

  rows("moon-facts", [
    ["Phase", moon.phase],
    ["Lit", `${Math.round(moon.illumination * 100)}%`],
    ["Age", `${moon.age_days} days`],
    ["Moonrise", clock(moon.moonrise) ?? "does not rise"],
    ["Moonset", clock(moon.moonset) ?? "does not set"],
  ]);
}

function applyTheme(theme) {
  const button = document.getElementById("theme");
  if (theme) {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }
  const dark = theme
    ? theme === "dark"
    : matchMedia("(prefers-color-scheme: dark)").matches;
  button.textContent = dark ? "Light" : "Dark";
  button.setAttribute("aria-pressed", String(dark));
}

function startTheme() {
  applyTheme(localStorage.getItem("theme"));
  document.getElementById("theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    localStorage.setItem("theme", next);
    applyTheme(next);
  });
}

async function start() {
  startTheme();
  paintTicks();

  const places = await fetch("/api/places").then((r) => r.json());
  const select = document.getElementById("place");
  select.innerHTML = places.places
    .map((p) => `<option value="${p.slug}">${p.name}, ${p.country}</option>`)
    .join("");

  const notes = Object.fromEntries(places.places.map((p) => [p.slug, p.note]));
  const date = document.getElementById("date");
  date.value = new Date().toISOString().slice(0, 10);

  const refresh = async () => {
    document.getElementById("note").textContent = notes[select.value];
    await load();
  };

  select.addEventListener("change", refresh);
  date.addEventListener("change", refresh);

  const eclipses = await fetch("/api/eclipses?days=900").then((r) => r.json());
  document.getElementById("eclipses").innerHTML = eclipses.eclipses
    .slice(0, 5)
    .map((e) => `<li>${e.at.slice(0, 10)}, ${e.kind}</li>`)
    .join("");

  await refresh();
}

start();
