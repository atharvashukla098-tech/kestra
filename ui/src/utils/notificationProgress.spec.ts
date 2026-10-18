import {describe, expect, it} from "vitest"
import type {Notification} from "@kestra-io/kestra-sdk"
import {progressColor, progressPercentage} from "./notificationProgress"

describe("progressColor", () => {
    it("returns a distinct colour per outcome: SUCCEEDED, PARTIAL and FAILED", () => {
        const succeeded = progressColor({outcome: "SUCCEEDED"} as Notification)
        const partial = progressColor({outcome: "PARTIAL"} as Notification)
        const failed = progressColor({outcome: "FAILED"} as Notification)

        expect(succeeded).toBe("var(--ks-status-success)")
        expect(partial).toBe("var(--ks-status-warning)")
        expect(failed).toBe("var(--ks-status-failed)")

        const distinctColors = new Set([succeeded, partial, failed])
        expect(distinctColors.size).toBe(3)
    })

    it("falls back to the RUNNING colour when the notification has no outcome", () => {
        expect(progressColor({} as Notification)).toBe("var(--ks-status-running)")
        expect(progressColor({outcome: undefined} as Notification)).toBe("var(--ks-status-running)")
        expect(progressColor({outcome: null} as unknown as Notification)).toBe("var(--ks-status-running)")
    })
})

describe("progressPercentage", () => {
    it("returns null when totalItems is missing or zero", () => {
        expect(progressPercentage({} as Notification)).toBeNull()
        expect(progressPercentage({totalItems: undefined} as Notification)).toBeNull()
        expect(progressPercentage({totalItems: null} as unknown as Notification)).toBeNull()
        expect(progressPercentage({totalItems: 0} as Notification)).toBeNull()
    })

    it("counts both succeeded and failed items toward progress", () => {
        expect(progressPercentage({
            totalItems: 10,
            succeededItems: 3,
            failedItems: 2,
        } as Notification)).toBe(50)

        expect(progressPercentage({
            totalItems: 100,
            succeededItems: 40,
            failedItems: 35,
        } as Notification)).toBe(75)
    })

    it("counts missing succeededItems or failedItems as zero rather than producing NaN", () => {
        expect(progressPercentage({
            totalItems: 10,
            succeededItems: 4,
        } as Notification)).toBe(40)

        expect(progressPercentage({
            totalItems: 10,
            failedItems: 4,
        } as Notification)).toBe(40)

        expect(progressPercentage({
            totalItems: 10,
        } as Notification)).toBe(0)

        expect(progressPercentage({
            totalItems: 10,
            succeededItems: null,
            failedItems: null,
        } as unknown as Notification)).toBe(0)
    })

    it("rounds the percentage to the nearest integer and clamps so it never exceeds 100", () => {
        // Rounding: 1/3 = 33.333% -> 33%, 2/3 = 66.666% -> 67%
        expect(progressPercentage({
            totalItems: 3,
            succeededItems: 1,
            failedItems: 0,
        } as Notification)).toBe(33)

        expect(progressPercentage({
            totalItems: 3,
            succeededItems: 2,
            failedItems: 0,
        } as Notification)).toBe(67)

        // Clamping: over 100% clamps to 100
        expect(progressPercentage({
            totalItems: 10,
            succeededItems: 12,
            failedItems: 3,
        } as Notification)).toBe(100)
    })
})
