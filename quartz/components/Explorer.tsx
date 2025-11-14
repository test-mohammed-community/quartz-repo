import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/explorer.scss"

// @ts-ignore
import script from "./scripts/explorer.inline"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"
import { FileTrieNode } from "../util/fileTrie"
import OverflowListFactory from "./OverflowList"
import { concatenateResources } from "../util/resources"

type OrderEntries = "sort" | "filter" | "map"

export interface Options {
  title?: string
  folderDefaultState: "collapsed" | "open"
  folderClickBehavior: "collapse" | "link"
  useSavedState: boolean
  sortFn: (a: FileTrieNode, b: FileTrieNode) => number
  filterFn: (node: FileTrieNode) => boolean
  mapFn: (node: FileTrieNode) => void
  order: OrderEntries[]
}

const defaultOptions: Options = {
  folderDefaultState: "collapsed",
  folderClickBehavior: "link",
  useSavedState: true,
  mapFn: (node) => {
    return node
  },
sortFn: (a, b) => {
  let aWeight = 999
  let aFolderWeight = 999
  let aExplicit = false
  let bWeight = 999
  let bFolderWeight = 999
  let bExplicit = false
  
  if (a.data?.frontmatter?._weight !== undefined) {
    aWeight = a.data.frontmatter._weight
    aFolderWeight = a.data.frontmatter._folderWeight ?? 999
    aExplicit = a.data.frontmatter._explicitOrder
  } else if (a.isFolder && a.children) {
    const child = a.children.find(c => c.slugSegment === "README" || c.slugSegment === "index")
    if (child?.data?.frontmatter?._weight !== undefined) {
      aWeight = child.data.frontmatter._weight
      aFolderWeight = child.data.frontmatter._folderWeight ?? 999
      aExplicit = child.data.frontmatter._explicitOrder
    }
  }
  
  if (b.data?.frontmatter?._weight !== undefined) {
    bWeight = b.data.frontmatter._weight
    bFolderWeight = b.data.frontmatter._folderWeight ?? 999
    bExplicit = b.data.frontmatter._explicitOrder
  } else if (b.isFolder && b.children) {
    const child = b.children.find(c => c.slugSegment === "README" || c.slugSegment === "index")
    if (child?.data?.frontmatter?._weight !== undefined) {
      bWeight = child.data.frontmatter._weight
      bFolderWeight = child.data.frontmatter._folderWeight ?? 999
      bExplicit = child.data.frontmatter._explicitOrder
    }
  }

  console.log(`Comparing: ${a.displayName}(fw:${aFolderWeight}) vs ${b.displayName}(fw:${bFolderWeight})`)

  if (a.children && !b.children) return -1
  if (!a.children && b.children) return 1
  
  if (aFolderWeight !== bFolderWeight) return aFolderWeight - bFolderWeight
  
  if (aExplicit && bExplicit) return aWeight - bWeight
  if (aExplicit && !bExplicit) return -1
  if (!aExplicit && bExplicit) return 1
  
  return a.displayName.localeCompare(b.displayName, undefined, {numeric: true, sensitivity: "base"})
},
  filterFn: (node) => node.slugSegment !== "tags",
  order: ["filter", "map", "sort"],
}

export type FolderState = {
  path: string
  collapsed: boolean
}

let numExplorers = 0
export default ((userOpts?: Partial<Options>) => {
  const opts: Options = { ...defaultOptions, ...userOpts }
  const { OverflowList, overflowListAfterDOMLoaded } = OverflowListFactory()

  const Explorer: QuartzComponent = ({ cfg, displayClass }: QuartzComponentProps) => {
    const id = `explorer-${numExplorers++}`

    return (
      <div
        class={classNames(displayClass, "explorer")}
        data-behavior={opts.folderClickBehavior}
        data-collapsed={opts.folderDefaultState}
        data-savestate={opts.useSavedState}
        data-data-fns={JSON.stringify({
          order: opts.order,
          sortFn: opts.sortFn.toString(),
          filterFn: opts.filterFn.toString(),
          mapFn: opts.mapFn.toString(),
        })}
      >
        <button
          type="button"
          class="explorer-toggle mobile-explorer hide-until-loaded"
          data-mobile={true}
          aria-controls={id}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="lucide-menu"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <button
          type="button"
          class="title-button explorer-toggle desktop-explorer"
          data-mobile={false}
          aria-expanded={true}
        >
          <h2>{opts.title ?? i18n(cfg.locale).components.explorer.title}</h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="5 8 14 8"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="fold"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div id={id} class="explorer-content" aria-expanded={false} role="group">
          <OverflowList class="explorer-ul" />
        </div>
        <template id="template-file">
          <li>
            <a href="#"></a>
          </li>
        </template>
        <template id="template-folder">
          <li>
            <div class="folder-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="5 8 14 8"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="folder-icon"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              <div>
                <button class="folder-button">
                  <span class="folder-title"></span>
                </button>
              </div>
            </div>
            <div class="folder-outer">
              <ul class="content"></ul>
            </div>
          </li>
        </template>
      </div>
    )
  }

  Explorer.css = style
  Explorer.afterDOMLoaded = concatenateResources(script, overflowListAfterDOMLoaded)
  return Explorer
}) satisfies QuartzComponentConstructor
