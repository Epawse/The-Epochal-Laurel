import { create } from "zustand";

interface UiState {
  activeMoment: "capture" | "fail" | "inheritance" | null;
  examDraft: string;
  setMoment: (m: UiState["activeMoment"]) => void;
  setExamDraft: (t: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeMoment: null,
  examDraft: "",
  setMoment: (m) => set({ activeMoment: m }),
  setExamDraft: (t) => set({ examDraft: t }),
}));
