import {describe, it, expect, beforeEach} from "vitest"
import {STATES, LOG_LEVELS} from "@kestra-io/design-system"
import {getSchemes, getSchemeValue} from "./scheme"

describe("scheme.ts", () => {
    beforeEach(() => {
        document.documentElement.removeAttribute("style")

        document.documentElement.style.setProperty("--ks-status-success", "#28a745")
        document.documentElement.style.setProperty("--ks-status-failed", "#dc3545")
        document.documentElement.style.setProperty("--ks-status-running", "#007bff")
        document.documentElement.style.setProperty("--ks-log-info", "#17a2b8")
        document.documentElement.style.setProperty("--ks-log-error", "#e3342f")
    })

    it("returns an entry for every execution state and every log level", () => {
        const schemes = getSchemes()

        const executionStates = Object.values(STATES) as {name: string}[]
        for (const state of executionStates) {
            expect(schemes.executions).toHaveProperty(state.name)
        }

        for (const level of LOG_LEVELS) {
            expect(schemes.logs).toHaveProperty(level)
        }
    })

    it("resolves each value from the configured CSS custom property", () => {
        const schemes = getSchemes()

        expect(schemes.executions["SUCCESS"]).toBe("#28a745")
        expect(schemes.executions["FAILED"]).toBe("#dc3545")
        expect(schemes.executions["RUNNING"]).toBe("#007bff")
        expect(schemes.logs["INFO"]).toBe("#17a2b8")
        expect(schemes.logs["ERROR"]).toBe("#e3342f")
    })

    it("falls back to transparent rather than an empty string when token is not defined", () => {
        const schemes = getSchemes()

        expect(schemes.executions["CREATED"]).toBe("transparent")
        expect(schemes.executions["CREATED"]).not.toBe("")
        expect(schemes.logs["DEBUG"]).toBe("transparent")
        expect(schemes.logs["DEBUG"]).not.toBe("")
    })

    it("reads from the executions map by default in getSchemeValue", () => {
        expect(getSchemeValue("SUCCESS")).toBe("#28a745")
        expect(getSchemeValue("FAILED")).toBe("#dc3545")
    })

    it("reads from the logs map when type is logs in getSchemeValue", () => {
        expect(getSchemeValue("INFO", "logs")).toBe("#17a2b8")
        expect(getSchemeValue("ERROR", "logs")).toBe("#e3342f")
    })

    it("returns transparent for an unknown state or log level", () => {
        expect(getSchemeValue("NON_EXISTENT_STATE")).toBe("transparent")
        expect(getSchemeValue("NON_EXISTENT_LEVEL", "logs")).toBe("transparent")
    })
})
