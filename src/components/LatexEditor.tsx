"use client";

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  StreamLanguage,
  bracketMatching,
  foldGutter,
  foldKeymap,
  syntaxHighlighting,
} from "@codemirror/language";
import { stex } from "@codemirror/legacy-modes/mode/stex";
import { searchKeymap } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const latexHighlightStyle = HighlightStyle.define([
  { tag: tags.comment, color: "#6aab73", fontStyle: "italic" },
  { tag: tags.tagName, color: "#5b9fd4" },
  { tag: tags.keyword, color: "#5b9fd4" },
  { tag: tags.atom, color: "#3db8a7" },
  { tag: tags.bool, color: "#3db8a7" },
  { tag: tags.string, color: "#ce9178" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.bracket, color: "#d4d4d4" },
  { tag: tags.brace, color: "#d4d4d4" },
  { tag: tags.squareBracket, color: "#d4d4d4" },
  { tag: tags.paren, color: "#d4d4d4" },
  { tag: tags.meta, color: "#9cdcfe" },
  { tag: tags.variableName, color: "#e8e8e8" },
  { tag: tags.standard(tags.variableName), color: "#4fc1ff" },
  { tag: tags.definition(tags.variableName), color: "#4fc1ff" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.punctuation, color: "#c8c8c8" },
  { tag: tags.content, color: "#e8e8e8" },
]);

type LatexEditorProps = {
  initialValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function LatexEditor({
  initialValue,
  onChange,
  onSave,
}: LatexEditorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(initialValue);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!parentRef.current) {
      return;
    }

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        foldGutter(),
        bracketMatching(),
        StreamLanguage.define(stex),
        syntaxHighlighting(latexHighlightStyle),
        keymap.of([
          {
            key: "Mod-s",
            preventDefault: true,
            run: () => {
              onSaveRef.current();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...searchKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.theme(
          {
            "&": {
              height: "100%",
              fontSize: "14px",
              backgroundColor: "var(--code-bg)",
              color: "#e8e8e8",
            },
            ".cm-scroller": {
              overflow: "auto",
              fontFamily:
                "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              lineHeight: "1.65",
            },
            ".cm-content": {
              padding: "16px 0",
              caretColor: "#ffffff",
            },
            ".cm-cursor": {
              borderLeftColor: "#ffffff",
            },
            ".cm-gutters": {
              backgroundColor: "var(--code-gutter)",
              color: "#8a8a8a",
              border: "none",
              borderRight: "1px solid #2a2a2a",
            },
            ".cm-activeLineGutter": {
              backgroundColor: "#2a2a2a",
              color: "#c8c8c8",
            },
            ".cm-activeLine": {
              backgroundColor: "#262626",
            },
            ".cm-selectionBackground": {
              backgroundColor: "#3d5a56 !important",
            },
            "&.cm-focused .cm-selectionBackground": {
              backgroundColor: "#3d5a56 !important",
            },
            ".cm-matchingBracket": {
              backgroundColor: "#3a4a48",
              outline: "1px solid #5b9fd4",
            },
          },
          { dark: true },
        ),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: parentRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  return (
    <div
      ref={parentRef}
      role="textbox"
      aria-label="LaTeX source"
      aria-multiline="true"
      className="h-full min-h-0 w-full overflow-hidden bg-code-bg"
    />
  );
}
