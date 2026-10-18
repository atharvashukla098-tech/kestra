import {describe, expect, it, vi} from "vitest"
import {mount} from "@vue/test-utils"
import Empty from "./Empty.vue"
import {KsEmptyState, KsButton} from "@kestra-io/design-system"
import {images} from "./images"
import {links} from "./links"
import generic from "../../../assets/empty_visuals/generic.svg"

const knownTranslations: Record<string, string> = {
    "empty.triggers.title": "Triggers",
    "empty.triggers.content": "No triggers found for this flow.",
    "demos.contact_sales": "Contact Sales",
}

vi.mock("vue-i18n", () => ({
    useI18n: () => ({
        t: (key: string) => knownTranslations[key] ?? key,
        te: (key: string) => Object.prototype.hasOwnProperty.call(knownTranslations, key),
    }),
}))

function mountEmpty(props: InstanceType<typeof Empty>["$props"], slots?: Record<string, string>) {
    return mount(Empty, {
        props,
        slots,
        global: {
            mocks: {
                $t: (key: string) => knownTranslations[key] ?? key,
                $te: (key: string) => Object.prototype.hasOwnProperty.call(knownTranslations, key),
            },
        },
    })
}

describe("Empty.vue", () => {
    it("an explicit title and description win over the translation lookup", () => {
        const wrapper = mountEmpty({
            type: "triggers",
            title: "Custom Explicit Title",
            description: "Custom Explicit Description",
        })

        const emptyState = wrapper.findComponent(KsEmptyState)
        expect(emptyState.props("title")).toBe("Custom Explicit Title")
        expect(emptyState.props("description")).toBe("Custom Explicit Description")
    })

    it("with no title or description props it falls back to empty.<type>.title and empty.<type>.content when those keys exist", () => {
        const wrapper = mountEmpty({type: "triggers"})

        const emptyState = wrapper.findComponent(KsEmptyState)
        expect(emptyState.props("title")).toBe("Triggers")
        expect(emptyState.props("description")).toBe("No triggers found for this flow.")
    })

    it("a type with no translation keys renders without a title or description, not the raw key", () => {
        const wrapper = mountEmpty({type: "untranslatedType"})

        const emptyState = wrapper.findComponent(KsEmptyState)
        expect(emptyState.props("title")).toBeUndefined()
        expect(emptyState.props("description")).toBeUndefined()
    })

    it("learnMore falls back to the docs link for that type", () => {
        const wrapper = mountEmpty({type: "namespaceFiles"})

        const emptyState = wrapper.findComponent(KsEmptyState)
        expect(emptyState.props("learnMore")).toBe(links.namespaceFiles)
        expect(emptyState.props("learnMore")).toContain("https://kestra.io/docs/concepts/namespace-files")

        // Explicit learnMore wins over the predefined links map
        const customWrapper = mountEmpty({
            type: "namespaceFiles",
            learnMore: "https://custom.documentation.url",
        })
        expect(customWrapper.findComponent(KsEmptyState).props("learnMore")).toBe("https://custom.documentation.url")
    })

    it("a type with no docs link renders no learn-more", () => {
        const wrapper = mountEmpty({type: "typeWithoutDocs"})

        const emptyState = wrapper.findComponent(KsEmptyState)
        expect(emptyState.props("learnMore")).toBeUndefined()
    })

    it("the image is picked by type, falling back to the generic one", () => {
        const announcementWrapper = mountEmpty({type: "announcements"})
        expect(announcementWrapper.findComponent(KsEmptyState).props("image")).toBe(images.announcements)

        const fallbackWrapper = mountEmpty({type: "typeWithoutSpecificImage"})
        expect(fallbackWrapper.findComponent(KsEmptyState).props("image")).toBe(generic)
    })

    it("demoCta controls the contact-sales link, whose URL carries the type", () => {
        const withoutCta = mountEmpty({type: "assets", demoCta: false})
        const salesLinkWithout = withoutCta
            .findAllComponents(KsButton)
            .find((btn) => btn.attributes("href")?.includes("/demo?"))
        expect(salesLinkWithout).toBeUndefined()

        const withCta = mountEmpty({type: "assets", demoCta: true})
        const salesLinkWith = withCta
            .findAllComponents(KsButton)
            .find((btn) => btn.attributes("href")?.includes("/demo?"))
        expect(salesLinkWith).toBeDefined()
        expect(salesLinkWith?.attributes("href")).toBe(
            "https://kestra.io/demo?utm_source=app&utm_medium=referral&utm_campaign=demo-assets",
        )
        expect(salesLinkWith?.attributes("target")).toBe("_blank")
        expect(salesLinkWith?.text()).toBe("Contact Sales")
    })

    it("renders custom slot contents for description, button, and content", () => {
        const wrapper = mountEmpty(
            {type: "triggers"},
            {
                description: "<span class='custom-desc'>Custom Slot Desc</span>",
                button: "<button class='custom-btn'>Custom Button</button>",
                content: "<div class='custom-content'>Custom Content</div>",
            },
        )

        expect(wrapper.find(".custom-desc").text()).toBe("Custom Slot Desc")
        expect(wrapper.find(".custom-btn").text()).toBe("Custom Button")
        expect(wrapper.find(".custom-content").text()).toBe("Custom Content")
    })
})
