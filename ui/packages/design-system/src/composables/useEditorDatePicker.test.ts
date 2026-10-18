import {beforeEach, describe, expect, test, vi} from "vitest"
import {ref} from "vue"

vi.mock("monaco-editor/editor/editor.api", () => ({
    editor: {
        ContentWidgetPositionPreference: {
            EXACT: 0,
            ABOVE: 1,
            BELOW: 2,
        },
    },
}))

import {
    DATE_PICKER_SUGGESTION_LABEL,
    useEditorDatePicker,
    type DatePickerInstance,
    type EditorDatePickerContext,
} from "./useEditorDatePicker"
import type * as monaco from "monaco-editor/editor/editor.api"

interface FakeEditorState {
    editor: monaco.editor.ICodeEditor
    model: {
        getWordAtPosition: ReturnType<typeof vi.fn>
        pushEditOperations: ReturnType<typeof vi.fn>
    }
    editOperations: Array<{
        range: {
            startLineNumber: number
            startColumn: number
            endLineNumber: number
            endColumn: number
        }
        text: string
        forceMoveMarkers: boolean
    }>
    contentWidgets: monaco.editor.IContentWidget[]
    focus: ReturnType<typeof vi.fn>
    trigger: ReturnType<typeof vi.fn>
}

function createFakeEditor(initialPosition: {lineNumber: number, column: number} | null = {lineNumber: 2, column: 5}): FakeEditorState {
    const editOperations: FakeEditorState["editOperations"] = []
    const contentWidgets: monaco.editor.IContentWidget[] = []
    let currentPosition = initialPosition

    const model = {
        getWordAtPosition: vi.fn().mockReturnValue({startColumn: 1, endColumn: 5, word: "date"}),
        pushEditOperations: vi.fn((_selections: unknown, ops: FakeEditorState["editOperations"]) => {
            editOperations.push(...ops)
        }),
    }

    const focus = vi.fn()
    const trigger = vi.fn()

    const editor = {
        getModel: () => model,
        getPosition: () => currentPosition,
        getSelections: () => [{startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 5}],
        focus,
        trigger,
        addContentWidget: vi.fn(async (widget: monaco.editor.IContentWidget) => {
            contentWidgets.push(widget)
        }),
        removeContentWidget: vi.fn((widget: monaco.editor.IContentWidget) => {
            const index = contentWidgets.indexOf(widget)
            if (index !== -1) contentWidgets.splice(index, 1)
        }),
        setPosition: (pos: typeof initialPosition) => {
            currentPosition = pos
        },
    } as unknown as monaco.editor.ICodeEditor

    return {editor, model, editOperations, contentWidgets, focus, trigger}
}

describe("useEditorDatePicker", () => {
    let mockPicker: DatePickerInstance
    let wrapperEl: HTMLDivElement
    let inputEl: HTMLInputElement
    let ctx: EditorDatePickerContext

    beforeEach(() => {
        vi.useFakeTimers()
        inputEl = document.createElement("input")
        inputEl.value = "2026-05-15T12:00:00.000Z"

        const nextSibling = document.createElement("div")
        nextSibling.appendChild(inputEl)

        wrapperEl = document.createElement("div")

        mockPicker = {
            $el: {
                nextElementSibling: nextSibling,
            },
            handleOpen: vi.fn(),
            focus: vi.fn(),
        }

        ctx = {
            wrapper: ref(wrapperEl),
            picker: ref(mockPicker),
            suggestionsOnFocus: ref(true),
        }
    })

    test("DATE_PICKER_SUGGESTION_LABEL is exported and non-empty", () => {
        expect(DATE_PICKER_SUGGESTION_LABEL).toBe("_DATE_PICKER_")
        expect(typeof DATE_PICKER_SUGGESTION_LABEL).toBe("string")
        expect(DATE_PICKER_SUGGESTION_LABEL.length).toBeGreaterThan(0)
    })

    test("the composable returns its documented surface", () => {
        const datePicker = useEditorDatePicker(ctx)

        expect(datePicker).toHaveProperty("startOfToday")
        expect(datePicker).toHaveProperty("selectedDate")
        expect(datePicker).toHaveProperty("shown")
        expect(datePicker).toHaveProperty("show")
        expect(datePicker).toHaveProperty("remove")
        expect(datePicker).toHaveProperty("insertSelectedDate")
    })

    test("the suggestion is offered in the position the editor reports", async () => {
        const {editor} = createFakeEditor({lineNumber: 3, column: 12})
        const datePicker = useEditorDatePicker(ctx)

        expect(datePicker.shown.value).toBe(false)

        await datePicker.show(editor)

        expect(datePicker.shown.value).toBe(true)
        expect(editor.addContentWidget).toHaveBeenCalledTimes(1)

        const widget = (editor.addContentWidget as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as monaco.editor.IContentWidget
        expect(widget.getId()).toBe("kestra_date_picker")
        expect(widget.getDomNode()).toBe(wrapperEl)
        expect(widget.allowEditorOverflow).toBe(true)

        const widgetPosition = widget.getPosition()
        expect(widgetPosition?.position).toEqual({lineNumber: 3, column: 12})
        expect(widgetPosition?.preference).toEqual([2, 1]) // BELOW, ABOVE

        expect(mockPicker.handleOpen).toHaveBeenCalledTimes(1)
        vi.runAllTimers()
        expect(mockPicker.focus).toHaveBeenCalledTimes(1)
    })

    test("choosing a date inserts the expected text at the cursor", () => {
        const {editor, model, editOperations, focus, trigger} = createFakeEditor({lineNumber: 2, column: 8})
        const datePicker = useEditorDatePicker(ctx)

        datePicker.insertSelectedDate(editor)

        expect(focus).toHaveBeenCalledTimes(1)
        expect(model.pushEditOperations).toHaveBeenCalledTimes(1)
        expect(editOperations).toHaveLength(1)
        expect(editOperations[0].range).toEqual({
            startLineNumber: 2,
            startColumn: 8,
            endLineNumber: 2,
            endColumn: 5,
        })
        expect(editOperations[0].text).toContain("2026-05-15")
        expect(editOperations[0].text.endsWith(" ")).toBe(true)
        expect(editOperations[0].forceMoveMarkers).toBe(true)

        expect(trigger).toHaveBeenCalledWith("datePickerCallback", "editor.action.triggerSuggest", {})
    })

    test("remove cleans up the content widget", async () => {
        const {editor} = createFakeEditor()
        const datePicker = useEditorDatePicker(ctx)

        await datePicker.show(editor)
        expect(datePicker.shown.value).toBe(true)

        datePicker.remove(editor)
        expect(datePicker.shown.value).toBe(false)
        expect(editor.removeContentWidget).toHaveBeenCalledTimes(1)
    })

    test("calling show multiple times is idempotent", async () => {
        const {editor} = createFakeEditor()
        const datePicker = useEditorDatePicker(ctx)

        await datePicker.show(editor)
        await datePicker.show(editor)

        expect(editor.addContentWidget).toHaveBeenCalledTimes(1)
    })

    test("calling remove when not shown is a no-op", () => {
        const {editor} = createFakeEditor()
        const datePicker = useEditorDatePicker(ctx)

        datePicker.remove(editor)

        expect(editor.removeContentWidget).not.toHaveBeenCalled()
    })

    test("handles position reporting when editor returns null position", async () => {
        const {editor} = createFakeEditor(null)
        const datePicker = useEditorDatePicker(ctx)

        await datePicker.show(editor)

        const widget = (editor.addContentWidget as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as monaco.editor.IContentWidget
        expect(widget.getPosition()?.position).toBeNull()
    })
})
