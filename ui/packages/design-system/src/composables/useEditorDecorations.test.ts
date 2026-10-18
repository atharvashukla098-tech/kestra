import {describe, test, expect, vi} from "vitest"
import {effectScope, nextTick, ref} from "vue"
import type * as monaco from "monaco-editor/editor/editor.api"
import {useEditorDecorations} from "./useEditorDecorations"

interface FakeEditorOptions {
    text?: string
    lines?: string[]
}

function createFakeEditor(options: FakeEditorOptions = {}) {
    const text = options.text ?? options.lines?.join("\n") ?? ""
    const lineList = options.lines ?? text.split("\n")
    const decorations: monaco.editor.IModelDeltaDecoration[] = []

    const collection = {
        clear: vi.fn(() => {
            decorations.length = 0
        }),
        append: vi.fn((deltaDecorations: monaco.editor.IModelDeltaDecoration[]) => {
            decorations.push(...deltaDecorations)
            return []
        }),
    }

    const model = {
        getValue: vi.fn(() => text),
        getLinesContent: vi.fn(() => lineList),
        getLineMaxColumn: vi.fn((line: number) => (lineList[line - 1]?.length ?? 0) + 1),
        getPositionAt: vi.fn((offset: number) => {
            let line = 1
            let col = 1
            for (let i = 0; i < offset; i++) {
                if (text[i] === "\n") {
                    line++
                    col = 1
                } else {
                    col++
                }
            }
            return {lineNumber: line, column: col}
        }),
    }

    const editor = {
        getModel: vi.fn(() => model),
        createDecorationsCollection: vi.fn(() => collection),
        focus: vi.fn(),
        setSelection: vi.fn(),
        revealLineInCenter: vi.fn(),
    }

    return {
        editor: editor as unknown as monaco.editor.IStandaloneCodeEditor,
        model,
        collection,
        decorations,
        setText(nextText: string) {
            model.getValue.mockReturnValue(nextText)
        },
    }
}

