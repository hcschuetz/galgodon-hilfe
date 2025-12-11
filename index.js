import {QS, EL} from "./dom-utils.js";
import urlRegExpData from "./url-regex.json" with {type: "json"};

const urlRegExp = new RegExp(urlRegExpData.source, urlRegExpData.flags);

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß";
const isLetter = c => /^[A-ZÄÖÜß]$/i.test(c);

const defaultInputs = {
  tags   : "@galgodon@fedigroups.social #galgenmasto #galgenfedi",
  prefix : `Das R habt Ihr also gewählt.
Das ist ein Treffer.`,
  secret : `Schöne Grüße`,
  chosen : "espätör",
  missing: "Nicht enthalten:",
  suffix : "(6 + 5 Zeichen; ÄÖÜß nicht aufgelöst)",
};

const emptyInputs = {
  tags   : defaultInputs.tags,
  prefix : "",
  secret : "",
  chosen : "",
  missing: "",
  suffix : "",
};

const tagsEl      = QS("#tags");
const prefixEl    = QS("#prefix");
const secretEl    = QS("#secret");
const chosenEl    = QS("#chosen");
const missingEl   = QS("#missing");
const suffixEl    = QS("#suffix");
const pollTextEl  = QS("#poll-text");
const outEl       = QS("#out");
const outLengthEl = QS("#out-length");

const storageKey = "galgodon-helper-inputs";

function initInputs() {
  const storageValue = localStorage.getItem(storageKey);
  // TODO check if the stored value has the expected shape
  const inputs = storageValue ? JSON.parse(storageValue) : defaultInputs;

  tagsEl   .value = inputs.tags;
  prefixEl .value = inputs.prefix;
  secretEl .value = inputs.secret;
  chosenEl .value = inputs.chosen;
  missingEl.value = inputs.missing;
  suffixEl .value = inputs.suffix;
}

const upcase = s =>
  // Ensure that ß is not converted to SS.  But do not use uppercase ẞ either,
  // as it still looks bad with some fonts:
  s.replaceAll("ß", "ẞ").toLocaleUpperCase("de").replaceAll("ẞ", "ß");

/** [from, to] index pairs */
let answerSections;

function findAnswerSections(text) {
  const length = text.length;
  const sections = [];

  let i = 0, prev = 0;
  while ((i = text.indexOf("\n", prev)) >= 0) {
    sections.push([prev, i]);
    prev = i+1;
  }
  sections.push([prev, length]);

  // Ignore leading empty lines
  while (sections.length) {
    const [from, to] = sections.at(0);
    if (text.substring(from, to).trimEnd()) break;
    sections.shift();
  }

  // Ignore trailing empty lines
  while (sections.length) {
    const [from, to] = sections.at(-1);
    if (text.substring(from, to).trimEnd()) break;
    sections.pop();
  }

  // Fill if needed
  while (sections.length < 4) {
    sections.push([length, length]);
  }

  // Take the last 4 lines
  return sections.slice(-4);
}

function update() {
  localStorage.setItem(storageKey, JSON.stringify({
    tags   : tagsEl   .value,
    prefix : prefixEl .value,
    secret : secretEl .value,
    chosen : chosenEl .value,
    missing: missingEl.value,
    suffix : suffixEl .value,
  }));
  const secret = upcase(secretEl.value.trimEnd());
  const chosen = upcase(chosenEl.value.trim());
  const missingText = missingEl.value.trimEnd();
  const missingChosen = chosen.split("").flatMap(c =>
    isLetter(c) && secret.includes(c) ? [] : [c]
  ).join(", ");

  answerSections = findAnswerSections(pollTextEl.value);

  outEl.textContent = [
    tagsEl.value.trimEnd(),
    prefixEl.value.trimEnd(),

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
    suffixEl.value.trimEnd(),
    pollTextEl.value.slice(0, answerSections[0][0]).trimEnd(),
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

QS("#clear").addEventListener("click", () => {
  localStorage.setItem(storageKey, JSON.stringify(emptyInputs));
  setup();
});

QS("#reset").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  setup();
});

