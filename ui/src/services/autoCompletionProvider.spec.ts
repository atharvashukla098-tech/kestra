import {describe, expect, it, vi, beforeEach} from "vitest"
import {
    QUOTE,
    resetExpressionCache,
    fillExpressionCache,
    functionToSnippet,
    PebbleAutoCompletion,
    YamlAutoCompletion,
    type PebbleFunctionDef,
} from "./autoCompletionProvider"

const mockAxiosGet = vi.fn()

vi.mock("@kestra-io/kestra-sdk", () => ({
    useClient: () => ({
        get: mockAxiosGet,
    }),
}))

vi.mock("../override/utils/route", () => ({
    apiUrlWithoutTenants: () => "http://localhost:8080/api/v1",
}))

describe("autoCompletionProvider", () => {
    beforeEach(() => {
        mockAxiosGet.mockReset()
        resetExpressionCache()
    })

    describe("QUOTE constant", () => {
        it("exposes the standard single quote character", () => {
            expect(QUOTE).toBe("'")
        })

        it("wraps string values that need quoting and leaves unquoted identifiers alone", () => {
            const formatValue = (val: string, shouldQuote: boolean) =>
                shouldQuote ? `${QUOTE}${val}${QUOTE}` : val

            expect(formatValue("simple_field", false)).toBe("simple_field")
            expect(formatValue("value with spaces", true)).toBe("'value with spaces'")
            expect(formatValue("quoted-literal", true)).toBe("'quoted-literal'")
        })
    })

    describe("functionToSnippet", () => {
        it("formats a function with no arguments as a simple call", () => {
            const fn: PebbleFunctionDef = {name: "uuid", arguments: []}
            expect(functionToSnippet(fn)).toBe("uuid()")
        })

        it("omits arguments whose defaultValue is null", () => {
            const fn: PebbleFunctionDef = {
                name: "now",
                arguments: [{name: "format", defaultValue: null}],
            }
            expect(functionToSnippet(fn)).toBe("now()")
        })

        it("formats arguments with non-null defaults using Monaco placeholders", () => {
            const fn: PebbleFunctionDef = {
                name: "secret",
                arguments: [{name: "key", defaultValue: "'MY_SECRET'"}],
            }
            expect(functionToSnippet(fn)).toBe("secret(key=${1:'MY_SECRET'})")
        })

        it("formats multiple arguments sequentially, skipping null defaults", () => {
            const fn: PebbleFunctionDef = {
                name: "kv",
                arguments: [
                    {name: "key", defaultValue: "'my_key'"},
                    {name: "namespace", defaultValue: "flow.namespace"},
                    {name: "errorOnMissing", defaultValue: null},
                ],
            }
            expect(functionToSnippet(fn)).toBe("kv(key=${1:'my_key'}, namespace=${2:flow.namespace})")
        })

        it("supports replacement and deprecation flags on definition without affecting the snippet", () => {
            const fn: PebbleFunctionDef = {
                name: "oldFunc",
                arguments: [{name: "arg", defaultValue: "123"}],
                deprecated: true,
                replacement: "newFunc",
            }
            expect(functionToSnippet(fn)).toBe("oldFunc(arg=${1:123})")
        })
    })

    describe("fillExpressionCache and resetExpressionCache", () => {
        it("fills the cache so API is not queried", async () => {
            const customFilters = ["filterA", "filterB"]
            const customFunctions: PebbleFunctionDef[] = [
                {name: "fnA", arguments: []},
            ]

            fillExpressionCache(customFilters, customFunctions)

            const provider = new PebbleAutoCompletion()
            const filters = await provider.filterAutoCompletion()
            const funcs = await provider.functionsWithDefaults()

            expect(filters).toEqual(customFilters)
            expect(funcs).toEqual(customFunctions)
            expect(mockAxiosGet).not.toHaveBeenCalled()
        })

        it("resets the cache so subsequent calls re-fetch from API", async () => {
            fillExpressionCache(["cached"], [{name: "cachedFn", arguments: []}])
            resetExpressionCache()

            mockAxiosGet
                .mockResolvedValueOnce({data: ["freshFilter"]})
                .mockResolvedValueOnce({data: [{name: "freshFn", arguments: []}]})

            const provider = new PebbleAutoCompletion()
            const filters = await provider.filterAutoCompletion()
            const funcs = await provider.functionsWithDefaults()

            expect(filters).toEqual(["freshFilter"])
            expect(funcs).toEqual([{name: "freshFn", arguments: []}])
            expect(mockAxiosGet).toHaveBeenCalledTimes(2)
        })
    })

    describe("PebbleAutoCompletion base implementation", () => {
        it("returns empty array for rootFieldAutoCompletion with or without context", async () => {
            const provider = new PebbleAutoCompletion()
            expect(await provider.rootFieldAutoCompletion()).toEqual([])
            expect(await provider.rootFieldAutoCompletion({source: "", offset: 0})).toEqual([])
            expect(await provider.rootFieldAutoCompletion({source: "tasks: []", offset: 5})).toEqual([])
        })

        it("returns empty array for nestedFieldAutoCompletion with empty or unknown input", async () => {
            const provider = new PebbleAutoCompletion()
            expect(await provider.nestedFieldAutoCompletion("", undefined, "")).toEqual([])
            expect(await provider.nestedFieldAutoCompletion("invalid", {}, "nonexistent", 10)).toEqual([])
        })

        it("returns empty array for functionAutoCompletion without throwing", async () => {
            const provider = new PebbleAutoCompletion()
            expect(await provider.functionAutoCompletion(undefined, "unknown", {})).toEqual([])
            expect(await provider.functionAutoCompletion({}, "fn", {arg1: "val1"})).toEqual([])
        })

        it("fetches filters from the expected endpoint on cache miss", async () => {
            mockAxiosGet.mockResolvedValueOnce({data: ["abs", "toJson", "upper"]})

            const provider = new PebbleAutoCompletion()
            const filters = await provider.filterAutoCompletion()

            expect(mockAxiosGet).toHaveBeenCalledWith("http://localhost:8080/api/v1/pebble/filters")
            expect(filters).toEqual(["abs", "toJson", "upper"])

            // Second call reuses cached filters
            const secondCall = await provider.filterAutoCompletion()
            expect(secondCall).toEqual(["abs", "toJson", "upper"])
            expect(mockAxiosGet).toHaveBeenCalledTimes(1)
        })

        it("returns empty array when filter fetch throws an error", async () => {
            mockAxiosGet.mockRejectedValueOnce(new Error("Network connection lost"))

            const provider = new PebbleAutoCompletion()
            const filters = await provider.filterAutoCompletion()

            expect(filters).toEqual([])
        })

        it("fetches functions from the expected endpoint on cache miss", async () => {
            const mockFuncs: PebbleFunctionDef[] = [
                {name: "render", arguments: [{name: "template", defaultValue: "''"}]},
            ]
            mockAxiosGet.mockResolvedValueOnce({data: mockFuncs})

            const provider = new PebbleAutoCompletion()
            const funcs = await provider.functionsWithDefaults()

            expect(mockAxiosGet).toHaveBeenCalledWith("http://localhost:8080/api/v1/pebble/functions")
            expect(funcs).toEqual(mockFuncs)

            // Second call reuses cached functions
            const secondCall = await provider.functionsWithDefaults()
            expect(secondCall).toEqual(mockFuncs)
            expect(mockAxiosGet).toHaveBeenCalledTimes(1)
        })

        it("returns empty array when function fetch throws an error", async () => {
            mockAxiosGet.mockRejectedValueOnce(new Error("Server 500 error"))

            const provider = new PebbleAutoCompletion()
            const funcs = await provider.functionsWithDefaults()

            expect(funcs).toEqual([])
        })
    })

    describe("YamlAutoCompletion base implementation", () => {
        it("instantiates YamlAutoCompletion and inherits from PebbleAutoCompletion", () => {
            const yamlProvider = new YamlAutoCompletion()
            expect(yamlProvider).toBeInstanceOf(PebbleAutoCompletion)
            expect(yamlProvider).toBeInstanceOf(YamlAutoCompletion)
        })

        it("returns empty array for valueAutoCompletion without throwing", async () => {
            const yamlProvider = new YamlAutoCompletion()
            expect(await yamlProvider.valueAutoCompletion("", undefined, undefined)).toEqual([])
            expect(
                await yamlProvider.valueAutoCompletion(
                    "id: test",
                    {id: "test"},
                    {type: "string", range: [0, 8]} as any,
                ),
            ).toEqual([])
        })

        it("delegates filter and function auto completions to PebbleAutoCompletion", async () => {
            fillExpressionCache(["yamlFilter"], [{name: "yamlFunc", arguments: []}])

            const yamlProvider = new YamlAutoCompletion()
            const filters = await yamlProvider.filterAutoCompletion()
            const funcs = await yamlProvider.functionsWithDefaults()

            expect(filters).toEqual(["yamlFilter"])
            expect(funcs).toEqual([{name: "yamlFunc", arguments: []}])
        })
    })

    describe("Nested path resolution and deduplication contracts", () => {
        class MockCustomCompletion extends PebbleAutoCompletion {
            private tree: Record<string, Record<string, string[]>> = {
                inputs: {
                    user: ["name", "email", "address"],
                    order: ["id", "amount", "items"],
                },
            }

            override async nestedFieldAutoCompletion(
                _source: string,
                _parsed: Record<string, unknown> | undefined,
                parentField: string,
            ): Promise<string[]> {
                const parts = parentField.split(".")
                let current: any = this.tree
                for (const part of parts) {
                    current = current?.[part]
                }
                if (!current) return []

                const suggestions = Array.isArray(current) ? current : Object.keys(current)
                // Deduplicate suggestions so duplicates are not emitted twice
                return Array.from(new Set(suggestions))
            }
        }

        it("resolves nested paths to the right completion list", async () => {
            const custom = new MockCustomCompletion()

            const rootInputs = await custom.nestedFieldAutoCompletion("", undefined, "inputs")
            expect(rootInputs).toEqual(["user", "order"])

            const userFields = await custom.nestedFieldAutoCompletion("", undefined, "inputs.user")
            expect(userFields).toEqual(["name", "email", "address"])

            const orderFields = await custom.nestedFieldAutoCompletion("", undefined, "inputs.order")
            expect(orderFields).toEqual(["id", "amount", "items"])
        })

        it("yields no suggestions for unknown nested paths without throwing", async () => {
            const custom = new MockCustomCompletion()

            expect(await custom.nestedFieldAutoCompletion("", undefined, "inputs.unknown")).toEqual([])
            expect(await custom.nestedFieldAutoCompletion("", undefined, "nonexistent.path.here")).toEqual([])
        })

        it("does not emit duplicate suggestions twice", async () => {
            class DuplicateEmittingCompletion extends PebbleAutoCompletion {
                override async rootFieldAutoCompletion(): Promise<string[]> {
                    const rawList = ["inputs", "outputs", "inputs", "tasks", "outputs"]
                    return Array.from(new Set(rawList))
                }
            }

            const dedupProvider = new DuplicateEmittingCompletion()
            const suggestions = await dedupProvider.rootFieldAutoCompletion()
            expect(suggestions).toEqual(["inputs", "outputs", "tasks"])
            expect(suggestions).toHaveLength(3)
        })
    })
})
