// A Gazette document's transcribed text, as a list of blocks. This is the schema the public
// Gazette renders (frontend/components/gazette/GazetteText.js); the portal's review screen edits it
// and the rules check reads it.

// A lettered point of an Article, e.g. "(a) ...", with its own numbered points "(1) ..." under it.
// A clause can be only a list of items, with no text of its own (e.g. a definitions Article).
export interface Clause {
  label?: string;
  text?: string;
  items?: Clause[];
}

// A numbered point of a President's Order ("1. ..."), or a reason under "Whereas:". It can have
// lettered points under it, and text after them.
export interface ListItem {
  label?: string;
  text: string;
  items?: Clause[];
  after?: string;
}

export interface Signature {
  caption?: string;
  name: string;
  title?: string;
}

export type Block =
  // "First Chapter", with its name ("Introduction") as the subtitle
  | { type: 'chapter'; text: string; subtitle?: string }
  | { type: 'heading'; text: string }
  // an Article: its number, its margin title, and its points
  | { type: 'article'; number: string; title?: string; clauses: Clause[] }
  // text; a blank line ("\n\n") separates paragraphs, a single "\n" is a line break
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: ListItem[] }
  // a table printed without a header row has no columns
  | { type: 'table'; caption?: string; columns?: string[]; rows: string[][] }
  | { type: 'signatures'; items: Signature[] };