QS("#copy").addEventListener("click", async () => {
  await navigator.clipboard.writeText(outEl.value);
  alert("Text in die Zwischenablage kopiert.");
});

const pollHeadEls =
  alphabet.split("").map(letter => EL("div.poll-head", {}, letter));

const statEls = Array.from(alphabet, letter => EL("div.stat"));
const pollEl = QS("#poll");
pollEl.append(...pollHeadEls, ...statEls);

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

const rows = [];
const outputGridEl = QS("#output-grid");
for (let i = 0; i < 4; i++) {
  // Hack for answer letters.
  //
  // The CSS code for crossing out a letter using an ::after pseudo-element did
  // not work on an input element.  So I am now hiding the <input> element and
  // display the letter in a wrapper element, for which the cross-out CSS works.
  //
  // Another (possibly simpler) solution might be to display the <input> element
  // and to overlay a real DOM element containg the "✗" instead of ::after.
  //
  // I have also tried a single <button> element reacting to "keypress" events.
  // This was simple and did not need a nested <input> because the button itself
  // was focussable.  This worked well with physical keyboards, but focussing
  // a button did not open the on-screen keyboard of mobile devices.
  const letterEl = EL("output");

  const letterInputEl = EL("input", {
    // Intercepting the "keypress" event and using its "key" member would be
    // simpler.  But due to a bug in Firefox on Android the ä, ö, and ü keys
    // do not trigger a "keypress" event.  (Strangely, the problem does not
    // arise with ß.)  So we use the "input" event, clearing the input
    // element's value every time.
    "@input": event => {
      event.stopImmediatePropagation();
      event.preventDefault();
      const {value} = letterInputEl;
      letterInputEl.value = "";
      if (!isLetter(value)) {
        alert(`"${value}" ist kein deutscher Buchstabe.`);
        return;
      }
      const C = upcase(value);
      if (chosenEl.value.includes(value)) {
        alert(`"${C}" wurde bereits gewählt.`);
        return;
      }
      letterEl.value = C;
      updatePoll();
    },
    "@keydown": event => {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.stopImmediatePropagation();
        event.preventDefault();
        letterEl.value = "";
        updatePoll();
      }
    },
  });

  const letterWrapperEl = EL("div.letter-input", {
    "@click": () => letterInputEl.focus(),
  }, letterInputEl, letterEl);

  const rowStatusEl = EL("div.row-status");

  const alphabetEls = Array.from(alphabet, letter =>
    EL("div.letter-button", {
      "@click": event => {
        event.stopImmediatePropagation();
        event.preventDefault();
        if (event.currentTarget.classList.contains("disabled")) {
          return;
        }
        letterEl.value = letter;
        updatePoll();
      }
    }, letter)
  );
  pollEl.append(...alphabetEls);

  const answerOutEl = EL("div.answer-out");

  const copyEl = EL("button.copy-button", {
    "@click": async () => {
      const outText = answerOutEl.textContent;
      await navigator.clipboard.writeText(outText);
      alert(`Option ${i+1} in die Zwischenablage kopiert:\n\n"${outText}"`);
    },
  }, `Option ${i+1} kopieren`);

  const editEl = EL("button.edit-button", {
    "title": "Antwort bearbeiten",
    "@click": () => {
      const [from, to] = answerSections[i];
      pollTextEl.setSelectionRange(from, to);
      pollTextEl.focus();
      pollTextEl.previousElementSibling.scrollIntoView(true);
    }
  }, "✏️");

  outputGridEl.append(
    EL("div.answer-out-label", {}, copyEl, rowStatusEl),
    EL("div.answer-out-value", {}, letterWrapperEl, answerOutEl, editEl),
  );

  rows.push({letterEl, alphabetEls, rowStatusEl, answerOutEl, copyEl});
}