describe("useEditorDecorations", () => {
    test("applying decorations creates a collection with one entry per range", () => {
        const text = "first: {{ task.id }}\nsecond: {{ other.var }}"
        const {editor, collection, decorations} = createFakeEditor({text})

        const pebbleEnabled = ref(true)
        const highlightLine = ref<number | undefined>(undefined)
        const initialHighlight = ref<string | undefined>(undefined)

        const dec = useEditorDecorations({
            pebbleEnabled,
            highlightLine,
            initialHighlight,
            codeEditor: () => editor,
            modifiedEditor: () => editor,
        })

        dec.attach(editor)
        expect(editor.createDecorationsCollection).toHaveBeenCalledTimes(1)

        dec.highlightPebble()

        expect(collection.append).toHaveBeenCalledTimes(1)
        expect(decorations).toHaveLength(2)
        expect(decorations[0].options.inlineClassName).toBe("highlight-pebble")
        expect(decorations[1].options.inlineClassName).toBe("highlight-pebble")

        dec.highlightLinesRange({start: 2, end: 4})
        expect(decorations).toHaveLength(3)
        expect(decorations[0].options.className).toBe("highlight-lines")
    })

    test("applying again replaces the previous set rather than adding to it", () => {
        const text = "message: {{ var1 }} and {{ var2 }}"
        const fake = createFakeEditor({text})
        const pebbleEnabled = ref(true)

        const dec = useEditorDecorations({
            pebbleEnabled,
            highlightLine: ref(undefined),
            initialHighlight: ref(undefined),
            codeEditor: () => fake.editor,
            modifiedEditor: () => fake.editor,
        })

        dec.attach(fake.editor)
        dec.highlightPebble()
        expect(fake.decorations).toHaveLength(2)

        fake.setText("message: {{ single }}")
        dec.highlightPebble()

        expect(fake.decorations).toHaveLength(1)
        expect(fake.collection.clear).toHaveBeenCalledTimes(2)

        dec.highlightLinesRange({start: 1, end: 2})
        expect(fake.decorations).toHaveLength(2)

        dec.highlightLinesRange({start: 5, end: 6})
        expect(fake.decorations).toHaveLength(2)
        expect(fake.decorations[0].range.startLineNumber).toBe(5)
    })

    test("clearing removes everything", () => {
        const text = "line: {{ item }}"
        const fake = createFakeEditor({text})
        const pebbleEnabled = ref(true)

        const dec = useEditorDecorations({
            pebbleEnabled,
            highlightLine: ref(undefined),
            initialHighlight: ref(undefined),
            codeEditor: () => fake.editor,
            modifiedEditor: () => fake.editor,
        })

        dec.attach(fake.editor)
        dec.highlightPebble()
        dec.highlightLinesRange({start: 1, end: 3})
        expect(fake.decorations).toHaveLength(2)

        dec.clearLinesRangeHighlights()
        expect(fake.decorations).toHaveLength(1)

        pebbleEnabled.value = false
        dec.highlightPebble()
        expect(fake.decorations).toHaveLength(0)
    })

    test("an empty range list clears rather than creating an empty collection", () => {
        const text = "plain text without any expressions"
        const fake = createFakeEditor({text})
        const pebbleEnabled = ref(true)

        const dec = useEditorDecorations({
            pebbleEnabled,
            highlightLine: ref(undefined),
            initialHighlight: ref(undefined),
            codeEditor: () => fake.editor,
            modifiedEditor: () => fake.editor,
        })

        dec.attach(fake.editor)
        expect(fake.editor.createDecorationsCollection).toHaveBeenCalledTimes(1)

        dec.highlightPebble()

        expect(fake.collection.clear).toHaveBeenCalledTimes(1)
        expect(fake.collection.append).not.toHaveBeenCalled()
        expect(fake.editor.createDecorationsCollection).toHaveBeenCalledTimes(1)
        expect(fake.decorations).toHaveLength(0)
    })

    test("disposal clears the collection", () => {
        const text = "val: {{ flow.id }}"
        const fake = createFakeEditor({text})
        const pebbleEnabled = ref(true)

        const scope = effectScope()
        let dec!: ReturnType<typeof useEditorDecorations>

        scope.run(() => {
            dec = useEditorDecorations({
                pebbleEnabled,
                highlightLine: ref(undefined),
                initialHighlight: ref(undefined),
                codeEditor: () => fake.editor,
                modifiedEditor: () => fake.editor,
            })
        })

        dec.attach(fake.editor)
        dec.highlightPebble()
        expect(fake.decorations).toHaveLength(1)

        scope.stop()
        expect(fake.collection.clear).toHaveBeenCalled()
        expect(fake.decorations).toHaveLength(0)
    })

    test("no editor or no model is a no-op", async () => {
        const highlightLine = ref<number | undefined>(undefined)
        const initialHighlight = ref<string | undefined>("target")

        const decWithoutEditor = useEditorDecorations({
            pebbleEnabled: ref(true),
            highlightLine,
            initialHighlight,
            codeEditor: () => undefined,
            modifiedEditor: () => undefined,
        })

        expect(() => decWithoutEditor.highlightPebble()).not.toThrow()
        expect(() => decWithoutEditor.highlightInitial()).not.toThrow()

        highlightLine.value = 4
        await nextTick()

        const editorWithoutModel = {
            getModel: () => null,
            focus: vi.fn(),
            setSelection: vi.fn(),
            revealLineInCenter: vi.fn(),
            createDecorationsCollection: vi.fn(),
        } as unknown as monaco.editor.IStandaloneCodeEditor

        const decWithoutModel = useEditorDecorations({
            pebbleEnabled: ref(true),
            highlightLine,
            initialHighlight,
            codeEditor: () => editorWithoutModel,
            modifiedEditor: () => editorWithoutModel,
        })

        expect(() => decWithoutModel.highlightPebble()).not.toThrow()
        expect(() => decWithoutModel.highlightInitial()).not.toThrow()

        highlightLine.value = 10
        await nextTick()
        expect(editorWithoutModel.focus).not.toHaveBeenCalled()
    })

    test("selectLine and highlightInitial navigate when editor and model are present", async () => {
        const lines = ["first line", "needle found here", "third line"]
        const fake = createFakeEditor({lines})
        const highlightLine = ref<number | undefined>(undefined)
        const initialHighlight = ref<string | undefined>("needle")

        useEditorDecorations({
            pebbleEnabled: ref(false),
            highlightLine,
            initialHighlight,
            codeEditor: () => fake.editor,
            modifiedEditor: () => fake.editor,
        }).highlightInitial()

        expect(fake.editor.focus).toHaveBeenCalled()
        expect(fake.editor.setSelection).toHaveBeenCalled()
        expect(fake.editor.revealLineInCenter).toHaveBeenCalledWith(2)

        highlightLine.value = 3
        await nextTick()
        expect(fake.editor.setSelection).toHaveBeenCalledTimes(2)
    })
})
