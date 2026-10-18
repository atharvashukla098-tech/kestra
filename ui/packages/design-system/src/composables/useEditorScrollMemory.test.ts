import {describe, it, expect, beforeEach, vi} from "vitest"
import {ref} from "vue"
import {useEditorScrollMemory} from "./useEditorScrollMemory"
import type * as monaco from "monaco-editor/editor/editor.api"

describe("useEditorScrollMemory", () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    const createEditorStub = () => {
        const listeners: Array<() => void> = []
        let viewState: monaco.editor.ICodeEditorViewState | null = null
        let scrollTop = 0

        const editor = {
            restoreViewState: vi.fn((vs: monaco.editor.ICodeEditorViewState) => {
                viewState = vs
            }),
            saveViewState: vi.fn(() => viewState ?? ({cursorState: []} as unknown as monaco.editor.ICodeEditorViewState)),
            getScrollTop: vi.fn(() => scrollTop),
            setScrollTop: vi.fn((top: number) => {
                scrollTop = top
            }),
            getPosition: vi.fn(() => ({lineNumber: 5, column: 1} as monaco.Position)),
            revealLineInCenterIfOutsideViewport: vi.fn(),
            onDidScrollChange: vi.fn((callback: () => void) => {
                listeners.push(callback)
            }),
            _triggerScrollChange: () => {
                listeners.forEach(cb => cb())
            },
        }

        return editor
    }

    it("round-trips a value under the editorScroll:<key>:<name> shape", () => {
        const scrollKey = ref<string | undefined>("tab-123")
        const {save, load} = useEditorScrollMemory(scrollKey)

        save({offset: 150}, "cursorOffset")
        expect(localStorage.getItem("editorScroll:tab-123:cursorOffset")).toBe(JSON.stringify({offset: 150}))
        expect(load<{offset: number}>("cursorOffset")).toEqual({offset: 150})
    })

    it("returns the supplied fallback when nothing is stored", () => {
        const scrollKey = ref<string | undefined>("tab-123")
        const {load} = useEditorScrollMemory(scrollKey)

        expect(load("nonExistent", "defaultFallback")).toBe("defaultFallback")
        expect(load("nonExistent")).toBeUndefined()
    })

    it("returns the fallback instead of throwing when stored value is invalid JSON", () => {
        const scrollKey = ref<string | undefined>("tab-123")
        localStorage.setItem("editorScroll:tab-123:broken", "{invalid-json")
        const {load} = useEditorScrollMemory(scrollKey)

        expect(() => load("broken", 42)).not.toThrow()
        expect(load("broken", 42)).toBe(42)
    })

    it("with an undefined scroll key, save writes nothing and load returns the fallback", () => {
        const scrollKey = ref<string | undefined>(undefined)
        const {save, load} = useEditorScrollMemory(scrollKey)

        save({test: true}, "anyKey")
        expect(localStorage.length).toBe(0)
        expect(load("anyKey", "fallbackValue")).toBe("fallbackValue")
    })

    it("restores a saved view state and scroll offset onto the editor", () => {
        const scrollKey = ref<string | undefined>("tab-456")
        const mockViewState = {viewState: {scrollLeft: 0, firstPosition: {lineNumber: 1, column: 1}}}
        localStorage.setItem("editorScroll:tab-456:viewState", JSON.stringify(mockViewState))
        localStorage.setItem("editorScroll:tab-456:scrollTop", JSON.stringify(250))

        const {restoreAndTrack} = useEditorScrollMemory(scrollKey)
        const editor = createEditorStub()

        restoreAndTrack(editor as unknown as monaco.editor.IStandaloneCodeEditor)

        expect(editor.restoreViewState).toHaveBeenCalledWith(mockViewState)
        expect(editor.revealLineInCenterIfOutsideViewport).toHaveBeenCalledWith(5)
        expect(editor.setScrollTop).toHaveBeenCalledWith(250)
    })

    it("registers a scroll listener that persists the new position", () => {
        const scrollKey = ref<string | undefined>("tab-789")
        const {restoreAndTrack} = useEditorScrollMemory(scrollKey)
        const editor = createEditorStub()

        restoreAndTrack(editor as unknown as monaco.editor.IStandaloneCodeEditor)
        expect(editor.onDidScrollChange).toHaveBeenCalledTimes(1)

        editor.getScrollTop.mockReturnValue(320)
        const newViewState = {viewState: {scrollLeft: 10}}
        editor.saveViewState.mockReturnValue(newViewState as unknown as monaco.editor.ICodeEditorViewState)

        editor._triggerScrollChange()

        expect(localStorage.getItem("editorScroll:tab-789:scrollTop")).toBe("320")
        expect(localStorage.getItem("editorScroll:tab-789:viewState")).toBe(JSON.stringify(newViewState))
    })

    it("saveViewState writes the editor's view state, and does nothing without a scroll key", () => {
        const scrollKey = ref<string | undefined>("tab-abc")
        const {saveViewState} = useEditorScrollMemory(scrollKey)
        const editor = createEditorStub()
        const customViewState = {viewState: {scrollLeft: 20}}
        editor.saveViewState.mockReturnValue(customViewState as unknown as monaco.editor.ICodeEditorViewState)

        saveViewState(editor as unknown as monaco.editor.IStandaloneCodeEditor)
        expect(localStorage.getItem("editorScroll:tab-abc:viewState")).toBe(JSON.stringify(customViewState))

        localStorage.clear()
        scrollKey.value = undefined
        saveViewState(editor as unknown as monaco.editor.IStandaloneCodeEditor)
        expect(localStorage.length).toBe(0)
    })
})
