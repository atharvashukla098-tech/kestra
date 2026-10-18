import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {defineComponent, ref, nextTick, type Ref} from "vue"
import {mount} from "@vue/test-utils"
import * as monaco from "monaco-editor/editor/editor.api"

import type {ValidationError} from "../utils/validationErrors"
import {MONACO_ERROR_SQUIGGLE_CLASS, useViolationMarkers} from "./useViolationMarkers"

const {mockViolationMarkers} = vi.hoisted(() => ({
    mockViolationMarkers: vi.fn(),
}))

vi.mock("../utils/violationMarkers", () => ({
    violationMarkers: mockViolationMarkers,
}))

interface FakeEditorState {
    text: string
    isDisposed: boolean
}

function createFakeEditor(initialText = "id: flow\nnamespace: dev\n") {
    const state: FakeEditorState = {
        text: initialText,
        isDisposed: false,
    }

    const model = {
        getValue: vi.fn(() => state.text),
        isDisposed: vi.fn(() => state.isDisposed),
    }

    const mockCollection = {
        clear: vi.fn(),
        set: vi.fn(),
        append: vi.fn(),
    }

    const editor = {
        getModel: vi.fn(() => (state.isDisposed ? null : model)),
        createDecorationsCollection: vi.fn(() => mockCollection),
    }

    return {
        editor: editor as unknown as monaco.editor.IStandaloneCodeEditor,
        model: model as unknown as monaco.editor.ITextModel,
        mockCollection,
        state,
    }
}

function mountWithComposable(editorRef: Ref<monaco.editor.IStandaloneCodeEditor | undefined>, errorsRef: Ref<ValidationError[] | undefined>) {
    const Comp = defineComponent({
        setup() {
            useViolationMarkers({editor: editorRef, errors: errorsRef})
            return () => null
        },
    })
    return mount(Comp)
}

describe("useViolationMarkers", () => {
    let setModelMarkersSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        setModelMarkersSpy = vi.spyOn(monaco.editor, "setModelMarkers").mockImplementation(() => {})
        mockViolationMarkers.mockReset()
    })

    afterEach(() => {
        setModelMarkersSpy.mockRestore()
    })

    it("produces one marker per violation at Error severity, with the first line as marker and remaining lines as decorations", () => {
        const {editor, model} = createFakeEditor()
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(editor)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "Bad task"}])

        mockViolationMarkers.mockReturnValue([
            {
                message: "Bad task",
                lines: [
                    {startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 10},
                    {startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 20},
                    {startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 15},
                ],
            },
        ])

        const wrapper = mountWithComposable(editorRef, errorsRef)

        // 1. One marker per violation, at Error severity, on the first line
        expect(setModelMarkersSpy).toHaveBeenCalledWith(model, "backend-validation", [
            {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 10,
                message: "Bad task",
                severity: monaco.MarkerSeverity.Error,
            },
        ])

        // 2. The remaining lines become decorations
        expect(editor.createDecorationsCollection).toHaveBeenCalledWith([
            {
                range: {startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 20},
                options: {className: MONACO_ERROR_SQUIGGLE_CLASS, hoverMessage: {value: "Bad task"}},
            },
            {
                range: {startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 15},
                options: {className: MONACO_ERROR_SQUIGGLE_CLASS, hoverMessage: {value: "Bad task"}},
            },
        ])

        wrapper.unmount()
    })

    it("clears previous markers and decorations before applying new ones when errors change", async () => {
        const {editor, model, mockCollection} = createFakeEditor()
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(editor)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "First error"}])

        mockViolationMarkers.mockReturnValueOnce([
            {
                message: "First error",
                lines: [{startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5}],
            },
        ])

        const wrapper = mountWithComposable(editorRef, errorsRef)

        expect(setModelMarkersSpy).toHaveBeenLastCalledWith(model, "backend-validation", [
            expect.objectContaining({message: "First error"}),
        ])

        // Change errors
        mockViolationMarkers.mockReturnValueOnce([
            {
                message: "Second error",
                lines: [{startLineNumber: 2, startColumn: 1, endLineNumber: 2, endColumn: 8}],
            },
        ])

        errorsRef.value = [{path: "tasks[1]", message: "Second error"}]
        await nextTick()

        // Verify clear was called before re-applying
        expect(mockCollection.clear).toHaveBeenCalled()
        expect(setModelMarkersSpy).toHaveBeenCalledWith(model, "backend-validation", [])
        expect(setModelMarkersSpy).toHaveBeenLastCalledWith(model, "backend-validation", [
            expect.objectContaining({message: "Second error"}),
        ])

        wrapper.unmount()
    })

    it("removes every marker and decoration when errors are cleared", async () => {
        const {editor, model, mockCollection} = createFakeEditor()
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(editor)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "Error"}])

        mockViolationMarkers.mockReturnValue([
            {
                message: "Error",
                lines: [{startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5}],
            },
        ])

        const wrapper = mountWithComposable(editorRef, errorsRef)

        mockViolationMarkers.mockReturnValue([])
        errorsRef.value = []
        await nextTick()

        expect(mockCollection.clear).toHaveBeenCalled()
        expect(setModelMarkersSpy).toHaveBeenLastCalledWith(model, "backend-validation", [])

        wrapper.unmount()
    })

    it("does not write to a disposed model when clearing", () => {
        const {editor, model} = createFakeEditor()
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(editor)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "Error"}])

        mockViolationMarkers.mockReturnValue([
            {
                message: "Error",
                lines: [{startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5}],
            },
        ])

        const wrapper = mountWithComposable(editorRef, errorsRef)
        setModelMarkersSpy.mockClear()

        // Mark the model as disposed before unmount
        vi.mocked(model.isDisposed).mockReturnValue(true)

        wrapper.unmount()

        // Since the model is disposed, setModelMarkers should not be called to avoid throwing
        expect(setModelMarkersSpy).not.toHaveBeenCalled()
    })

    it("clears everything when unmounting", () => {
        const {editor, model, mockCollection} = createFakeEditor()
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(editor)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "Error"}])

        mockViolationMarkers.mockReturnValue([
            {
                message: "Error",
                lines: [{startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5}],
            },
        ])

        const wrapper = mountWithComposable(editorRef, errorsRef)

        wrapper.unmount()

        expect(mockCollection.clear).toHaveBeenCalled()
        expect(setModelMarkersSpy).toHaveBeenLastCalledWith(model, "backend-validation", [])
    })

    it("is a no-op rather than a throw when editor or model is missing", () => {
        const editorRef = ref<monaco.editor.IStandaloneCodeEditor | undefined>(undefined)
        const errorsRef = ref<ValidationError[] | undefined>([{path: "tasks[0]", message: "Error"}])

        expect(() => {
            const wrapper = mountWithComposable(editorRef, errorsRef)
            wrapper.unmount()
        }).not.toThrow()

        expect(setModelMarkersSpy).not.toHaveBeenCalled()

        // Editor with null model
        const editorWithoutModel = {
            getModel: () => null,
            createDecorationsCollection: vi.fn(),
        } as unknown as monaco.editor.IStandaloneCodeEditor

        editorRef.value = editorWithoutModel
        expect(() => {
            const wrapper = mountWithComposable(editorRef, errorsRef)
            wrapper.unmount()
        }).not.toThrow()

        expect(setModelMarkersSpy).not.toHaveBeenCalled()
    })
})
