import {describe, it, expect, vi, beforeEach} from "vitest"
import {createPinia, setActivePinia} from "pinia"
import {useApiStore} from "../stores/api"
import {
    TOUR_ANALYTICS_EXPERIENCE,
    TOUR_ANALYTICS_VERSION,
    useOnboardingAnalytics,
} from "./useOnboardingAnalytics"

vi.mock("vue-router", () => ({
    useRoute: () => ({
        name: "flows/update",
        path: "/ui/flows/edit/company/my-flow",
        params: {namespace: "company", id: "my-flow"},
        query: {},
    }),
}))

describe("useOnboardingAnalytics", () => {
    let apiStore: ReturnType<typeof useApiStore>
    const sceneIds = ["welcome", "create_flow", "run_execution", "explore_topology"] as const
    const guideId = "getting-started-tour"

    beforeEach(() => {
        setActivePinia(createPinia())
        apiStore = useApiStore()
        apiStore.events = vi.fn()
    })

    it("sends an event with type: ONBOARDING and the version and experience constants", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({event: "tour_started"})

        expect(apiStore.events).toHaveBeenCalledTimes(1)
        expect(apiStore.events).toHaveBeenCalledWith(
            expect.objectContaining({
                type: "ONBOARDING",
                onboarding: expect.objectContaining({
                    version: TOUR_ANALYTICS_VERSION,
                    experience: TOUR_ANALYTICS_EXPERIENCE,
                    template: TOUR_ANALYTICS_EXPERIENCE,
                    guideId,
                    event: "tour_started",
                }),
            }),
        )
    })

    it("derives step as the 1-based index of the action within sceneIds", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({event: "tour_continued", action: "welcome"})
        expect(apiStore.events).toHaveBeenLastCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: "welcome",
                    step: 1,
                }),
            }),
        )

        trackOnboarding({event: "tour_continued", action: "run_execution"})
        expect(apiStore.events).toHaveBeenLastCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: "run_execution",
                    step: 3,
                }),
            }),
        )

        trackOnboarding({event: "tour_completed", action: "explore_topology"})
        expect(apiStore.events).toHaveBeenLastCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: "explore_topology",
                    step: 4,
                }),
            }),
        )
    })

    it("produces undefined step for an action that is not a scene id", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({event: "tour_closed", action: "skipped_dialog"})

        expect(apiStore.events).toHaveBeenCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: "skipped_dialog",
                    step: undefined,
                }),
            }),
        )
    })

    it("produces undefined step when no action is given", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({event: "tour_offered", action: undefined})
        expect(apiStore.events).toHaveBeenLastCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: undefined,
                    step: undefined,
                }),
            }),
        )

        trackOnboarding({event: "tour_closed", action: null})
        expect(apiStore.events).toHaveBeenLastCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    action: null,
                    step: undefined,
                }),
            }),
        )
    })

    it("forwards guideId, event, action and mode", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId: "custom-tour-id"})

        trackOnboarding({
            event: "tour_continued",
            action: "create_flow",
            mode: "guided",
        })

        expect(apiStore.events).toHaveBeenCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    guideId: "custom-tour-id",
                    event: "tour_continued",
                    action: "create_flow",
                    mode: "guided",
                    step: 2,
                }),
            }),
        )
    })

    it("merges additional fields into the onboarding payload so they can be read back", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({
            event: "tour_continued",
            action: "create_flow",
            additional: {
                flowId: "my-sample-flow",
                attemptsCount: 2,
                userConfirmed: true,
            },
        })

        expect(apiStore.events).toHaveBeenCalledWith(
            expect.objectContaining({
                onboarding: expect.objectContaining({
                    flowId: "my-sample-flow",
                    attemptsCount: 2,
                    userConfirmed: true,
                }),
            }),
        )
    })

    it("carries the current page from the route in the payload", () => {
        const {trackOnboarding} = useOnboardingAnalytics({sceneIds, guideId})

        trackOnboarding({event: "tour_started"})

        expect(apiStore.events).toHaveBeenCalledWith(
            expect.objectContaining({
                page: expect.objectContaining({
                    name: "flows/update",
                    path: "/ui/flows/edit/company/my-flow",
                }),
            }),
        )
    })
})