function updatePoll() {
  const secret = upcase(secretEl.value.trimEnd());
  const chosen = upcase(chosenEl.value.trim());
  pollHeadEls.forEach(el => {
    const letter = el.textContent;
    el.classList.toggle("chosen", chosen.includes(letter));
    el.classList.toggle("hit", secret.includes(letter));
  });
  statEls.forEach((el, i) =>
    el.textContent = countChars(alphabet[i], secret) || ""
  );

  QS("#poll-problems").value =
    rows.map(({letterEl}) => letterEl.value).every(choice =>
      isLetter(choice) && !chosen.includes(choice) && !secret.includes(choice)
    )
    ? "Nur Nieten zur Auswahl angeboten"
    : "";

  rows.forEach((row, i) => {
    const {
      letterEl, alphabetEls, rowStatusEl, answerOutEl, copyEl,
    } = row;
    const letter = upcase(letterEl.value);
    const [from, to] = answerSections[i];
    const answer = pollTextEl.value.substring(from, to).trimEnd();
    const answerUP = upcase(answer);

    const chosenLetter = chosen.includes(letter);
    const notInWord = !answerUP.includes(letter);
    const repeated =
      rows.some(({letterEl}, j) => i !== j && letterEl.value === letter);
    const cl = letterEl.parentElement.classList;
    cl.toggle("chosen", letter && chosen.includes(letter));
    cl.toggle("hit", letter && secret.includes(letter));


    // Instead of showing only the "most severe" problem, we might show
    // several of them.
    const problem =
      !letter && !answer ? "Buchstabe und Antwort fehlen" :
      !letter            ? "Kein Buchstabe zugeordnet" :
      chosenLetter       ? `"${letter}" bereits gewählt` :
      repeated           ? `"${letter}" mehrfach verwendet` :
      !answer            ? "Antwort fehlt" :
      notInWord          ? `"${letter}" nicht in der Antwort` :
      // 48 = 50 (max. length of Mastodon poll alternatives) - 2 (parentheses)
      answer.length > 48 ? `${answer.length + 2} Zeichen` :
                           "";

    rowStatusEl.textContent = problem;
    answerOutEl.replaceChildren(
      "\u200b", // zero-width space to preserve height upon empty answer
      ...answer.split("").map((c, j) => {
        const C = upcase(c);
        const passive =
          !isLetter(C) || chosen.includes(C) || answerUP.indexOf(C) < j;
        return passive ? c : EL(
          `span.${secret.includes(C) ? "hit" : "miss"}`,
          {
            "@click": () => {
              letterEl.value = C;
              updatePoll();
            }
          },
          C === letter ? `(${c})` : c
        );
      })
    );
    copyEl.disabled = Boolean(problem);

    alphabetEls.forEach(button => {
      const buttonLetter = button.textContent;
      button.classList.toggle("disabled",
        chosen.includes(buttonLetter) || !answerUP.includes(buttonLetter)
      );
      button.classList.toggle("selected", buttonLetter === letter);
      button.classList.toggle("chosen", chosen.includes(buttonLetter));
      button.classList.toggle("hit", secret.includes(buttonLetter));
    });
  });
}

QS("#clear-poll").addEventListener("click", () => {
  pollTextEl.value = "";
  rows.forEach(({letterEl}) => letterEl.value = "");
  update();
});

const pollExamples = [`
Wie lautet dein Name?

Sir Lancelot von Camelot.
Sir Robin von Camelot.
Sir Galahad von Camelot.
Artus, König der Briten.
`, `
Welches ist dein Auftrag?

Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
Die Suche nach dem heiligen Gral.
`, `
Welches ist deine Lieblingsfarbe?

blau
blau, nein, gelb
gelb
Egal!  Wie heißt die Hauptstadt von Assyrien?
`, `
Wie heißt die Hauptstadt von Assyrien?

Assur
Taidu
Waššukanni
Ninive
`, `
Welches ist die Höchstgeschwindigkeit einer unbeladenen Schwalbe?

Rauchschwalbe: 20 m/s
Mehlschwalbe: 74 km/h
Simson Schwalbe: 60 km/h
Eine europäische oder eine afrikanische?
`];

QS("#poll-examples").append(
  ...pollExamples.map((poll, i) =>
    EL("button", {
      "@click": () => {
        rows.forEach(({letterEl}, j) => letterEl.value = "");
        pollTextEl.value = poll.trim();
        update();
      },
    }, `Beispiel ${i+1}`)
  ),
);

setup();
