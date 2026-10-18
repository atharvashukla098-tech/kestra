import {describe, expect, it} from "vitest"
import {validationErrorLines, pointerSegments, pointerKeys, type ValidationError} from "./validationErrors"

describe("validationErrorLines", () => {
    it("returns an empty array when errors are missing or empty", () => {
        expect(validationErrorLines(undefined)).toEqual([])
        expect(validationErrorLines([])).toEqual([])
    })

    it("formats errors with both path and detail", () => {
        const errors: ValidationError[] = [
            {path: "tasks[0].id", detail: "must not be blank"},
            {path: "tasks[log].message", detail: "must not be null"},
        ]
        expect(validationErrorLines(errors)).toEqual([
            "tasks[0].id: must not be blank",
            "tasks[log].message: must not be null",
        ])
    })

    it("formats errors with detail only when path is missing", () => {
        const errors: ValidationError[] = [
            {detail: "Flow source is invalid YAML"},
        ]
        expect(validationErrorLines(errors)).toEqual([
            "Flow source is invalid YAML",
        ])
    })

    it("ignores error entries that have no detail", () => {
        const errors: ValidationError[] = [
            {path: "tasks[0].id"} as ValidationError,
            {path: "tasks[1].id", detail: "is duplicated"},
        ]
        expect(validationErrorLines(errors)).toEqual([
            "tasks[1].id: is duplicated",
        ])
    })
})

describe("pointerSegments", () => {
    it("splits standard JSON pointer paths into segments", () => {
        expect(pointerSegments("/tasks/0/id")).toEqual(["tasks", "0", "id"])
    })

    it("unescapes RFC 6901 escaped characters (~1 as / and ~0 as ~)", () => {
        expect(pointerSegments("/tasks~1items/tilde~0key")).toEqual(["tasks/items", "tilde~key"])
    })

    it("returns empty array for root pointer", () => {
        expect(pointerSegments("/")).toEqual([""])
        expect(pointerSegments("")).toEqual([])
    })
})

describe("pointerKeys", () => {
    it("returns both original and un-prefixed keys when starting with underscore", () => {
        expect(pointerKeys("_finally")).toEqual(["_finally", "finally"])
        expect(pointerKeys("_errors")).toEqual(["_errors", "errors"])
    })

    it("returns single key when not starting with underscore", () => {
        expect(pointerKeys("tasks")).toEqual(["tasks"])
        expect(pointerKeys("id")).toEqual(["id"])
    })
})
