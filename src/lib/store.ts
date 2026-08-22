import { useSyncExternalStore } from "react";
import type { AppData, Automation, FieldValue, HistoryEntry, Stage } from "./types";
import { seedData, DEFAULT_OPTIONS, DEFAULT_USERS } from "./seed";
import { FIELDS } from "./fields";

const STORAGE_KEY = "rpa-portfolio-data-v1";

let state: AppData = seedData();
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      if (parsed?.automations) {
        parsed.settings.options = { ...DEFAULT_OPTIONS, ...parsed.settings.options, users: parsed.settings.users ?? DEFAULT_USERS };
        state = parsed;
      }
    } else {
      persist();
    }
  } catch {
    /* ignore corrupt data */
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => state;

export function useAppData(): AppData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useAutomation(id: string): Automation | undefined {
  return useAppData().automations.find((a) => a.id === id);
}

function setState(next: AppData) {
  state = next;
  persist();
  emit();
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 10)}`;

function histEntry(user: string, action: string, extra: Partial<HistoryEntry> = {}): HistoryEntry {
  return { id: uid("h"), timestamp: new Date().toISOString(), user, action, ...extra };
}

function touch(record: Automation, user: string, entries: HistoryEntry[]): Automation {
  return {
    ...record,
    modifiedBy: user,
    modifiedDate: new Date().toISOString(),
    history: [...record.history, ...entries],
  };
}

function update(id: string, fn: (r: Automation) => Automation) {
  setState({ ...state, automations: state.automations.map((a) => (a.id === id ? fn(a) : a)) });
}

export const actions = {
  setCurrentUser(name: string) {
    setState({ ...state, settings: { ...state.settings, currentUser: name } });
  },
  setDataFolderPath(path: string) {
    setState({ ...state, settings: { ...state.settings, dataFolderPath: path } });
  },
  setOptionList(key: string, values: string[]) {
    const settings = { ...state.settings, options: { ...state.settings.options, [key]: values } };
    if (key === "users") settings.users = values;
    setState({ ...state, settings });
  },
  createRecord(stage: Stage, user: string): Automation {
    const now = new Date().toISOString();
    const record: Automation = {
      id: uid("aut"),
      stage,
      category: stage === "idea" ? "Discovery" : stage === "production" ? "Deployed" : "Pipeline",
      data: {
        submittedBy: user,
        submissionDate: now.slice(0, 10),
        opportunityName: "Untitled opportunity",
        opportunityStatus: stage === "idea" ? "Ideation" : "Business Case Approved",
        ...(stage === "idea" ? {} : { projectStatus: "Requirements" }),
        year: `FY${new Date().getFullYear()}`,
      },
      scoring: { businessValue: 3, complexity: 3, risk: 3, strategicPriority: 3 },
      createdBy: user,
      createdDate: now,
      modifiedBy: user,
      modifiedDate: now,
      history: [histEntry(user, "Record created")],
      documents: [],
      comments: [],
      updates: [],
    };
    setState({ ...state, automations: [record, ...state.automations] });
    return record;
  },
  setField(id: string, key: string, value: FieldValue, user: string) {
    update(id, (r) => {
      const old = r.data[key];
      if (String(old ?? "") === String(value ?? "")) return r;
      const label = FIELDS.find((f) => f.key === key)?.label ?? key;
      const next = touch({ ...r, data: { ...r.data, [key]: value } }, user, [
        histEntry(user, `Updated ${label}`, { field: label, oldValue: String(old ?? "—"), newValue: String(value ?? "—") }),
      ]);
      if (key === "projectStatus" && value === "Production") {
        next.stage = "production";
        next.category = "Deployed";
        next.history.push(histEntry(user, "Moved to Production"));
      } else if (key === "projectStatus" && r.stage === "production") {
        next.stage = "project";
        next.category = "Pipeline";
      }
      return next;
    });
  },
  setScoring(id: string, key: keyof Automation["scoring"], value: number, user: string) {
    update(id, (r) =>
      touch({ ...r, scoring: { ...r.scoring, [key]: value } }, user, [
        histEntry(user, `Updated score: ${key}`, { field: key, oldValue: String(r.scoring[key]), newValue: String(value) }),
      ]),
    );
  },
  moveToProject(id: string, user: string) {
    update(id, (r) =>
      touch(
        {
          ...r,
          stage: "project",
          category: "Pipeline",
          data: { ...r.data, projectStatus: (r.data['projectStatus'] as string) || "Requirements" },
        },
        user,
        [histEntry(user, "Moved to Project Tracking", { field: "stage", oldValue: "idea", newValue: "project" })],
      ),
    );
  },
  setStage(id: string, stage: Stage, user: string) {
    update(id, (r) =>
      touch({ ...r, stage, category: stage === "idea" ? "Discovery" : stage === "production" ? "Deployed" : "Pipeline" }, user, [
        histEntry(user, `Stage changed to ${stage}`, { field: "stage", oldValue: r.stage, newValue: stage }),
      ]),
    );
  },
  addComment(id: string, text: string, user: string) {
    update(id, (r) =>
      touch({ ...r, comments: [...r.comments, { id: uid("c"), timestamp: new Date().toISOString(), user, text }] }, user, [
        histEntry(user, "Added a comment"),
      ]),
    );
  },
  addUpdate(id: string, payload: { text: string; percentComplete: number; rag: "Red" | "Amber" | "Green" }, user: string) {
    update(id, (r) =>
      touch(
        {
          ...r,
          data: { ...r.data, latestComment: payload.text },
          updates: [...r.updates, { id: uid("u"), date: new Date().toISOString().slice(0, 10), submittedBy: user, ...payload }],
        },
        user,
        [histEntry(user, `Weekly update submitted (${payload.rag}, ${payload.percentComplete}%)`)],
      ),
    );
  },
  addDocument(id: string, doc: Omit<Automation["documents"][number], "id" | "uploadedBy" | "uploadedDate">, user: string) {
    update(id, (r) =>
      touch(
        { ...r, documents: [...r.documents, { ...doc, id: uid("d"), uploadedBy: user, uploadedDate: new Date().toISOString() }] },
        user,
        [histEntry(user, `Linked document: ${doc.name}`)],
      ),
    );
  },
  removeDocument(id: string, docId: string, user: string) {
    update(id, (r) => touch({ ...r, documents: r.documents.filter((d) => d.id !== docId) }, user, [histEntry(user, "Removed a document link")]));
  },
  deleteRecord(id: string) {
    setState({ ...state, automations: state.automations.filter((a) => a.id !== id) });
  },
  exportJson() {
    return JSON.stringify(state, null, 2);
  },
  importJson(raw: string) {
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed?.automations) throw new Error("Invalid data file");
    setState(parsed);
  },
  resetToSeed() {
    setState(seedData());
  },
};
