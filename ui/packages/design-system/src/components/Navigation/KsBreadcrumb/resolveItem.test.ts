import {describe, it, expect, vi} from "vitest"
import {RouterLink} from "vue-router"
import {resolveItem} from "./resolveItem"
import type {KsBreadcrumbItem} from "./types"

describe("resolveItem", () => {
    it("resolves a disabled item to a span with no attributes, even when it also has a link", () => {
        const item: KsBreadcrumbItem = {
            label: "Home",
            disabled: true,
            link: "/home",
            onClick: vi.fn(),
        }

        const resolved = resolveItem(item)
        expect(resolved.tag).toBe("span")
        expect(resolved.attrs).toEqual({})
    })

    it("resolves an item with a link to RouterLink with to set", () => {
        const item: KsBreadcrumbItem = {
            label: "Flows",
            link: {name: "flows/list"},
        }

        const resolved = resolveItem(item)
        expect(resolved.tag).toBe(RouterLink)
        expect(resolved.attrs).toEqual({to: {name: "flows/list"}})
    })

    it("resolves an item with only an onClick to an a tag with href='#'", () => {
        const onClick = vi.fn()
        const item: KsBreadcrumbItem = {
            label: "Action",
            onClick,
        }

        const resolved = resolveItem(item)
        expect(resolved.tag).toBe("a")
        expect(resolved.attrs.href).toBe("#")
        expect(typeof resolved.attrs.onClick).toBe("function")
    })

    it("calls preventDefault and the item's own onClick in the click handler", () => {
        const onClick = vi.fn()
        const item: KsBreadcrumbItem = {
            label: "Action",
            onClick,
        }

        const resolved = resolveItem(item)
        const event = {preventDefault: vi.fn()} as unknown as Event

        const handler = resolved.attrs.onClick as (e: Event) => void
        handler(event)

        expect(event.preventDefault).toHaveBeenCalledTimes(1)
        expect(onClick).toHaveBeenCalledTimes(1)
    })

    it("resolves an item with neither link nor onClick to a plain span", () => {
        const item: KsBreadcrumbItem = {
            label: "Current Step",
        }

        const resolved = resolveItem(item)
        expect(resolved.tag).toBe("span")
        expect(resolved.attrs).toEqual({})
    })

    it("prioritizes link over onClick when both are present", () => {
        const onClick = vi.fn()
        const item: KsBreadcrumbItem = {
            label: "Dashboard",
            link: "/dashboard",
            onClick,
        }

        const resolved = resolveItem(item)
        expect(resolved.tag).toBe(RouterLink)
        expect(resolved.attrs).toEqual({to: "/dashboard"})
        expect(onClick).not.toHaveBeenCalled()
    })
})
