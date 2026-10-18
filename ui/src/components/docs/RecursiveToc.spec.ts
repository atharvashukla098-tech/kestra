import {describe, expect, it} from "vitest"
import {i18nMount} from "../../../tests/unit/i18nMount"
import RecursiveToc from "./RecursiveToc.vue"
import {DISABLED_PAGES} from "./docsUtils"
import "../../utils/global"

describe("RecursiveToc.vue", () => {
    const stubs = {
        KsCollapse: {
            name: "KsCollapse",
            template: "<div class=\"ks-collapse\"><slot /></div>",
        },
        KsCollapseItem: {
            name: "KsCollapseItem",
            props: ["name"],
            template: `
                <div class="ks-collapse-item" :data-name="name">
                    <div class="ks-collapse-title"><slot name="title" /></div>
                    <div class="ks-collapse-content"><slot /></div>
                </div>
            `,
        },
        RouterLink: {
            name: "RouterLink",
            props: ["to"],
            template: "<a :href=\"to.path\"><slot /></a>",
        },
    }

    type RecursiveTocProps = InstanceType<typeof RecursiveToc>["$props"]

    function mountToc(props: RecursiveTocProps) {
        return i18nMount(RecursiveToc, {
            props,
            global: {stubs},
        })
    }

    it("a flat list of children renders one entry each, as links", () => {
        const wrapper = mountToc({
            parent: {
                children: [
                    {path: "docs/getting-started", title: "getting started"},
                    {path: "docs/quickstart", title: "quickstart", sidebarTitle: "quick start guide"},
                ],
            },
        })

        expect(wrapper.findAll(".ks-collapse-item")).toHaveLength(0)
        const links = wrapper.findAll("a")
        expect(links).toHaveLength(2)
        expect(links[0].attributes("href")).toBe("/docs/getting-started")
        expect(links[0].text()).toBe("Getting started")
        expect(links[1].attributes("href")).toBe("/docs/quickstart")
        expect(links[1].text()).toBe("Quick start guide")
    })

    it("a child with its own children renders a collapsible section and recurses into it", () => {
        const wrapper = mountToc({
            parent: {
                children: [
                    {
                        path: "docs/guides",
                        title: "guides",
                        children: [
                            {path: "docs/guides/intro", title: "intro"},
                        ],
                    },
                ],
            },
        })

        const collapseItem = wrapper.find(".ks-collapse-item")
        expect(collapseItem.exists()).toBe(true)
        expect(collapseItem.attributes("data-name")).toBe("docs/guides")

        const parentLink = collapseItem.find(".ks-collapse-title a")
        expect(parentLink.exists()).toBe(true)
        expect(parentLink.attributes("href")).toBe("/docs/guides")
        expect(parentLink.text()).toBe("Guides")

        const childLink = collapseItem.find(".ks-collapse-content a")
        expect(childLink.exists()).toBe(true)
        expect(childLink.attributes("href")).toBe("/docs/guides/intro")
        expect(childLink.text()).toBe("Intro")
        expect(childLink.classes()).toContain("depth-1")

        // Recursed inner collapse is rendered in the content area
        expect(collapseItem.find(".ks-collapse-content .ks-collapse").exists()).toBe(true)
    })

    it("nesting several levels deep renders every level", () => {
        const wrapper = mountToc({
            parent: {
                children: [
                    {
                        path: "level-0",
                        title: "level zero",
                        children: [
                            {
                                path: "level-1",
                                title: "level one",
                                children: [
                                    {
                                        path: "level-2",
                                        title: "level two",
                                        children: [
                                            {path: "level-3", title: "level three"},
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        })

        // All 4 levels are rendered as links with correct paths and text
        const l0 = wrapper.find("a[href='/level-0']")
        expect(l0.exists()).toBe(true)
        expect(l0.text()).toBe("Level zero")
        expect(l0.classes()).toContain("depth-0")

        const l1 = wrapper.find("a[href='/level-1']")
        expect(l1.exists()).toBe(true)
        expect(l1.text()).toBe("Level one")
        expect(l1.classes()).toContain("depth-1")

        const l2 = wrapper.find("a[href='/level-2']")
        expect(l2.exists()).toBe(true)
        expect(l2.text()).toBe("Level two")
        expect(l2.classes()).toContain("depth-2")

        const l3 = wrapper.find("a[href='/level-3']")
        expect(l3.exists()).toBe(true)
        expect(l3.text()).toBe("Level three")
        expect(l3.classes()).toContain("depth-3")
    })

    it("a page listed in DISABLED_PAGES renders as text rather than a link", () => {
        const disabledPath = DISABLED_PAGES[0]
        const wrapper = mountToc({
            parent: {
                children: [
                    {
                        path: disabledPath,
                        title: "api reference",
                        children: [
                            {path: `${disabledPath}/endpoints`, title: "endpoints"},
                        ],
                    },
                ],
            },
        })

        const collapseItem = wrapper.find(".ks-collapse-item")
        expect(collapseItem.exists()).toBe(true)

        const titleSpan = collapseItem.find(".ks-collapse-title span")
        expect(titleSpan.exists()).toBe(true)
        expect(titleSpan.text()).toBe("Api reference")
        expect(collapseItem.find(".ks-collapse-title a").exists()).toBe(false)

        const childLink = collapseItem.find(".ks-collapse-content a")
        expect(childLink.exists()).toBe(true)
        expect(childLink.attributes("href")).toBe(`/${disabledPath}/endpoints`)
    })

    it("makeIndexNavigable: false makes every index render as text", () => {
        const wrapper = mountToc({
            makeIndexNavigable: false,
            parent: {
                children: [
                    {
                        path: "docs/concepts",
                        title: "concepts",
                        children: [
                            {path: "docs/concepts/flows", title: "flows"},
                        ],
                    },
                    {
                        path: "docs/standalone",
                        title: "standalone page",
                    },
                ],
            },
        })

        const collapseItem = wrapper.find(".ks-collapse-item")
        const indexSpan = collapseItem.find(".ks-collapse-title span")
        expect(indexSpan.exists()).toBe(true)
        expect(indexSpan.text()).toBe("Concepts")
        expect(collapseItem.find(".ks-collapse-title a").exists()).toBe(false)

        expect(collapseItem.find(".ks-collapse-content a").exists()).toBe(true)
        const standaloneLink = wrapper.findAll("a").find((l) => l.attributes("href") === "/docs/standalone")
        expect(standaloneLink).toBeDefined()
    })

    it("the depth class increases with nesting", () => {
        const wrapper = mountToc({
            depth: 0,
            parent: {
                children: [
                    {
                        path: "d0",
                        title: "depth zero",
                        children: [
                            {
                                path: "d1",
                                title: "depth one",
                                children: [
                                    {path: "d2", title: "depth two"},
                                ],
                            },
                        ],
                    },
                ],
            },
        })

        expect(wrapper.find(".depth-0").exists()).toBe(true)
        expect(wrapper.find(".depth-1").exists()).toBe(true)
        expect(wrapper.find(".depth-2").exists()).toBe(true)
    })

    it("an empty children list renders nothing without throwing", () => {
        expect(() => {
            const wrapper = mountToc({
                parent: {
                    children: [],
                },
            })
            expect(wrapper.findAll("a")).toHaveLength(0)
            expect(wrapper.findAll(".ks-collapse-item")).toHaveLength(0)
        }).not.toThrow()
    })
})
