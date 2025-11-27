import urlRegExpData from "./url-regex.json" with {type: "json"};

const urlRegExp = new RegExp(urlRegExpData.source, urlRegExpData.flags);

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

const pollEl = document.querySelector("#poll");
const pollProblemsEl = document.querySelector("#poll-problems");
const choiceUpdates = [];
const letterEls = [];
const wordEls = [];
function updatePoll() {
  choiceUpdates.forEach(update => update());
}
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
    updateChoice();
  });
  letterEl.classList.add("letter-input");
  letterEl.addEventListener("input", updateChoice);

  const wordEl = document.createElement("input");
  wordEl.addEventListener("input", updateChoice);

  const outEl = document.createElement("output");
  outEl.classList.add("poll-out");

  let outText = "";
  const copyEl = document.createElement("button");
  copyEl.addEventListener("click", async () => {
    await navigator.clipboard.writeText(outText);
    alert("Wahlmöglichkeit in die Zwischenablage kopiert.");
  });

  pollEl.append(letterEl, wordEl, outEl, copyEl);

  function updateChoice() {
    const letters = upcase(lettersEl.value.trim());
    const secret = upcase(secretEl.value.trim());
    const letter = upcase(letterEl.value);
    const word = wordEl.value.trim();
    const notALetter = !/^[A-ZÄÖÜß]$/i.test(letter);
    const seenLetter = letters.includes(letter);
    const notInWord = !upcase(word).includes(letter);
    letterEl.style.backgroundColor =
      !letter                 ? "#0000" :
      notALetter || seenLetter? "#f008" :
      secret.includes(letter) ? "#0f08" :
                                "#ff08";
    outText =
      notALetter ? word :
      word.replace(RegExp(letter, "i"), match =>`(${match})`);
    const seen = [];
    outEl.replaceChildren(
      // The zero-width space ensures that outEl keeps its height even if
      // outText is empty.
      ...(outText || "\u200b").split("").map((c, i) => {
        const span = document.createElement("span");
        span.textContent = c;

        const l = upcase(c);
        if (/^[A-ZÄÖÜß]/i.test(c) && !seen.includes(l)) {
          const known = letters.includes(l);
          span.style.backgroundColor =
            known              ? "#f008" :
            secret.includes(l) ? "#0f08" :
                                 "#ff08" ;
          if (!known) {
            span.addEventListener("click", () => {
              letterEl.value = l;
              updateChoice();
            });
            span.classList.add("clickable");
          }
        }
        seen.push(l);
        return span;
      })
    );

    copyEl.disabled = !letter || notALetter || seenLetter || notInWord;
    copyEl.textContent =
      !letter ? "(Buchstabe fehlt)" :
      notALetter ? `("${letter}" ist kein Buchstabe)` :
      seenLetter ? `("${letter}" schon gewählt)` :
      !word ? "(Wort fehlt)" :
      notInWord ? `("${letter}" nicht im Wort)` :
      "Kopieren";

    updatePollProblems();
  }

  letterEls.push(letterEl);
  wordEls.push(wordEl);
  choiceUpdates.push(updateChoice);
}

function updatePollProblems() {
  const problems = [];
  const choices = letterEls.map(el => el.value);
  choices.forEach((choice, i) => {
    if (choice && choices.findIndex(c => c == choice) < i) {
      problems.push(`"${choice}" wiederholt angeboten.`);
    }
  });
  const secret = upcase(secretEl.value.trim());
  const letters = upcase(lettersEl.value.trim());
  if (choices.every(choice =>
    /^[A-ZÄÖÜß]$/i.test(choice) &&
    !letters.includes(choice) &&
    !secret.includes(choice)
  )) {
    problems.push("Kein Treffer angeboten.")
  }
  const maxLength = Math.max(...wordEls.map(el => el.value.length));
  // 48 = 50 (max. length of Mastodon poll alternatives) - 2 (parentheses)
  if (maxLength > 48) {
    problems.push(`Auswahl-Text mit ${maxLength} Zeichen.`);
  }
  pollProblemsEl.value = problems.join(" ");
}

document.querySelector("#clear-poll").addEventListener("click", () => {
  pollHeadingEl.value = "";
  update();
  document.querySelectorAll("#poll > input").forEach(el => {
    el.value = "";
  });
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
  document.querySelectorAll("#poll > input").forEach((el, i) => {
    if (i % 2) {
      el.value = lines[lines.length - 4 + (i-1)/2].trim();
    }
  });
  updatePoll();
})
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
      document.querySelectorAll("#poll > input").forEach((el, i) => {
        el.value = answers.flat()[i];
      });
      updatePoll();
    });
    return button;
  })
);

function shuffleArray(array) {
  for (let i = array.length; i > 1; i--) {
    const j = Math.floor(i * Math.random());
    [array[i-1], array[j]] = [array[j], array[i-1]];
  }
  return array;
}

document.querySelector("#poll-randomize").addEventListener("click", () => {
  const inputs = Array.from(document.querySelectorAll("#poll > input"));
  let [l1, w1, l2, w2, l3, w3, l4, w4] = inputs.map(input => input.value);
  [[l1, w1], [l2, w2], [l3, w3], [l4, w4]] =
    shuffleArray([[l1, w1], [l2, w2], [l3, w3], [l4, w4]]);
  [l1, w1, l2, w2, l3, w3, l4, w4].forEach((val, i) => inputs[i].value = val);
  updatePoll();
});

setup();
