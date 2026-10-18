import {describe, it, expect} from "vitest"
import {safePath} from "./useBaseNamespaces"

describe("safePath", () => {
    it("returns an ordinary nested namespace in its expected form", () => {
        expect(safePath("io.kestra.tests")).toBe("io.kestra.tests")
        expect(safePath("company.analytics.subgroup")).toBe("company.analytics.subgroup")
        expect(safePath("engineering/data-platform/pipelines")).toBe("engineering/data-platform/pipelines")
    })

    it("escapes segments containing characters that need escaping while preserving slashes", () => {
        const input = "company/team with spaces/project#1?q=val&x=2"
        const result = safePath(input)

        expect(result).toBe("company/team%20with%20spaces/project%231%3Fq%3Dval%26x%3D2")
        expect(result).not.toContain(" ")
        expect(result).not.toContain("#")
        expect(result).not.toContain("?")
        expect(result).toContain("/")
    })

    it("handles an empty namespace rather than producing a malformed path", () => {
        expect(safePath("")).toBe("")
    })

    it("preserves leading and trailing separators without producing empty or corrupt segments", () => {
        expect(safePath("/leading/path")).toBe("/leading/path")
        expect(safePath("trailing/path/")).toBe("trailing/path/")
        expect(safePath("/both/ends/")).toBe("/both/ends/")
    })

    it("round-trips so decoding it recovers the original namespace", () => {
        const testCases = [
            "company.analytics",
            "team/sub-team/project_alpha",
            "spaces and symbols #1 & 2 = test?",
            "unicode/namespace/café/⚡/flow",
            "/leading/and/trailing/",
            "",
        ]

        for (const original of testCases) {
            const escaped = safePath(original)
            const decoded = decodeURIComponent(escaped)
            expect(decoded).toBe(original)
        }
    })
})
