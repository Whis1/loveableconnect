import React from "react";

/**
 * 🔗 Utility per rendering di testo con URL auto-linkati.
 * Trasforma "Guarda https://example.com/file.pdf" in:
 *   "Guarda <a href=...>https://example.com/file.pdf</a>"
 *
 * Usato nelle chat di supporto (utente + admin) per rendere cliccabili
 * i link condivisi (es. drive, dropbox, immagini caricate altrove).
 */
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const parts = text.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (/^https?:\/\//.test(part)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
