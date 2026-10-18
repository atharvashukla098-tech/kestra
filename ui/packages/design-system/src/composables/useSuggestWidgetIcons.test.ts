import {describe, it, expect, vi, beforeEach, afterEach} from "vitest"
import {defineComponent, h, ref} from "vue"
import {
    useSuggestWidgetIcons,
    suggestionLabel,
    type SuggestWidgetIconsContext,
} from "./useSuggestWidgetIcons"
import {OVERFLOW_WIDGETS_ID} from "../utils/monacoSetup"

const FakeTaskIcon = defineComponent({
    name: "TaskIcon",
    props: {
        cls: {type: String, required: true},
        onlyIcon: {type: Boolean, default: false},
        loadIcon: {type: Function, default: undefined},
    },
    setup(props) {
        return () => h("span", {"data-test-cls": props.cls, class: "fake-task-icon"}, props.cls)
    },
})

describe("useSuggestWidgetIcons", () => {
    let overflowContainer: HTMLElement
    let suggestWidget: HTMLElement
    let context: SuggestWidgetIconsContext
    let hook: ReturnType<typeof useSuggestWidgetIcons>

    beforeEach(() => {
        document.body.innerHTML = ""

        overflowContainer = document.createElement("div")
        overflowContainer.id = OVERFLOW_WIDGETS_ID
        const overflowing = document.createElement("div")
        overflowing.className = "overflowingContentWidgets"
        overflowContainer.appendChild(overflowing)
        document.body.appendChild(overflowContainer)

        suggestWidget = document.createElement("div")
        suggestWidget.className = "suggest-widget"
        const sash = document.createElement("div")
        sash.className = "monaco-sash vertical disabled"
        suggestWidget.appendChild(sash)

        context = {
            taskIcon: FakeTaskIcon,
            loadTaskIcon: ref(vi.fn().mockResolvedValue(undefined)),
            largeSuggestions: ref(false),
            codeEditor: () => undefined,
            datePicker: {
                show: vi.fn().mockResolvedValue(undefined),
                remove: vi.fn(),
            },
        }

        hook = useSuggestWidgetIcons(context)
    })

    afterEach(() => {
        hook.teardown()
        document.body.innerHTML = ""
        vi.restoreAllMocks()
    })

    function createRow(id: string, index: number, label: string, detailPackage?: string): HTMLElement {
        const row = document.createElement("div")
        row.id = id
        row.className = "monaco-list-row"
        row.setAttribute("data-index", String(index))

        const vsCodeIcon = document.createElement("div")
        vsCodeIcon.className = "suggest-icon"
        row.appendChild(vsCodeIcon)

        const nameContainer = document.createElement("div")
        nameContainer.className = "monaco-icon-name-container"
        nameContainer.textContent = label
        row.appendChild(nameContainer)

        if (detailPackage) {
            const detailsLabel = document.createElement("div")
            detailsLabel.className = "details-label"
            detailsLabel.textContent = detailPackage
            row.appendChild(detailsLabel)
        }

        return row
    }

    it("an entry whose label maps to a known plugin gets its icon", async () => {
        const row = createRow("row-1", 0, "io.kestra.plugin.core.log.Log")
        suggestWidget.appendChild(row)

        hook.observeAndResize()

        const overflowing = overflowContainer.querySelector(".overflowingContentWidgets")!
        overflowing.appendChild(suggestWidget)

        await vi.waitFor(() => {
            const iconWrapper = row.querySelector(".kestra-icon-wrapper")
            expect(iconWrapper).not.toBeNull()
            expect(iconWrapper?.textContent).toContain("io.kestra.plugin.core.log.Log")
        })

        const vsCodeIcon = row.querySelector(".suggest-icon") as HTMLElement
        expect(vsCodeIcon.style.display).toBe("none")
    })

    it("reconstructs the FQCN from the details label when the label was split", async () => {
        const row = createRow("row-split", 0, "Log", "io.kestra.plugin.core.log")
        suggestWidget.appendChild(row)

        hook.observeAndResize()
        const overflowing = overflowContainer.querySelector(".overflowingContentWidgets")!
        overflowing.appendChild(suggestWidget)

        await vi.waitFor(() => {
            const iconWrapper = row.querySelector(".kestra-icon-wrapper")
            expect(iconWrapper).not.toBeNull()
            expect(iconWrapper?.textContent).toContain("io.kestra.plugin.core.log.Log")
        })
    })

    it("an entry with no matching plugin is left alone", async () => {
        const row = createRow("row-non-plugin", 0, "simpleVariable")
        suggestWidget.appendChild(row)

        hook.observeAndResize()
        const overflowing = overflowContainer.querySelector(".overflowingContentWidgets")!
        overflowing.appendChild(suggestWidget)

        await new Promise((r) => setTimeout(r, 50))

        const iconWrapper = row.querySelector(".kestra-icon-wrapper")
        expect(iconWrapper).toBeNull()

        const vsCodeIcon = row.querySelector(".suggest-icon") as HTMLElement
        expect(vsCodeIcon.style.display).toBe("")
    })

    it("the icon is not injected twice for the same entry", async () => {
        const row = createRow("row-dup", 0, "io.kestra.plugin.core.log.Log")
        suggestWidget.appendChild(row)

        hook.observeAndResize()
        const overflowing = overflowContainer.querySelector(".overflowingContentWidgets")!
        overflowing.appendChild(suggestWidget)

        await vi.waitFor(() => {
            expect(row.querySelectorAll(".kestra-icon-wrapper")).toHaveLength(1)
        })

        row.appendChild(document.createTextNode("update"))
        await new Promise((r) => setTimeout(r, 50))

        expect(row.querySelectorAll(".kestra-icon-wrapper")).toHaveLength(1)
    })

    it("the observer is disconnected on teardown", () => {
        const disconnectSpy = vi.spyOn(MutationObserver.prototype, "disconnect")

        hook.observeAndResize()
        hook.teardown()

        expect(disconnectSpy).toHaveBeenCalled()
    })

    it("no suggest widget present is a no-op", () => {
        document.body.innerHTML = ""

        expect(() => {
            hook.observeAndResize()
            hook.teardown()
        }).not.toThrow()
    })
})

