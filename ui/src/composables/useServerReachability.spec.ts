import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {isReadonly} from "vue"
import {
    UNREACHABLE_DELAY,
    markServerReachable,
    markServerUnreachable,
    useServerReachability,
} from "./useServerReachability"

describe("useServerReachability", () => {
    beforeEach(() => {
        vi.useFakeTimers()
        markServerReachable()
    })

    afterEach(() => {
        markServerReachable()
        vi.useRealTimers()
    })

    it("starts with unreachable as false", () => {
        const {unreachable} = useServerReachability()
        expect(unreachable.value).toBe(false)
    })

    it("does not flip unreachable immediately when markServerUnreachable is called", () => {
        const {unreachable} = useServerReachability()
        markServerUnreachable()
        expect(unreachable.value).toBe(false)
    })

    it("flips unreachable to true only after UNREACHABLE_DELAY elapses", () => {
        const {unreachable} = useServerReachability()
        markServerUnreachable()

        vi.advanceTimersByTime(UNREACHABLE_DELAY - 1)
        expect(unreachable.value).toBe(false)

        vi.advanceTimersByTime(1)
        expect(unreachable.value).toBe(true)
    })

    it("cancels the pending flip entirely when markServerReachable is called before the delay", () => {
        const {unreachable} = useServerReachability()
        markServerUnreachable()

        vi.advanceTimersByTime(UNREACHABLE_DELAY / 2)
        markServerReachable()

        vi.advanceTimersByTime(UNREACHABLE_DELAY)
        expect(unreachable.value).toBe(false)
    })

    it("does not schedule two timers when calling markServerUnreachable twice", () => {
        const {unreachable} = useServerReachability()
        markServerUnreachable()

        vi.advanceTimersByTime(UNREACHABLE_DELAY - 500)
        markServerUnreachable()

        // Reaching the original timer expiration flips to true
        vi.advanceTimersByTime(500)
        expect(unreachable.value).toBe(true)

        // Resetting back to reachable
        markServerReachable()
        expect(unreachable.value).toBe(false)

        // Advance further time to verify no phantom second timer fires
        vi.advanceTimersByTime(UNREACHABLE_DELAY)
        expect(unreachable.value).toBe(false)
    })

    it("resets unreachable to false when markServerReachable is called after it has flipped", () => {
        const {unreachable} = useServerReachability()
        markServerUnreachable()

        vi.advanceTimersByTime(UNREACHABLE_DELAY)
        expect(unreachable.value).toBe(true)

        markServerReachable()
        expect(unreachable.value).toBe(false)
    })

    it("returns a readonly ref from useServerReachability", () => {
        const {unreachable} = useServerReachability()
        expect(isReadonly(unreachable)).toBe(true)
    })
})
