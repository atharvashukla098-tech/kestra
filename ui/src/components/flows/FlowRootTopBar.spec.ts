import {beforeEach, describe, expect, it, vi} from "vitest"
import {i18nMount} from "../../../tests/unit/i18nMount"
import FlowRootTopBar from "./FlowRootTopBar.vue"
import Alert from "vue-material-design-icons/Alert.vue"
import Lock from "vue-material-design-icons/Lock.vue"
import Badge from "../global/Badge.vue"
import TopNavBar from "../layout/TopNavBar.vue"
import Actions from "override/components/flows/Actions.vue"
import resource from "../../models/resource"
import action from "../../models/action"

const flowState = vi.hoisted(() => ({
    flow: {
        id: "my-flow",
        namespace: "company.team",
        deleted: false,
        draft: false,
    } as {id: string; namespace: string; deleted?: boolean; draft?: boolean} | undefined,
}))

const authState = vi.hoisted(() => ({
    isAllowed: vi.fn<(res: string, act: string, ns?: string) => boolean>(),
}))

vi.mock("../../stores/flow", () => ({
    useFlowStore: () => ({
        get flow() {
            return flowState.flow
        },
    }),
}))

vi.mock("override/stores/auth", () => ({
    useAuthStore: () => ({
        user: {
            isAllowed: authState.isAllowed,
        },
    }),
}))

