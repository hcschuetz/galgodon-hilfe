import urlRegExpData from "./url-regex.json" with {type: "json"};

const urlRegExp = new RegExp(urlRegExpData.source, urlRegExpData.flags);

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß";

const defaultInputs = {
  tags   : "@galgodon@fedigroups.social #galgenmasto #galgenfedi",
  prefix : `Das R habt Ihr also gewählt.
Das ist ein Treffer.`,
  secret : `Schöne Grüße`,
  chosen: "espätör",
  missing: "Nicht vorhanden:",
  suffix : "(6 + 5 Zeichen; ÄÖÜß nicht aufgelöst)",
};

const emptyInputs = {
  tags   : defaultInputs.tags,
  prefix : "",
  secret : "",
  chosen: "",
  missing: "",
  suffix : "",
};

const tagsEl    = document.querySelector('#tags');
const prefixEl  = document.querySelector('#prefix');
const secretEl  = document.querySelector('#secret');
const chosenEl = document.querySelector('#chosen');
const missingEl = document.querySelector('#missing');
const suffixEl  = document.querySelector('#suffix');
const pollTextEl
                = document.querySelector('#poll-text');
const outEl     = document.querySelector('#out');
const outLengthEl
                = document.querySelector('#out-length');

const storageKey = "galgodon-helper-inputs";

function initInputs() {
  const storageValue = localStorage.getItem(storageKey);
  // TODO check if the stored value has the expected shape
  const inputs = storageValue ? JSON.parse(storageValue) : defaultInputs;

  tagsEl   .value = inputs.tags;
  prefixEl .value = inputs.prefix;
  secretEl .value = inputs.secret;
  chosenEl.value = inputs.chosen;
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
    chosen: chosenEl.value,
    missing: missingEl.value,
    suffix : suffixEl .value,
  }));
  const secret = upcase(secretEl.value.trim());
  const chosen = upcase(chosenEl.value.trim());
  const missingText = missingEl.value.trim();
  const missingChosen =
    chosen.split("").flatMap(c => secret.includes(c) ? [] : [c]).join(", ");

  outEl.textContent = [
    tagsEl.value.trim(),
    prefixEl.value.trim(),

/*
Choices for representing unknown letters:
- "_" (underscore): Needs blanks between the letters of a word so that
  individual underscores can be recognized.  As a consequence, we have to
  represent spaces between words by something wider.
- "␣" (open box): The usual glyph representing a blank visually.
  But it is quite narrow in some fonts.
- "⌴" (counterbore): This glyph is meant for something different, but can be
  misused to represent an unknown letter.  It typically has the needed width.
- "?" or the like: Readable in any font.  But unknown and known letters are not
  as quickly distinguishable as with the previous choices.
- "·" (interpunct): Too narrow, needs some space around.  Not quickly
  distinguishable from "-".
- "~" (tilde): Not quickly distinguishable from "-".  May also be hard to count.

While using wider inter-word spacing is absolutely necessary in the underscore
case above, it may still make sense in the other cases to make word spacing
easier to detect.

Choices for wide spaces:
- Multiple spaces: This has the problem that some fedi UIs lack the CSS
  property "white-space: pre-wrap" and thus apply the default behavior of
  collapsing multiple whitespaces.  See, for example,
  https://codeberg.org/superseriousbusiness/gotosocial/issues/4533.
- Multiple spaces separated by zero-width spaces (\u200b):  This prevents
  collapsing of multiple spaces.
- "em space" (\u2003): Probably the best and cleanest solution.

Mastodon seems to transport both \u2003 and \u200b without "sanitizing them
away".
[TODO: What about other fedi software?]

IIRC, using (multiple) no-break spaces (\u00a0) did not help.
[TODO: Check again.]

[TODO: Check behavior of the various spaces with respect to automatic line
breaking.]
*/
    secret.split("").map(c =>
      c === " " ? "\u2003" :
      chosen.includes(c) || !/^\p{Letter}$/u.test(c) ? c :
      "⌴"
    ).join(""),

    missingText && missingChosen && (missingText + " " + missingChosen),
    suffixEl.value.trim(),
    pollTextEl.value.trim().split("\n").slice(0, -4).join("\n").trim(),
  ].filter(part => part).join("\n\n");
  outLengthEl.textContent =
    outEl.textContent
    .replaceAll(
      // This regexp is quite ad-hoc:
      /(?<![a-z0-9_])(@[a-z_][a-z0-9_]*)@[a-z0-9][a-z0-9\-\.]*\b/gi,
      (_, prefix) => prefix
    )
    .replaceAll(urlRegExp, "[a 23-character string]")
    .length.toString();

  updatePoll();
}

