import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {ref} from "vue"
import * as monaco from "monaco-editor/editor/editor.api"
import {useEditorContentWidget, type EditorContentWidgetContext} from "./useEditorContentWidget"

describe("useEditorContentWidget", () => {
    let editorRoot: ReturnType<typeof ref<HTMLElement | null>>
    let scrollableElement: HTMLDivElement
    let addedWidgets: monaco.editor.IContentWidget[]
    let removedWidgets: monaco.editor.IContentWidget[]

    function createMockEditor(): monaco.editor.IStandaloneCodeEditor {
        return {
            addContentWidget: vi.fn((widget: monaco.editor.IContentWidget) => {
                addedWidgets.push(widget)
                const node = widget.getDomNode()
                if (!document.body.contains(node)) {
                    document.body.appendChild(node)
                }
                widget.afterRender?.()
            }),
            removeContentWidget: vi.fn((widget: monaco.editor.IContentWidget) => {
                removedWidgets.push(widget)
                const node = widget.getDomNode()
                if (document.body.contains(node)) {
                    node.remove()
                }
            }),
        } as unknown as monaco.editor.IStandaloneCodeEditor
    }

    beforeEach(() => {
        addedWidgets = []
        removedWidgets = []
        const root = document.createElement("div")
        scrollableElement = document.createElement("div")
        scrollableElement.className = "monaco-scrollable-element"
        vi.spyOn(scrollableElement, "getBoundingClientRect").mockReturnValue({
            width: 800,
            height: 600,
            top: 0,
            left: 0,
            bottom: 600,
            right: 800,
            x: 0,
            y: 0,
            toJSON: () => {},
        })
        root.appendChild(scrollableElement)
        document.body.appendChild(root)
        editorRoot = ref(root)
    })

    afterEach(() => {
        document.body.innerHTML = ""
        vi.restoreAllMocks()
    })

    it("adds the widget to the editor on setup", async () => {
        const mockEditor = createMockEditor()
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => mockEditor,
            editorRoot,
        }

        const {showWidgetContent, addContentWidget} = useEditorContentWidget(ctx)
        expect(showWidgetContent.value).toBe(false)

        await addContentWidget({
            id: "test-widget",
            position: {lineNumber: 5, column: 10},
            height: 2.5,
            right: "20px",
        })

        expect(mockEditor.addContentWidget).toHaveBeenCalledTimes(1)
        expect(addedWidgets).toHaveLength(1)
        expect(showWidgetContent.value).toBe(true)

        const widget = addedWidgets[0]
        expect(widget.getPosition()).toEqual({
            position: {lineNumber: 5, column: 10},
            preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
        })

        const domNode = widget.getDomNode()
        const contentNode = domNode.querySelector(".editor-content-widget-content") as HTMLElement
        expect(contentNode.style.height).toBe("2.5rem")
        expect(domNode.style.left).toBe("calc(630px)")
    })

    it("carries a stable id", async () => {
        const mockEditor = createMockEditor()
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => mockEditor,
            editorRoot,
        }

        const {addContentWidget} = useEditorContentWidget(ctx)

        await addContentWidget({
            id: "stable-widget-id-42",
            position: {lineNumber: 1, column: 1},
            height: 1,
            right: "0px",
        })

        expect(addedWidgets[0].getId()).toBe("stable-widget-id-42")
    })

    it("is removed when disposed", async () => {
        const mockEditor = createMockEditor()
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => mockEditor,
            editorRoot,
        }

        const {showWidgetContent, addContentWidget, removeContentWidget} = useEditorContentWidget(ctx)

        await addContentWidget({
            id: "disposable-widget",
            position: {lineNumber: 1, column: 1},
            height: 1,
            right: "0px",
        })
        expect(showWidgetContent.value).toBe(true)

        removeContentWidget("disposable-widget")

        expect(mockEditor.removeContentWidget).toHaveBeenCalledTimes(1)
        expect(removedWidgets[0].getId()).toBe("disposable-widget")
        expect(showWidgetContent.value).toBe(false)
        expect(document.querySelector(".editor-content-widget")).toBeNull()
    })

    it("disposing twice does not throw", async () => {
        const mockEditor = createMockEditor()
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => mockEditor,
            editorRoot,
        }

        const {showWidgetContent, addContentWidget, removeContentWidget} = useEditorContentWidget(ctx)

        await addContentWidget({
            id: "multi-dispose-widget",
            position: {lineNumber: 1, column: 1},
            height: 1,
            right: "0px",
        })

        expect(() => {
            removeContentWidget("multi-dispose-widget")
            removeContentWidget("multi-dispose-widget")
        }).not.toThrow()

        expect(showWidgetContent.value).toBe(false)
        expect(mockEditor.removeContentWidget).toHaveBeenCalledTimes(2)
    })

    it("creates the widget's DOM node once, not per call", async () => {
        const mockEditor = createMockEditor()
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => mockEditor,
            editorRoot,
        }

        const {addContentWidget, removeContentWidget} = useEditorContentWidget(ctx)

        await addContentWidget({
            id: "first-call",
            position: {lineNumber: 1, column: 1},
            height: 1,
            right: "0px",
        })
        const firstNode = addedWidgets[0].getDomNode()

        removeContentWidget("first-call")

        await addContentWidget({
            id: "second-call",
            position: {lineNumber: 2, column: 2},
            height: 3,
            right: "10px",
        })
        const secondNode = addedWidgets[1].getDomNode()

        expect(firstNode).toBe(secondNode)
        expect(firstNode.classList.contains("editor-content-widget")).toBe(true)
        expect(firstNode.querySelector(".editor-content-widget-content")).not.toBeNull()
    })

    it("no editor is a no-op", async () => {
        const ctx: EditorContentWidgetContext = {
            codeEditor: () => undefined,
            editorRoot,
        }

        const {showWidgetContent, addContentWidget, removeContentWidget} = useEditorContentWidget(ctx)

        await expect(
            addContentWidget({
                id: "no-editor-widget",
                position: {lineNumber: 1, column: 1},
                height: 1,
                right: "0px",
            }),
        ).resolves.toBeUndefined()
        expect(showWidgetContent.value).toBe(false)

        expect(() => removeContentWidget("no-editor-widget")).not.toThrow()
        expect(showWidgetContent.value).toBe(false)
    })
})
