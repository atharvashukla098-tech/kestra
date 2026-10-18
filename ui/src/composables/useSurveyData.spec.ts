import {describe, it, expect, beforeEach, vi} from "vitest"
import {useSurveySkip} from "./useSurveyData"

describe("useSurveySkip", () => {
    beforeEach(() => {
        localStorage.clear()
        vi.restoreAllMocks()
    })

    it("reports the survey as not skipped in a fresh state", () => {
        const {isSurveySkipped, surveySkipStatus, surveySkipData, shouldShowHelloDialog, shouldShowDialog} = useSurveySkip()

        expect(isSurveySkipped.value).toBe(false)
        expect(surveySkipStatus.value).toBe("not_skipped")
        expect(surveySkipData.value).toBeNull()
        expect(shouldShowHelloDialog()).toBe(false)
        expect(shouldShowDialog.value).toBe(false)
    })

    it("records skip action and reports the survey as skipped from then on", () => {
        const {isSurveySkipped, surveySkipStatus, surveySkipData, storeSurveySkipData} = useSurveySkip()

        storeSurveySkipData({skipped: true})

        expect(isSurveySkipped.value).toBe(true)
        expect(surveySkipStatus.value).toBe("skipped")
        expect(surveySkipData.value?.skipped).toBe(true)
        expect(surveySkipData.value?.survey_action).toBe("skipped")

        const stored = JSON.parse(localStorage.getItem("basicAuthSurveySkipped") ?? "{}")
        expect(stored.skipped).toBe(true)
        expect(stored.survey_action).toBe("skipped")
    })

    it("survives a second call so that subsequent instances detect the skip", () => {
        const first = useSurveySkip()
        first.storeSurveySkipData({skipped: true})
        expect(first.isSurveySkipped.value).toBe(true)

        const second = useSurveySkip()
        expect(second.isSurveySkipped.value).toBe(true)
        expect(second.surveySkipStatus.value).toBe("skipped")
        expect(second.shouldShowHelloDialog()).toBe(false)
        expect(second.shouldShowDialog.value).toBe(false)
    })

    it("treats a malformed stored value as not skipped rather than throwing", () => {
        localStorage.setItem("basicAuthSurveySkipped", "{malformed-json")
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

        let instance!: ReturnType<typeof useSurveySkip>
        expect(() => {
            instance = useSurveySkip()
        }).not.toThrow()

        expect(instance.isSurveySkipped.value).toBe(false)
        expect(instance.surveySkipStatus.value).toBe("not_skipped")
        expect(instance.surveySkipData.value).toBeNull()
        expect(instance.shouldShowHelloDialog()).toBe(false)
        expect(warnSpy).toHaveBeenCalled()
    })

    it("is idempotent when skipping multiple times", () => {
        const instance = useSurveySkip()

        instance.storeSurveySkipData({skipped: true})
        const firstStored = JSON.parse(localStorage.getItem("basicAuthSurveySkipped") ?? "{}")

        instance.storeSurveySkipData({skipped: true})
        const secondStored = JSON.parse(localStorage.getItem("basicAuthSurveySkipped") ?? "{}")

        expect(instance.isSurveySkipped.value).toBe(true)
        expect(firstStored.skipped).toBe(true)
        expect(secondStored.skipped).toBe(true)
        expect(firstStored.step_number).toBe(secondStored.step_number)
        expect(firstStored.survey_action).toBe(secondStored.survey_action)
    })

    it("shows dialog only after 30 days have elapsed and dialog has not been shown", () => {
        const instance = useSurveySkip()
        const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
        instance.storeSurveySkipData({
            skipped: true,
            skippedAt: thirtyOneDaysAgo,
            dialogShown: false,
        })

        expect(instance.shouldShowHelloDialog()).toBe(true)
        expect(instance.shouldShowDialog.value).toBe(true)

        instance.markSurveyDialogShown()

        expect(instance.shouldShowHelloDialog()).toBe(false)
        expect(instance.shouldShowDialog.value).toBe(false)
    })

    it("clears survey skip data when clearSurveySkipData is called", () => {
        const instance = useSurveySkip()
        instance.storeSurveySkipData({skipped: true})
        expect(instance.isSurveySkipped.value).toBe(true)

        instance.clearSurveySkipData()
        expect(instance.isSurveySkipped.value).toBe(false)
        expect(instance.surveySkipData.value).toBeNull()
        expect(localStorage.getItem("basicAuthSurveySkipped")).toBeNull()
    })
})