for (const el of [
  tagsEl, prefixEl, secretEl, chosenEl, missingEl, suffixEl, pollTextEl,
]) {
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
});

const pollProblemsEl = document.querySelector("#poll-problems");
const rows = [];
const pollEl = document.querySelector("#poll");
const pollHeads = alphabet.split("").map(letter =>
  Object.assign(document.createElement("div"), {
    textContent: letter,
    className: "poll-head",
  })
);
pollEl.append(
  document.createElement("div"), // fill the corner
  ...pollHeads,
);
const stats = Array.from(alphabet, letter =>
  Object.assign(document.createElement("div"), {
    className: "stat",
  }),
);
pollEl.append(
  document.createElement("div"), // fill the corner
  ...stats,
);

function countChars(c, string) {
  let count = 0;
  let len = string.length;
  for (let i = 0; i < len; i++) {
    if (string[i] === c) {
      count++;
    }
  }
  return count;
}

const outputGrid = document.querySelector("#output-grid");
for (let i = 0; i < 4; i++) {
  const letterEl = document.createElement("input");
  letterEl.maxLength = 1;
  letterEl.addEventListener("keypress", event => {
    const {key} = event;
    if (/^[A-ZÄÖÜß]$/i.test(key)) {
      letterEl.value = upcase(event.key);
    }
    event.stopImmediatePropagation();
    event.preventDefault();
    updatePoll();
  });
  letterEl.classList.add("letter-input");
  letterEl.addEventListener("input", updatePoll);

  const rowStatusEl = document.createElement("div");
  rowStatusEl.className = "row-status";

  const alphabetEls = Array.from(alphabet, letter => {
    const el = document.createElement("button");
    el.classList = "letter-button";
    el.textContent = letter;
    el.addEventListener("click", () => {
      letterEl.value = letter;
      updatePoll();
    })
    return el;
  });
  pollEl.append(letterEl, ...alphabetEls);

  const answerOutEl = document.createElement("div");
  answerOutEl.className = "answer-out";

  const copyEl = document.createElement("button");
  copyEl.className = "copy-button";
  copyEl.textContent = `Antwort ${i+1} kopieren`;
  copyEl.addEventListener("click", async () => {
    const outText = answerOutEl.textContent;
    await navigator.clipboard.writeText(outText);
    alert(`Antwort ${i+1} in die Zwischenablage kopiert:\n\n"${outText}"`);
  });

  {
    const wrapper = document.createElement("div");
    wrapper.append(copyEl, rowStatusEl)
    outputGrid.append(wrapper, answerOutEl);
  }

  rows.push({
    letterEl, alphabetEls, rowStatusEl, answerOutEl, copyEl,
  });
}

