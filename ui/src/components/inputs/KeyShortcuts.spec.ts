import {beforeEach, describe, expect, it} from "vitest"
import {i18nMount} from "../../../tests/unit/i18nMount"
import KeyShortcuts from "./KeyShortcuts.vue"
import {useKeyShortcuts} from "../../utils/useKeyShortcuts"

describe("KeyShortcuts.vue", () => {
    const {showKeyShortcuts, hideKeyShortcuts} = useKeyShortcuts()

    const stubs = {
        KsDialog: {
            name: "KsDialog",
            props: ["modelValue", "headerClass", "bodyClass"],
            template: `
                <div v-if="modelValue" data-test="dialog" :class="[headerClass, bodyClass]">
                    <div class="dialog-header-slot"><slot name="header" /></div>
                    <div class="dialog-body-slot"><slot /></div>
                </div>
            `,
        },
        KsTag: {
            name: "KsTag",
            template: "<span class=\"ks-tag\"><slot /></span>",
        },
        KsIcon: {
            name: "KsIcon",
            template: "<span class=\"ks-icon\"><slot /></span>",
        },
    }

    function mountShortcuts() {
        return i18nMount(KeyShortcuts, {
            global: {stubs},
        })
    }

    beforeEach(() => {
        hideKeyShortcuts()
    })

    it("does not render dialog content when isKeyShortcutsDialogShown is false", () => {
        hideKeyShortcuts()
        const wrapper = mountShortcuts()
        expect(wrapper.find("[data-test='dialog']").exists()).toBe(false)
    })

    it("renders dialog with custom header and body classes when shown", () => {
        showKeyShortcuts()
        const wrapper = mountShortcuts()

        const dialog = wrapper.find("[data-test='dialog']")
        expect(dialog.exists()).toBe(true)
        expect(dialog.classes()).toContain("shortcuts-dialog-header")
        expect(dialog.classes()).toContain("shortcuts-dialog-body")
    })

    it("renders header with icon and label", () => {
        showKeyShortcuts()
        const wrapper = mountShortcuts()

        const header = wrapper.find(".shortcuts-header")
        expect(header.exists()).toBe(true)
        expect(header.find(".shortcuts-header-title").text()).toBe("editor_shortcuts.label")
    })

    it("renders shortcut rows with keys and descriptions", () => {
        showKeyShortcuts()
        const wrapper = mountShortcuts()

        const rows = wrapper.findAll(".shortcut-row")
        expect(rows.length).toBeGreaterThan(0)

        // First command: Ctrl + SPACE
        const firstRow = rows[0]
        const tags = firstRow.findAll(".ks-tag")
        expect(tags).toHaveLength(2)
        expect(tags[0].text()).toBe("Ctrl")
        expect(tags[1].text()).toBe("SPACE")

        const separator = firstRow.find(".key-separator")
        expect(separator.exists()).toBe(true)
        expect(separator.text()).toBe("+")

        expect(firstRow.find(".shortcut-description").text()).toBe("editor_shortcuts.trigger_autocompletion")
    })
})
