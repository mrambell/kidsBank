// Translations. To add a language: copy en.js, translate the values,
// then add it to TEXT and LANGS below and to the file list in sw.js.

import { state } from "../state.js";
import en from "./en.js";
import it from "./it.js";
import pl from "./pl.js";
import de from "./de.js";

const TEXT = { en, it, pl, de };

/** Language codes and the names shown in the language menu. */
export const LANGS = { en: "English", it: "Italiano", pl: "Polski", de: "Deutsch" };

export const hasLang = code => Object.prototype.hasOwnProperty.call(TEXT, code);

/** The text for `key` in the bank's language, with {placeholders} filled from `vars`. */
export function tr(key, vars) {
  let text = (TEXT[state.bank.lang] || en)[key];
  if (text == null) text = en[key] != null ? en[key] : key;
  if (vars) for (const name in vars) text = text.split("{" + name + "}").join(vars[name]);
  return text;
}

/** Short month name, 0 = January. */
export const monthName = i => tr("mon").split(",")[i];