function updatePoll() {
  const chosen = upcase(chosenEl.value.trim());
  const secret = upcase(secretEl.value.trim());
  pollHeads.forEach(el => {
    const letter = el.textContent;
    el.dataset.status =
      chosen.includes(letter) ? "seen" :
      secret.includes(letter)  ? "hit" :
                                 "fail";
  });
  stats.forEach((el, i) =>
    el.textContent = countChars(alphabet[i], secret) || ""
  );

  const answers = pollTextEl.value.trim().split("\n").slice(-4);

  pollProblemsEl.value =
    rows.map(({letterEl}) => letterEl.value).every(choice =>
      /^[A-ZÄÖÜß]$/i.test(choice) &&
      !chosen.includes(choice) &&
      !secret.includes(choice)
    )
    ? "Nur Nieten zur Auswahl angeboten"
    : "";

  rows.forEach((row, i) => {
    const {
      letterEl, alphabetEls, rowStatusEl, answerOutEl, copyEl,
    } = row;
    const letter = upcase(letterEl.value);
    const answer = answers[i] ?? "";
    const answerUP = upcase(answer);

    const notALetter = !/^[A-ZÄÖÜß]$/i.test(letter);
    const seenLetter = chosen.includes(letter);
    const notInWord = !answerUP.includes(letter);
    const repeated =
      rows.some(({letterEl}, j) => i !== j && letterEl.value === letter);
    letterEl.style.backgroundColor =
      !letter                 ? "#0000" :
      notALetter || seenLetter? "#f008" :
      secret.includes(letter) ? "#0f08" :
                                "#ff08";

    // Instead of showing only the "most severe" problem, we might show
    // several of them.
    const problem =
      !letter && !answer ? "Antwort&Buchstabe fehlen" :
      !letter ? "Buchstabe fehlt" :
      notALetter ? `"${letter}" ist kein Buchstabe` :
      seenLetter ? `"${letter}" schon gewählt` :
      repeated ? `"${letter}" mehrfach verwendet` :
      !answer ? "Antwort fehlt" :
      notInWord ? `"${letter}" nicht in der Antwort` :
      // 48 = 50 (max. length of Mastodon poll alternatives) - 2 (parentheses)
      answer.length > 48 ? `${answer.length} Zeichen` :
      "";

    rowStatusEl.textContent = problem;
    answerOutEl.replaceChildren(
      "\u200b", // zero-width space to preserve height upon empty answer
      ...answer.split("").map((c, j) => {
        const C = upcase(c);
        const isFirstOccurrence = answerUP.indexOf(C) === j;
        const el = document.createElement("span");
        el.textContent = C === letter && isFirstOccurrence ? `(${c})` : c;
        if (
          /^[A-ZÄÖÜß]$/.test(C)
          && !chosen.includes(C)
          && isFirstOccurrence
        ) {
          el.classList.toggle(
            secret.includes(C) ? "hit" : "fail",
            true
          );
          el.classList.toggle("clickable", true);
          el.addEventListener("click", () => {
            letterEl.value = C;
            updatePoll();
          })
        }
        return el;
      })
    );
    copyEl.disabled = Boolean(problem);

    alphabetEls.forEach(button => {
      const buttonLetter = button.textContent
      button.disabled =
        chosen.includes(buttonLetter) || !answerUP.includes(buttonLetter);
      const {dataset} = button;
      dataset.status = secret.includes(buttonLetter) ? "hit" : "fail";
      const selected = buttonLetter === letter;
      if (selected) {
        dataset.selected = "";
      } else {
        delete dataset.selected;
      }
    });
  });
}

document.querySelector("#clear-poll").addEventListener("click", () => {
  pollTextEl.value = "";
  rows.forEach(({letterEl}) => letterEl.value = "");
  update();
});

const pollExamples = `
Wie lautet dein Name?

Sir Lancelot von Camelot.
Sir Robin von Camelot.
Sir Galahad von Camelot.
Artus, König der Briten.
LRGA
---
Welches ist dein Auftrag?

Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
DSHG
---
Welches ist deine Lieblingsfarbe?

blau
blau, nein, gelb
gelb
Egal!  Wie heißt die Hauptstadt von Assyrien?
BNGß
---
Wie heißt die Hauptstadt von Assyrien?

Assur
Taidu
Waššukanni
Ninive
ATWN
---
Welches ist die Höchstgeschwindigkeit einer unbeladenen Schwalbe?

Rauchschwalbe: 20 m/s
Mehlschwalbe: 74 km/h
Simson Schwalbe: 60 km/h
Eine europäische oder eine afrikanische?
RMSO
`.split("---");
document.querySelector("#poll-examples").append(
  ...pollExamples.map((poll, i) => {
    poll = poll.trim();
    const cut = poll.length - 4;
    const letters = poll.substring(cut);
    const pollText = poll.substring(0, cut).trim();
    const button = document.createElement("button");
    button.textContent = `Beispiel ${i+1}`;
    button.addEventListener("click", () => {
      rows.forEach(({letterEl}, j) => letterEl.value = letters[j]);
      pollTextEl.value = pollText;
      update();
    });
    return button;
  })
);

setup();

// Can't we do this in CSS?
document.querySelectorAll("details > summary").forEach(summaryEl => {
  const detailsEl = summaryEl.parentElement;
  detailsEl.addEventListener("toggle", setTitle);
  setTitle();

  function setTitle() {
    summaryEl.title =
      detailsEl.open ? "Schließen" : "Informationen anzeigen";
  }
});
