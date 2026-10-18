import {describe, expect, it, vi} from "vitest"

globalThis.MonacoEnvironment = {
    getWorker: () => ({postMessage(){}, terminate(){}, addEventListener(){}, removeEventListener(){}}) as unknown as Worker,
}

import * as monaco from "monaco-editor/editor/editor.api.js"

vi.mock("@kestra-io/topology", () => ({flowYamlUtils: {parse: () => ({})}}))

import {PebbleAutoCompletion} from "../../../services/autoCompletionProvider"
import {
    endOfWordColumn,
    NO_SUGGESTIONS,
    registerPebbleAutocompletion,
    registerFunctionParametersAutoCompletion,
    registerNestedValueAutoCompletion,
    registerFilterAutoCompletion,
} from "./pebbleLanguageConfigurator"

describe.each([
    ["pebble root variable", "{{ inputs",  10, registerPebbleAutocompletion,             {rootFieldAutoCompletion:   () => Promise.resolve(["inputs"]), functionsWithDefaults: () => Promise.resolve([])}],
    ["statement root variable", "{% inputs", 10, registerPebbleAutocompletion,           {rootFieldAutoCompletion:   () => Promise.resolve(["inputs"]), functionsWithDefaults: () => Promise.resolve([])}],
    ["empty statement block", "{% ", 4, registerPebbleAutocompletion,                    {rootFieldAutoCompletion:   () => Promise.resolve(["inputs"]), functionsWithDefaults: () => Promise.resolve([])}],
    ["function parameters",  "{{ secret(", 11, registerFunctionParametersAutoCompletion, {functionAutoCompletion:    () => Promise.resolve(["'value'"])}],
    ["nested value",         "{{ flow.",    9, registerNestedValueAutoCompletion,        {nestedFieldAutoCompletion: () => Promise.resolve(["id"])}],
    ["statement nested value", "{% inputs.", 11, registerNestedValueAutoCompletion,      {nestedFieldAutoCompletion: () => Promise.resolve(["cond"])}],
    ["statement if nested value", "{% if inputs.", 14, registerNestedValueAutoCompletion, {nestedFieldAutoCompletion: () => Promise.resolve(["cond"])}],
    ["filter",               "{{ x | up",  10, registerFilterAutoCompletion,             {filterAutoCompletion:      () => Promise.resolve(["upper"])}],
    ["statement filter",     "{% x | up",  10, registerFilterAutoCompletion,             {filterAutoCompletion:      () => Promise.resolve(["upper"])}],
])("%s autocompletion", (_label, text, column, register, ac) => {
    it("returns incomplete:true so Monaco re-invokes provider on every keystroke", async () => {
        const spy = vi.spyOn(monaco.languages, "registerCompletionItemProvider")
            .mockImplementation(() => ({dispose: () => {}}))
        const model = monaco.editor.createModel(text)
        try {
            register([], Object.assign(new PebbleAutoCompletion(), ac), ["yaml"])
            const provider = spy.mock.calls[0][1]
            const result = await provider.provideCompletionItems(
                model,
                new monaco.Position(1, column),
                {triggerKind: monaco.languages.CompletionTriggerKind.Invoke},
                new monaco.CancellationTokenSource().token,
            )
            expect(result?.incomplete).toBe(true)
        } finally {
            model.dispose()
            spy.mockRestore()
        }
    })
})

describe("endOfWordColumn", () => {
    it("returns the column at the end of the word under the cursor", () => {
        const model = monaco.editor.createModel("inputs.myVar")
        try {
            const col = endOfWordColumn(new monaco.Position(1, 8), model)
            expect(col).toBe(13)
        } finally {
            model.dispose()
        }
    })

    it("resolves to the word's end even when cursor is mid-word", () => {
        const model = monaco.editor.createModel("myVariable")
        try {
            const colMid = endOfWordColumn(new monaco.Position(1, 3), model)
            expect(colMid).toBe(11)

            const colLate = endOfWordColumn(new monaco.Position(1, 7), model)
            expect(colLate).toBe(11)
        } finally {
            model.dispose()
        }
    })

    it("returns the cursor column itself when cursor is on whitespace", () => {
        const model = monaco.editor.createModel("   ")
        try {
            const col = endOfWordColumn(new monaco.Position(1, 2), model)
            expect(col).toBe(2)
        } finally {
            model.dispose()
        }
    })

    it("terminates the word when encountering punctuation or separators", () => {
        const model = monaco.editor.createModel("word: next 'quoted' }} %}")
        try {
            // "word" (cols 1..4), terminated by ":" -> end column is 5
            expect(endOfWordColumn(new monaco.Position(1, 1), model)).toBe(5)
            // "next" (cols 7..10), terminated by space -> end column is 11
            expect(endOfWordColumn(new monaco.Position(1, 7), model)).toBe(11)
            // "quoted" starts at col 13, ends before closing quote at col 19
            expect(endOfWordColumn(new monaco.Position(1, 13), model)).toBe(19)
        } finally {
            model.dispose()
        }
    })
})

describe("NO_SUGGESTIONS", () => {
    it("is the empty-suggestion shape Monaco expects, not undefined", () => {
        expect(NO_SUGGESTIONS).toBeDefined()
        expect(NO_SUGGESTIONS).not.toBeUndefined()
        expect(NO_SUGGESTIONS).toEqual({suggestions: []})
        expect(Array.isArray(NO_SUGGESTIONS.suggestions)).toBe(true)
        expect(NO_SUGGESTIONS.suggestions).toHaveLength(0)
    })
})
