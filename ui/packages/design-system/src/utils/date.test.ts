import {describe, test, expect, afterEach} from "vitest"
import {currentLocale, currentTimezone, setLocale, TIMEZONE_STORAGE_KEY, parseIso, timezonesWithOffset, toIsoKeepOffset} from "./date"
import dayjs from "../date/dayjs"

describe("parseIso", () => {
    test("should parse an ISO 8601 instant", () => {
        expect(parseIso("2026-07-24T13:16:00.000Z").toISOString()).toBe("2026-07-24T13:16:00.000Z")
        expect(parseIso("2026-07-24").isValid()).toBe(true)
    })

    test.each([
        ["an epoch millisecond timestamp", 1753362960000],
        ["a bare year", "2026"],
        ["a chart category label", "not-a-date"],
        ["a nullish value", null],
    ])("should reject %s, which bare dayjs() would coerce", (_label, value) => {
        expect(parseIso(value).isValid()).toBe(false)
    })
})

describe("toIsoKeepOffset", () => {
    test("should keep the instance offset where toISOString would convert to UTC", () => {
        const inTokyo = dayjs("2026-07-24T13:16:00.000Z").tz("Asia/Tokyo")

        expect(toIsoKeepOffset(inTokyo)).toBe("2026-07-24T22:16:00.000+09:00")
        expect(inTokyo.toISOString()).toBe("2026-07-24T13:16:00.000Z")
    })
})

describe("timezonesWithOffset", () => {
    test("should list the canonical zones with their current offset", () => {
        const zones = timezonesWithOffset()

        expect(zones.length).toBeGreaterThan(100)
        expect(zones.find((z) => z.zone === "Asia/Tokyo")?.formattedOffset).toBe("+09:00")
    })

    // Intl lists canonical zones only, so a stored link name would otherwise vanish from the
    // Settings picker and the user would lose the setting on the next edit.
    test("should append a stored zone that Intl omits, such as a link name", () => {
        expect(timezonesWithOffset().some((z) => z.zone === "US/Eastern")).toBe(false)
        expect(timezonesWithOffset("US/Eastern").some((z) => z.zone === "US/Eastern")).toBe(true)
    })

    test("should not duplicate a stored zone that is already canonical", () => {
        const zones = timezonesWithOffset("Asia/Tokyo")
        expect(zones.filter((z) => z.zone === "Asia/Tokyo")).toHaveLength(1)
    })
})

describe("dayjs instance", () => {
    test("should render the ordinal day token offered by the date format setting", () => {
        expect(dayjs("2026-07-24T13:16:00.000Z").utc().format("dddd, MMMM Do YYYY")).toBe("Friday, July 24th 2026")
    })
})

describe("currentLocale and setLocale", () => {
    afterEach(async () => {
        await setLocale("en")
    })

    test("returns the default locale when none was explicitly set", () => {
        expect(currentLocale()).toBe("en")
    })

    test("changes what currentLocale returns", async () => {
        await setLocale("fr")
        expect(currentLocale()).toBe("fr")

        await setLocale("pt_BR")
        expect(currentLocale()).toBe("pt-br")
    })

    test("affects subsequent date formatting, not just the getter", async () => {
        await setLocale("fr")
        expect(dayjs("2026-07-24").format("MMMM")).toBe("juillet")

        await setLocale("en")
        expect(dayjs("2026-07-24").format("MMMM")).toBe("July")
    })

    test("falls back to 'en' when an unknown or malformed locale is provided rather than throwing", async () => {
        await expect(setLocale("unknown_LOCALE_123")).resolves.not.toThrow()
        expect(currentLocale()).toBe("en")

        await expect(setLocale("")).resolves.not.toThrow()
        expect(currentLocale()).toBe("en")
    })
})

describe("currentTimezone", () => {
    afterEach(() => {
        localStorage.removeItem(TIMEZONE_STORAGE_KEY)
    })

    test("returns the stored timezone when one is set", () => {
        localStorage.setItem(TIMEZONE_STORAGE_KEY, "Europe/Paris")
        expect(currentTimezone()).toBe("Europe/Paris")
    })

    test("falls back to the browser's guessed timezone when none is stored", () => {
        localStorage.removeItem(TIMEZONE_STORAGE_KEY)
        expect(currentTimezone()).toBe(dayjs.tz.guess())
    })

    test("an empty stored string falls back to the browser's guessed timezone", () => {
        localStorage.setItem(TIMEZONE_STORAGE_KEY, "")
        expect(currentTimezone()).toBe(dayjs.tz.guess())
    })
})

