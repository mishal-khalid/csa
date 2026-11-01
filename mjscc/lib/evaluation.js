"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { words } from "@/lib/words";

// The evaluation as this phone sees it: who's signed in, what's being evaluated, and this
// instructor's own scores and notes.
//
// A score shows the moment it's tapped and is saved in the background. Unsaved writes wait in a
// queue, kept in the phone's storage too, and are retried until the API takes them, so a dropped
// connection on the parade ground loses nothing; the screen says how many are waiting.

const Evaluation = createContext(null);

const scoreKey = (student, part, item) => `${student}:${part}:${item}`;
const queueKey = (name) => `mjscc-unsaved:${name}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readQueue(name) {
  try {
    return JSON.parse(localStorage.getItem(queueKey(name)) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(name, queue) {
  try {
    localStorage.setItem(queueKey(name), JSON.stringify(queue));
  } catch {
    // private browsing: the queue still lives in memory
  }
}

export function EvaluationProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  // undefined while checking, null when signed out
  const [instructor, setInstructor] = useState(undefined);
  const [content, setContent] = useState(null);
  const [scores, setScores] = useState(() => new Map());
  const [notes, setNotes] = useState(() => new Map());
  const [unsaved, setUnsaved] = useState(0);
  const [offline, setOffline] = useState(false);
  // the results are out, so no more scoring (found out when the API refuses a score)
  const [closed, setClosed] = useState(false);

  const queue = useRef([]);
  const flushing = useRef(false);
  const nameRef = useRef(null);

  const signedOut = useCallback(() => {
    setInstructor(null);
    if (pathname !== "/sign-in") router.replace("/sign-in");
  }, [pathname, router]);
  const signedOutRef = useRef(signedOut);
  useEffect(() => {
    signedOutRef.current = signedOut;
  }, [signedOut]);

  // the API's own copy of this instructor's scores and notes, put back on screen after it refused a
  // write, so nothing shows that wasn't saved
  const resync = useCallback(async () => {
    const mine = await api("/scores").catch(() => null);
    if (mine?.status !== 200) return;
    setScores(new Map(mine.data.scores.map((s) => [scoreKey(s.student, s.part, s.item), s.value])));
    setNotes(new Map(mine.data.notes.map((n) => [n.student, n.text])));
  }, []);

  // Sends the waiting writes, oldest first, until none are left. A write the API refuses outright
  // (out of range, after Finish, or after the results are out) is dropped and the screen put back
  // to what's saved; anything else is tried again, waiting longer each time, up to 15 seconds.
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    let wait = 1000;
    let refused = false;
    while (queue.current.length) {
      const write = queue.current[0];
      let res = null;
      try {
        res = await api(write.path, { body: write.body });
      } catch {
        // no connection
      }
      if (!res || res.status >= 500 || res.status === 429) {
        setOffline(true);
        await sleep(wait);
        wait = Math.min(wait * 2, 15000);
        continue;
      }
      if (res.status === 401) {
        // the sign-in ran out: what's waiting stays in the phone's storage and goes once they're
        // back in under the same name
        signedOutRef.current();
        break;
      }
      setOffline(false);
      wait = 1000;
      if (res.status >= 400) {
        refused = true;
        if (res.data?.code === "results_open") setClosed(true);
      }
      queue.current = queue.current.filter((w) => w !== write);
      writeQueue(nameRef.current, queue.current);
      setUnsaved(queue.current.length);
    }
    flushing.current = false;
    if (refused) resync();
  }, [resync]);

  // whether everything waiting reached the API within a few seconds
  const settled = useCallback(async () => {
    flush();
    const until = Date.now() + 8000;
    while (queue.current.length && Date.now() < until) await sleep(200);
    return queue.current.length === 0;
  }, [flush]);

  // a write to send; a newer write to the same score (or note) replaces one still waiting
  const enqueue = useCallback(
    (write) => {
      queue.current = [...queue.current.filter((w) => w.id !== write.id), write];
      writeQueue(nameRef.current, queue.current);
      setUnsaved(queue.current.length);
      flush();
    },
    [flush],
  );

  // Loads the evaluation for the signed-in instructor. Writes still waiting from before (say, the
  // page was reloaded offline) go on top of what the API has, since they're newer.
  const load = useCallback(
    async (who) => {
      nameRef.current = who.name;
      const [c, mine] = await Promise.all([api("/content"), api("/scores")]);
      if (c.status === 401 || mine.status === 401) return signedOut();
      const nextScores = new Map(mine.data.scores.map((s) => [scoreKey(s.student, s.part, s.item), s.value]));
      const nextNotes = new Map(mine.data.notes.map((n) => [n.student, n.text]));
      queue.current = readQueue(who.name);
      for (const w of queue.current) {
        if (w.path === "/scores") nextScores.set(scoreKey(w.body.student, w.body.part, w.body.item), w.body.value);
        else nextNotes.set(w.body.student, w.body.text);
      }
      setContent(c.data);
      setScores(nextScores);
      setNotes(nextNotes);
      setUnsaved(queue.current.length);
      setInstructor(who);
      flush();
    },
    [flush, signedOut],
  );

  // on opening the app: signed in already?
  useEffect(() => {
    let live = true;
    api("/session")
      .then(({ data }) => {
        if (!live) return;
        if (data?.instructor) load(data.instructor);
        else signedOut();
      })
      .catch(() => live && setOffline(true));
    return () => {
      live = false;
    };
    // only once, when the app opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // back online: send what's waiting straight away
  useEffect(() => {
    const online = () => flush();
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [flush]);

  const value = useMemo(() => {
    const parts = content?.parts;
    const scoreOf = (student, part, item) => scores.get(scoreKey(student, part, item));
    // every item of a part scored for a student
    const partDone = (student, part) =>
      Array.from({ length: parts[part].items }, (_, i) => i + 1).every((item) => scoreOf(student, part, item) !== undefined);

    // why scores can't be changed now, if they can't
    const lockedBecause = instructor?.finished ? words.locked : closed ? words.resultsOut : null;

    return {
      ready: Boolean(instructor && content),
      instructor,
      content,
      unsaved,
      offline,
      locked: Boolean(lockedBecause),
      lockedBecause,
      scoreOf,
      partDone,
      noteOf: (student) => notes.get(student) ?? "",

      setScore(student, part, item, value) {
        if (lockedBecause) return;
        setScores((prev) => new Map(prev).set(scoreKey(student, part, item), value));
        enqueue({ id: `score:${scoreKey(student, part, item)}`, path: "/scores", body: { student, part, item, value } });
      },

      setNote(student, text) {
        if (lockedBecause) return;
        setNotes((prev) => new Map(prev).set(student, text));
        enqueue({ id: `note:${student}`, path: "/notes", body: { student, text } });
      },

      // resolves with null when signed in, or the reason it wasn't
      async signIn(name, code) {
        const res = await api("/session", { body: { name, code } });
        if (res.status !== 200) return res.data?.code ?? "error";
        await load(res.data.instructor);
        router.replace("/");
        return null;
      },

      async signOut() {
        await api("/session", { method: "DELETE", body: {} }).catch(() => {});
        setContent(null);
        signedOut();
      },

      // Finish: first makes sure every score has reached the API. Resolves with null, or with
      // what's still missing ([{ student, part, items }]).
      async finish() {
        if (!(await settled())) return { offline: true };
        const res = await api("/finish", { body: {} });
        if (res.status === 200) {
          setInstructor(res.data.instructor);
          return null;
        }
        return res.data?.code === "incomplete" ? { missing: res.data.missing } : { offline: true };
      },

      async reopen() {
        const res = await api("/reopen", { body: {} });
        if (res.status === 200) setInstructor(res.data.instructor);
        return res.status === 200;
      },
    };
  }, [instructor, content, scores, notes, unsaved, offline, closed, enqueue, settled, load, router, signedOut]);

  return <Evaluation.Provider value={value}>{children}</Evaluation.Provider>;
}

export const useEvaluation = () => useContext(Evaluation);

// The marks (GET /mjscc/results), checked again every 15 seconds while the page is open, so the
// results appear as soon as the last instructor finishes. Returns them and a way to check now.
export function useResults() {
  const [results, setResults] = useState(null);
  const check = useCallback(
    () =>
      api("/results")
        .then(({ status, data }) => status === 200 && setResults(data))
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    check();
    const timer = setInterval(() => document.visibilityState === "visible" && check(), 15000);
    return () => clearInterval(timer);
  }, [check]);
  return [results, check];
}
