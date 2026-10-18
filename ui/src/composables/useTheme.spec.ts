import {beforeEach, describe, expect, it, vi} from "vitest"
import {reactive} from "vue"

const mockState = reactive({theme: "light"})
const mockGetTheme = vi.fn<() => "light" | "dark">(() => "light")

vi.mock("override/stores/misc", () => ({
    useMiscStore: () => mockState,
}))

vi.mock("../utils/utils", () => ({
    getTheme: () => mockGetTheme(),
}))

import {useTheme} from "./useTheme"

describe("useTheme", () => {
    beforeEach(() => {
        mockState.theme = "light"
        mockGetTheme.mockReturnValue("light")
    })

    it("returns the current theme", () => {
        mockGetTheme.mockReturnValue("light")
        const theme = useTheme()
        expect(theme.value).toBe("light")
    })

    it("re-evaluates the computed when miscStore.theme changes so the value tracks a theme switch", () => {
        mockGetTheme.mockReturnValue("light")
        const theme = useTheme()
        expect(theme.value).toBe("light")

        // Switch to dark
        mockGetTheme.mockReturnValue("dark")
        mockState.theme = "dark"
        expect(theme.value).toBe("dark")
    })

    it("matches what getTheme() reports", () => {
        mockGetTheme.mockReturnValue("dark")
        mockState.theme = "any"
        expect(useTheme().value).toBe("dark")

        mockGetTheme.mockReturnValue("light")
        mockState.theme = "other"
        expect(useTheme().value).toBe("light")
    })

    it("ensures two callers observe the same value", () => {
        const caller1 = useTheme()
        const caller2 = useTheme()

        expect(caller1.value).toBe("light")
        expect(caller2.value).toBe("light")
        expect(caller1.value).toBe(caller2.value)

        mockGetTheme.mockReturnValue("dark")
        mockState.theme = "dark"

        expect(caller1.value).toBe("dark")
        expect(caller2.value).toBe("dark")
        expect(caller1.value).toBe(caller2.value)
    })
})
