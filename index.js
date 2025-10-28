const defaultInputs = {
  tags   : "@galgodon@fedigroups.social #galgenmasto #galgenfedi",
  prefix : `Das R habt Ihr also gewählt.
Das ist ein Treffer.`,
  secret : `Schöne Grüße`,
  letters: "espätör",
  missing: "Nicht vorhanden:",
  suffix : "(6 + 5 Zeichen; ÄÖÜß nicht aufgelöst)",
};

const emptyInputs = {
  tags   : defaultInputs.tags,
  prefix : "",
  secret : "",
  letters: "",
  missing: "",
  suffix : "",
};

const tagsEl    = document.querySelector('#tags');
const prefixEl  = document.querySelector('#prefix');
const secretEl  = document.querySelector('#secret');
const lettersEl = document.querySelector('#letters');
const missingEl = document.querySelector('#missing');
const suffixEl  = document.querySelector('#suffix');
const outEl     = document.querySelector('#out');
const statEl    = document.querySelector('#stat');

const storageKey = "galgodon-helper-inputs";

function initInputs() {
  const storageValue = localStorage.getItem(storageKey);
  // TODO check if the stored value has the expected shape
  const inputs = storageValue ? JSON.parse(storageValue) : defaultInputs;

  tagsEl   .value = inputs.tags;
  prefixEl .value = inputs.prefix;
  secretEl .value = inputs.secret;
  lettersEl.value = inputs.letters;
  missingEl.value = inputs.missing;
  suffixEl .value = inputs.suffix;
}

const upcase = s =>
  // Ensure that ß is not converted to SS.  But do not use uppercase ẞ either,
  // as it still looks bad with some fonts:
  s.replaceAll("ß", "ẞ").toLocaleUpperCase("de").replaceAll("ẞ", "ß");

function update() {
  localStorage.setItem(storageKey, JSON.stringify({
    tags   : tagsEl   .value,
    prefix : prefixEl .value,
    secret : secretEl .value,
    letters: lettersEl.value,
    missing: missingEl.value,
    suffix : suffixEl .value,
  }));
  const secret = upcase(secretEl.value.trim());
  const letters = upcase(lettersEl.value.trim());
  const missingText = missingEl.value.trim();
  const missingLetters =
    letters.split("").flatMap(c => secret.includes(c) ? [] : [c]).join(", ");

  outEl.textContent = [
    tagsEl.value.trim(),
    prefixEl.value.trim(),
    secret.split("").map(c =>
      letters.includes(c) || !/^\p{Letter}$/u.test(c) ? c : "_"
    ).join(" ").replaceAll(/^ /gm, ""),
    missingText && missingLetters && (missingText + " " + missingLetters),
    suffixEl.value.trim(),
  ].filter(part => part).join("\n\n");

  const stats = {};
  for (const c of secret) {
    if (/^\p{Letter}$/u.test(c)) {
      stats[c] = (stats[c] ?? 0) + 1;
    }
  }
  statEl.replaceChildren(
    ...Object.entries(stats)
    .sort()
    .flatMap(([c, n]) => {
      const dt = document.createElement("dt");
      if (letters.includes(c)) {
        dt.className = "seen";
      }
      dt.append(c);
      const dd = document.createElement("dd");
      dd.append(n.toString());
      return [dt, dd];
    })
  );
}

for (const el of [tagsEl, prefixEl, secretEl, lettersEl, missingEl, suffixEl]) {
  el?.addEventListener("input", update);
}

function setup() {
  initInputs();
  update();
}

document.querySelector("#clear").addEventListener("click", () => {
  localStorage.setItem(storageKey, JSON.stringify(emptyInputs));
  setup();
});

document.querySelector("#reset").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  setup();
});

document.querySelector("#copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(outEl.value);
  alert("Text in die Zwischenablage kopiert.");
})

setup();
