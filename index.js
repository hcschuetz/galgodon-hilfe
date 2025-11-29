import urlRegExpData from "./url-regex.json" with {type: "json"};

const urlRegExp = new RegExp(urlRegExpData.source, urlRegExpData.flags);

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß";

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
const pollHeadingEl
                = document.querySelector('#poll-heading');
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
      letters.includes(c) || !/^\p{Letter}$/u.test(c) ? c :
      "⌴"
    ).join(""),

    missingText && missingLetters && (missingText + " " + missingLetters),
    suffixEl.value.trim(),
    pollHeadingEl.value.trim(),
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
  tagsEl, prefixEl, secretEl, lettersEl, missingEl, suffixEl, pollHeadingEl,
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
  document.createElement("div"), // fill the corner
);
const stats = Array.from(alphabet, letter =>
  Object.assign(document.createElement("div"), {
    className: "stat",
  }),
);
pollEl.append(
  document.createElement("div"), // fill the corner
  ...stats,
  document.createElement("div"), // fill the corner
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

const pollGrid = document.querySelector("#poll-grid");
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

  const wordEl = document.createElement("input");
  wordEl.addEventListener("input", updatePoll);

  const rowStatusEl = document.createElement("div");
  rowStatusEl.className = "row-status";

  pollGrid.append(
    Object.assign(document.createElement("div"), {
      textContent: `Antwort ${i+1}:`,
    }),
    wordEl,
  );

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
  pollEl.append(letterEl, ...alphabetEls, rowStatusEl);

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

  outputGrid.append(copyEl, answerOutEl);

  rows.push({
    letterEl, wordEl, alphabetEls, rowStatusEl, answerOutEl, copyEl,
  });
}

function updatePoll() {
  const letters = upcase(lettersEl.value.trim());
  const secret = upcase(secretEl.value.trim());
  pollHeads.forEach(el => {
    const letter = el.textContent;
    el.dataset.status =
      letters.includes(letter) ? "seen" :
      secret.includes(letter)  ? "hit" :
                                 "fail";
  });
  stats.forEach((el, i) =>
    el.textContent = countChars(alphabet[i], secret) || ""
  );

  pollProblemsEl.value =
    rows.map(({letterEl}) => letterEl.value).every(choice =>
      /^[A-ZÄÖÜß]$/i.test(choice) &&
      !letters.includes(choice) &&
      !secret.includes(choice)
    )
    ? "Kein Treffer angeboten."
    : "";

  rows.forEach((row, i) => {
    const {
      letterEl, wordEl, alphabetEls, rowStatusEl, answerOutEl, copyEl,
    } = row;
    const letter = upcase(letterEl.value);
    const word = wordEl.value.trim();
    const wordUP = upcase(word);

    const notALetter = !/^[A-ZÄÖÜß]$/i.test(letter);
    const seenLetter = letters.includes(letter);
    const notInWord = !wordUP.includes(letter);
    const repeated =
      rows.slice(0, i).some(({letterEl}) => letterEl.value === letter);
    letterEl.style.backgroundColor =
      !letter                 ? "#0000" :
      notALetter || seenLetter? "#f008" :
      secret.includes(letter) ? "#0f08" :
                                "#ff08";

    // Instead of showing only the "most severe" problem, we might show
    // several of them.
    const problem =
      !letter ? "Buchstabe fehlt" :
      notALetter ? `"${letter}" ist kein Buchstabe` :
      seenLetter ? `"${letter}" schon gewählt` :
      repeated ? `"${letter}" mehrfach verwendet` :
      !word ? "Antwort fehlt" :
      notInWord ? `"${letter}" nicht im Wort` :
      // 48 = 50 (max. length of Mastodon poll alternatives) - 2 (parentheses)
      word.length > 48 ? `${word.length} Zeichen` :
      "";

    rowStatusEl.textContent = problem;
    answerOutEl.textContent =
      problem ? `[${problem}]` :
      word.replace(RegExp(letter, "i"), match =>`(${match})`);
    answerOutEl.classList.toggle("problem", problem);
    copyEl.disabled = Boolean(problem);

    alphabetEls.forEach(button => {
      const buttonLetter = button.textContent
      button.disabled =
        letters.includes(buttonLetter) || !wordUP.includes(buttonLetter);
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
  pollHeadingEl.value = "";
  update();
  rows.forEach(({letterEl, wordEl}) => letterEl.value = wordEl.value = "");
  updatePoll();
});

document.querySelector("#insert-poll").addEventListener("click", async () => {
  const text = await navigator.clipboard.readText();
  const lines = text.trim().split("\n").map(line => line.trim());
  if (lines.length < 5) {
    alert(`Weniger als 5 Zeilen!`);
    return;
  }
  pollHeadingEl.value = lines.slice(0, -4).join("\n").trim();
  update();
  rows.forEach(({wordEl}, i) => {
    wordEl.value = lines[lines.length - 4 + i].trim();
  });
  updatePoll();
});

document.querySelector("#copy-poll").addEventListener("click", async () => {
  await navigator.clipboard.writeText([
    pollHeadingEl.value.trim(),
    "",
    ...rows.map(({wordEl}) => wordEl.value),
    "",
  ].join("\n"));
  alert("Umfrage in Zwischenablage kopiert.");
});

const pollExamples = `
Wie lautet dein Name?
L Sir Lancelot von Camelot.
R Sir Robin von Camelot.
G Sir Galahad von Camelot.
A Artus, König der Briten.
---
Welches ist dein Auftrag?
D Die Suche nach dem heiligen Gral.
S Die Suche nach dem heiligen Gral.
H Die Suche nach dem heiligen Gral.
G Die Suche nach dem heiligen Gral.
---
Welches ist deine Lieblingsfarbe?
B blau
N blau, nein, gelb
G gelb
ß Egal!  Wie heißt die Hauptstadt von Assyrien?
---
Wie heißt die Hauptstadt von Assyrien?
A Assur
T Taidu
W Waššukanni
N Ninive
---
Welches ist die Höchstgeschwindigkeit einer unbeladenen Schwalbe?
R Rauchschwalbe: 20 m/s
M Mehlschwalbe: 74 km/h
S Simson Schwalbe: 60 km/h
O Eine europäische oder eine afrikanische?
`.split("---").map(poll => {
  const [question, ...choices] = poll.trim().split("\n");
  return {
    question,
    answers: choices.flatMap(line => [line[0], line.substring(1).trim()]),
  };
});
document.querySelector("#poll-examples").append(
  ...pollExamples.map(({question, answers}, i) => {
    const button = document.createElement("button");
    button.textContent = `Beispiel #${i+1}`;
    button.addEventListener("click", () => {
      pollHeadingEl.value = question;
      update();
      rows.forEach(({letterEl, wordEl}, j) => {
        letterEl.value = answers[2*j];
        wordEl  .value = answers[2*j+1];
      });
      updatePoll();
    });
    return button;
  })
);

function shuffleArray(arrayIn) {
  const arrayOut = Array.from(arrayIn);
  for (let i = arrayOut.length; i > 1; i--) {
    const j = Math.floor(i * Math.random());
    [arrayOut[i-1], arrayOut[j]] = [arrayOut[j], arrayOut[i-1]];
  }
  return arrayOut;
}

document.querySelector("#poll-randomize").addEventListener("click", () => {
  shuffleArray(rows)
  .map(({letterEl, wordEl}) => [letterEl.value, wordEl.value])
  .forEach((values, i) => {
    const {letterEl, wordEl} = rows[i];
    [letterEl.value, wordEl.value] = values;
  });
  updatePoll();
});

setup();
