import {describe, expect, it} from "vitest"
import type {languages} from "monaco-editor/editor/editor.api"
import {withIndentedBlockScalarContent} from "./yamlBlockScalarTokenizer"

describe("withIndentedBlockScalarContent", () => {
    it("returns unchanged a language without a multiStringContinued tokenizer state", () => {
        const withoutState: languages.IMonarchLanguage = {
            tokenizer: {
                root: [],
            },
        }
        expect(withIndentedBlockScalarContent(withoutState)).toBe(withoutState)

        const withoutTokenizer: languages.IMonarchLanguage = {} as languages.IMonarchLanguage
        expect(withIndentedBlockScalarContent(withoutTokenizer)).toBe(withoutTokenizer)
    })

    it("returns a new language with multiStringContinued replaced when present", () => {
        const originalRule: languages.IMonarchLanguageRule[] = [[/^.*$/, "oldString"]]
        const language: languages.IMonarchLanguage = {
            tokenizer: {
                root: [],
                multiStringContinued: originalRule,
            },
        }

        const result = withIndentedBlockScalarContent(language)

        expect(result).not.toBe(language)
        expect(result.tokenizer.multiStringContinued).not.toEqual(originalRule)
        expect(result.tokenizer.multiStringContinued).toHaveLength(1)
    })

    it("does not mutate the original language object", () => {
        const originalRule: languages.IMonarchLanguageRule[] = [[/^.*$/, "oldString"]]
        const language: languages.IMonarchLanguage = {
            tokenizer: {
                root: [],
                multiStringContinued: originalRule,
            },
        }

        withIndentedBlockScalarContent(language)

        expect(language.tokenizer.multiStringContinued).toBe(originalRule)
        expect(language.tokenizer.multiStringContinued).toEqual(originalRule)
    })

    it("carries over every other tokenizer state untouched", () => {
        const rootRule: languages.IMonarchLanguageRule[] = [[/^[a-z]+$/, "keyword"]]
        const commentRule: languages.IMonarchLanguageRule[] = [[/^#.*$/, "comment"]]
        const language: languages.IMonarchLanguage = {
            defaultToken: "invalid",
            ignoreCase: true,
            tokenizer: {
                root: rootRule,
                comment: commentRule,
                multiStringContinued: [],
            },
        }

        const result = withIndentedBlockScalarContent(language)

        expect(result.defaultToken).toBe("invalid")
        expect(result.ignoreCase).toBe(true)
        expect(result.tokenizer.root).toBe(rootRule)
        expect(result.tokenizer.comment).toBe(commentRule)
    })

    it("defines a replacement rule that keeps more-indented lines inside the block rather than ending it", () => {
        const language: languages.IMonarchLanguage = {
            tokenizer: {
                root: [],
                multiStringContinued: [],
            },
        }

        const result = withIndentedBlockScalarContent(language)
        const rule = result.tokenizer.multiStringContinued[0] as [RegExp, {cases: Record<string, unknown>}]

        const regex = rule[0]
        const cases = rule[1].cases

        // The regex captures leading whitespace in group 1
        expect(regex.test("    indented line")).toBe(true)
        const match = regex.exec("      more indented")
        expect(match?.[1]).toBe("      ")

        // Case specifies "$1~$S2 *" maps to "string"
        expect(cases["$1~$S2 *"]).toBe("string")

        // Simulating the Monarch pattern: when $S2 is 4 spaces ("    "),
        // a 4-space indent or a 6-space indent matches the "^$S2 *" pattern and stays as "string"
        const blockIndent = "    "
        const indentPattern = new RegExp(`^${blockIndent} *$`)

        const exactIndent = "    "
        const deeperIndent = "      "
        expect(indentPattern.test(exactIndent)).toBe(true)
        expect(indentPattern.test(deeperIndent)).toBe(true)
    })

    it("ends the block when a line is indented less than the block start", () => {
        const language: languages.IMonarchLanguage = {
            tokenizer: {
                root: [],
                multiStringContinued: [],
            },
        }

        const result = withIndentedBlockScalarContent(language)
        const rule = result.tokenizer.multiStringContinued[0] as [RegExp, {cases: Record<string, unknown>}]
        const cases = rule[1].cases

        // The default case matches when the indent does not satisfy "$1~$S2 *"
        expect(cases["@default"]).toEqual({token: "@rematch", next: "@popall"})

        // When $S2 is 4 spaces, a 2-space indent fails the pattern and triggers @default
        const blockIndent = "    "
        const indentPattern = new RegExp(`^${blockIndent} *$`)

        const shallowerIndent = "  "
        const zeroIndent = ""
        expect(indentPattern.test(shallowerIndent)).toBe(false)
        expect(indentPattern.test(zeroIndent)).toBe(false)
    })
})