describe("suggestionLabel", () => {
    it("reads rendered label from monaco-icon-name-container", () => {
        const row = document.createElement("div")
        const nameContainer = document.createElement("div")
        nameContainer.className = "monaco-icon-name-container"
        nameContainer.textContent = "myTask"
        row.appendChild(nameContainer)

        expect(suggestionLabel(row)).toBe("myTask")
    })

    it("combines package and task name when details-label has a valid plugin FQCN", () => {
        const row = document.createElement("div")
        const nameContainer = document.createElement("div")
        nameContainer.className = "monaco-icon-name-container"
        nameContainer.textContent = "Bash"
        row.appendChild(nameContainer)

        const details = document.createElement("div")
        details.className = "details-label"
        details.textContent = "io.kestra.plugin.scripts.bash"
        row.appendChild(details)

        expect(suggestionLabel(row)).toBe("io.kestra.plugin.scripts.bash.Bash")
    })

    it("does not combine package if row has string-label class", () => {
        const row = document.createElement("div")
        row.className = "string-label"
        const nameContainer = document.createElement("div")
        nameContainer.className = "monaco-icon-name-container"
        nameContainer.textContent = "Bash"
        row.appendChild(nameContainer)

        const details = document.createElement("div")
        details.className = "details-label"
        details.textContent = "io.kestra.plugin.scripts.bash"
        row.appendChild(details)

        expect(suggestionLabel(row)).toBe("Bash")
    })

    it("falls back to aria-label when monaco-icon-name-container is absent", () => {
        const row = document.createElement("div")
        row.setAttribute("aria-label", "myLabel, Property, docs: info")

        expect(suggestionLabel(row)).toBe("myLabel")
    })
})
