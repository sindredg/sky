"use strict";

const MESSAGES = {
  unreachable: "Could not reach the service. Check your connection, then try again.",
  refused: "The service could not answer that request.",
};

function showProblem(text) {
  const box = document.getElementById("problem");
  box.textContent = text;
  box.hidden = false;
}

function clearProblem() {
  const box = document.getElementById("problem");
  box.hidden = true;
  box.textContent = "";
}

function setBusy(busy) {
  document.querySelector("main").setAttribute("aria-busy", String(busy));
}

async function getJSON(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error(MESSAGES.unreachable);
  }
  if (!response.ok) throw new Error(MESSAGES.refused);
  return response.json();
}

// localStorage throws outright where a browser blocks site data.
function readTheme() {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

function writeTheme(value) {
  try {
    localStorage.setItem("theme", value);
  } catch {
    // The toggle still works for this visit, it just will not be remembered.
  }
}

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

// Each label sits on its own hour. Equal columns would centre it half a column late.
function paintTicks() {
  const narrow = window.matchMedia("(max-width: 34rem)").matches;
  const hours = narrow ? [0, 6, 12, 18, 24] : [0, 3, 6, 9, 12, 15, 18, 21, 24];
  const ticks = document.getElementById("ticks");
  ticks.innerHTML = hours
    .map((hour) => {
      const at = ((hour / 24) * 100).toFixed(4);
      return `<span style="left:${at}%">${String(hour).padStart(2, "0")}</span>`;
    })
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
  const date = document.getElementById("date");
  const on = date.value;
  const query = `place=${encodeURIComponent(place)}&on=${on}`;

  const [light, moon] = await Promise.all([
    getJSON(`/api/light?${query}`),
    getJSON(`/api/moon?${query}`),
  ]);

  if (!on) date.value = light.date;

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
  applyTheme(readTheme());
  document.getElementById("theme").addEventListener("click", () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    writeTheme(next);
    applyTheme(next);
  });
}

async function start() {
  startTheme();
  paintTicks();
  matchMedia("(max-width: 34rem)").addEventListener("change", paintTicks);

  const places = await getJSON("/api/places");
  const select = document.getElementById("place");
  select.innerHTML = places.places
    .map((p) => `<option value="${p.slug}">${p.name}, ${p.country}</option>`)
    .join("");

  const notes = Object.fromEntries(places.places.map((p) => [p.slug, p.note]));
  const date = document.getElementById("date");

  const refresh = async () => {
    document.getElementById("note").textContent = notes[select.value];
    setBusy(true);
    try {
      await load();
      clearProblem();
    } catch (problem) {
      showProblem(problem.message);
    } finally {
      setBusy(false);
    }
  };

  select.addEventListener("change", refresh);
  date.addEventListener("change", refresh);

  const eclipses = await getJSON("/api/eclipses?days=900");
  document.getElementById("eclipses").innerHTML = eclipses.eclipses
    .slice(0, 5)
    .map((e) => `<li>${e.at.slice(0, 10)}, ${e.kind}</li>`)
    .join("");

  await refresh();
}

start().catch((problem) => {
  setBusy(false);
  showProblem(problem.message);
});
