import {afterEach, beforeEach, describe, expect, test, vi} from "vitest"

const defineThemeMock = vi.fn()
vi.mock("monaco-editor/editor/editor.api", () => ({
    editor: {
        defineTheme: (...args: unknown[]) => defineThemeMock(...args),
    },
}))

const setCompilerOptionsMock = vi.fn()
vi.mock("monaco-editor/languages/features/typescript/register", () => ({
    typescriptDefaults: {
        setCompilerOptions: (...args: unknown[]) => setCompilerOptionsMock(...args),
    },
    ScriptTarget: {
        ES2020: 7,
    },
}))

import {
    OVERFLOW_WIDGETS_ID,
    configureMonacoTypescript,
    editorModelUid,
    getOrCreateOverflowWidgetsDomNode,
    registerMonacoThemes,
} from "./monacoSetup"

describe("monacoSetup", () => {
    beforeEach(() => {
        document.getElementById(OVERFLOW_WIDGETS_ID)?.remove()
        defineThemeMock.mockClear()
        setCompilerOptionsMock.mockClear()
    })

    afterEach(() => {
        document.getElementById(OVERFLOW_WIDGETS_ID)?.remove()
    })

    describe("overflow widgets DOM container", () => {
        test("OVERFLOW_WIDGETS_ID is the id the container is given", () => {
            expect(OVERFLOW_WIDGETS_ID).toBe("ks-monaco-overflow-widgets")
        })

        test("getOrCreateOverflowWidgetsDomNode creates the container on first call and attaches it to the document", () => {
            expect(document.getElementById(OVERFLOW_WIDGETS_ID)).toBeNull()

            const node = getOrCreateOverflowWidgetsDomNode()

            expect(node).toBeInstanceOf(HTMLDivElement)
            expect(node.id).toBe(OVERFLOW_WIDGETS_ID)
            expect(node.className).toBe("monaco-editor")
            expect(document.body.contains(node)).toBe(true)
            expect(document.getElementById(OVERFLOW_WIDGETS_ID)).toBe(node)
        })

        test("a second call returns the same node rather than creating another", () => {
            const first = getOrCreateOverflowWidgetsDomNode()
            const second = getOrCreateOverflowWidgetsDomNode()

            expect(second).toBe(first)
            expect(document.querySelectorAll(`#${OVERFLOW_WIDGETS_ID}`)).toHaveLength(1)
        })

        test("the container survives being called from two different editors", () => {
            // Simulate editor 1 mounting and getting/creating overflow widgets node
            const editorOneNode = getOrCreateOverflowWidgetsDomNode()
            // Simulate editor 2 mounting and getting/creating overflow widgets node
            const editorTwoNode = getOrCreateOverflowWidgetsDomNode()

            expect(editorTwoNode).toBe(editorOneNode)
            expect(document.querySelectorAll(`#${OVERFLOW_WIDGETS_ID}`)).toHaveLength(1)
            expect(document.body.contains(editorOneNode)).toBe(true)
        })
    })

    describe("editorModelUid", () => {
        test("produces a distinct value per model and a stable string shape", () => {
            const id1 = editorModelUid()
            const id2 = editorModelUid()

            expect(typeof id1).toBe("string")
            expect(typeof id2).toBe("string")
            expect(id1.length).toBeGreaterThan(0)
            expect(id2.length).toBeGreaterThan(0)
            expect(id1).not.toBe(id2)
        })
    })

    describe("registerMonacoThemes", () => {
        test("registers both the light and the dark theme", () => {
            registerMonacoThemes()

            expect(defineThemeMock).toHaveBeenCalledTimes(2)
            expect(defineThemeMock).toHaveBeenCalledWith(
                "dark",
                expect.objectContaining({
                    base: "vs-dark",
                    inherit: true,
                    rules: expect.any(Array),
                    colors: expect.any(Object),
                }),
            )
            expect(defineThemeMock).toHaveBeenCalledWith(
                "light",
                expect.objectContaining({
                    base: "vs",
                    inherit: true,
                    rules: expect.any(Array),
                    colors: expect.any(Object),
                }),
            )
        })

        test("calling it twice does not throw", () => {
            expect(() => {
                registerMonacoThemes()
                registerMonacoThemes()
            }).not.toThrow()
        })
    })

    describe("configureMonacoTypescript", () => {
        test("applies the documented compiler defaults", () => {
            configureMonacoTypescript()

            expect(setCompilerOptionsMock).toHaveBeenCalledTimes(1)
            expect(setCompilerOptionsMock).toHaveBeenCalledWith({
                target: 7,
                lib: ["es2020"],
                allowNonTsExtensions: true,
            })
        })
    })
})