describe("FlowRootTopBar.vue", () => {
    const defaultRouteInfo = {
        title: "my-flow",
        breadcrumb: [
            {label: "Flows", link: {name: "flows/list"}},
            {label: "company.team", link: {name: "flows/list"}},
            {label: "my-flow"},
        ],
        bookmarkLabel: "company.team.my-flow",
    }

    const stubs = {
        NavBar: {
            name: "NavBar",
            props: ["breadcrumb", "title", "bookmarkLabel"],
            template: `
                <div data-test="navbar" :data-title="title" :data-bookmark-label="bookmarkLabel">
                    <slot name="title" />
                    <slot name="actions" />
                </div>
            `,
        },
        TopNavBar: {
            name: "TopNavBar",
            props: ["breadcrumb", "title", "bookmarkLabel"],
            template: `
                <div data-test="navbar" :data-title="title" :data-bookmark-label="bookmarkLabel">
                    <slot name="title" />
                    <slot name="actions" />
                </div>
            `,
        },
        Actions: {
            name: "Actions",
            template: "<div data-test=\"flow-actions\" />",
        },
    }

    function mountTopBar(routeInfo = defaultRouteInfo) {
        return i18nMount(FlowRootTopBar, {
            props: {routeInfo},
            global: {stubs},
        })
    }

    beforeEach(() => {
        flowState.flow = {
            id: "my-flow",
            namespace: "company.team",
            deleted: false,
            draft: false,
        }
        authState.isAllowed.mockReset()
        authState.isAllowed.mockReturnValue(true)
    })

    it("the deleted badge shows only for a deleted flow", () => {
        // Not deleted: no alert icon, no deleted_label, title span does not have body-color
        const wrapperActive = mountTopBar()
        expect(wrapperActive.findComponent(Alert).exists()).toBe(false)
        expect(wrapperActive.text()).not.toContain("deleted_label")
        expect(wrapperActive.find("span.body-color").exists()).toBe(false)

        // Deleted flow
        flowState.flow = {
            id: "my-flow",
            namespace: "company.team",
            deleted: true,
            draft: false,
        }
        const wrapperDeleted = mountTopBar()
        expect(wrapperDeleted.findComponent(Alert).exists()).toBe(true)
        expect(wrapperDeleted.findComponent(Alert).classes()).toContain("text-warning")
        expect(wrapperDeleted.findComponent(Alert).classes()).toContain("me-2")
        expect(wrapperDeleted.text()).toContain("deleted_label")
        expect(wrapperDeleted.find("span.body-color").exists()).toBe(true)
    })

    it("the draft badge shows only for a draft flow", () => {
        // Not draft
        const wrapperPublished = mountTopBar()
        const draftBadgesPublished = wrapperPublished
            .findAllComponents(Badge)
            .filter((b) => b.props("label") === "draft")
        expect(draftBadgesPublished).toHaveLength(0)

        // Draft flow
        flowState.flow = {
            id: "my-flow",
            namespace: "company.team",
            deleted: false,
            draft: true,
        }
        const wrapperDraft = mountTopBar()
        const draftBadges = wrapperDraft
            .findAllComponents(Badge)
            .filter((b) => b.props("label") === "draft")
        expect(draftBadges).toHaveLength(1)
    })

    it("both can show at once", () => {
        flowState.flow = {
            id: "my-flow",
            namespace: "company.team",
            deleted: true,
            draft: true,
        }
        const wrapper = mountTopBar()

        // Deleted indicator present
        expect(wrapper.findComponent(Alert).exists()).toBe(true)
        expect(wrapper.text()).toContain("deleted_label")

        // Draft badge present
        const draftBadges = wrapper
            .findAllComponents(Badge)
            .filter((b) => b.props("label") === "draft")
        expect(draftBadges).toHaveLength(1)
    })

    it("edit actions appear only when the user is allowed to update that flow's namespace", () => {
        authState.isAllowed.mockReturnValue(true)

        const wrapper = mountTopBar()

        expect(authState.isAllowed).toHaveBeenCalledWith(
            resource.FLOW,
            action.UPDATE,
            "company.team",
        )
        // No lock icon
        expect(wrapper.findComponent(Lock).exists()).toBe(false)
        // Actions component is rendered in the actions slot
        expect(wrapper.findComponent(Actions).exists()).toBe(true)
    })

    it("a user with no permission sees the lock rather than the actions", () => {
        authState.isAllowed.mockReturnValue(false)

        const wrapper = mountTopBar()

        expect(authState.isAllowed).toHaveBeenCalledWith(
            resource.FLOW,
            action.UPDATE,
            "company.team",
        )
        // Lock icon is rendered
        const lock = wrapper.findComponent(Lock)
        expect(lock.exists()).toBe(true)
        expect(lock.classes()).toContain("me-2")
        expect(lock.classes()).toContain("gray-700")

        // When flow is deleted, deleted alert takes precedence over lock
        flowState.flow = {
            id: "my-flow",
            namespace: "company.team",
            deleted: true,
            draft: false,
        }
        const wrapperDeleted = mountTopBar()
        expect(wrapperDeleted.findComponent(Alert).exists()).toBe(true)
        expect(wrapperDeleted.findComponent(Lock).exists()).toBe(false)
    })

    it("the route title and breadcrumb are passed through to the nav bar", () => {
        const customRouteInfo = {
            title: "Custom Flow Title",
            breadcrumb: [
                {label: "Dashboard", link: {name: "home"}},
                {label: "Flows", link: {name: "flows/list"}},
                {label: "Custom Flow Title"},
            ],
            bookmarkLabel: "custom.bookmark.label",
            beta: true,
        }

        const wrapper = mountTopBar(customRouteInfo)

        const navBar = wrapper.findComponent(TopNavBar)
        expect(navBar.exists()).toBe(true)
        expect(navBar.props("title")).toBe("Custom Flow Title")
        expect(navBar.props("breadcrumb")).toEqual(customRouteInfo.breadcrumb)
        expect(navBar.props("bookmarkLabel")).toBe("custom.bookmark.label")

        // Title text is rendered
        expect(wrapper.text()).toContain("Custom Flow Title")

        // Beta badge is displayed
        const betaBadges = wrapper
            .findAllComponents(Badge)
            .filter((b) => b.props("label") === "plugins.beta")
        expect(betaBadges).toHaveLength(1)
    })
})
