import { QuartzTransformerPlugin } from "../types"
import { QuartzPluginData } from "../vfile"
import path from "path"
import fs from "fs"
import yaml from "js-yaml"
// import { BuildCtx } from "../ctx"

interface OrderingStructure {
  order?: OrderItem[]
  folder_weights?: Record<string, number>
}

interface OrderItem {
  file?: string
  folder?: string
  order?: OrderItem[]
}

interface OrderingConfig {
  orderingFile?: string
}

interface FileOrderingData {
  weight: number
  folderWeight: number
  explicitOrder: boolean
}

export const ApplyOrdering: QuartzTransformerPlugin<OrderingConfig> = (userOpts) => {
  const opts = { orderingFile: "_ordering.yaml", ...userOpts }
  
  let orderingData: OrderingStructure | null = null
  let orderingMap: Map<string, FileOrderingData> = new Map()

  return {
    name: "ApplyOrdering",
    markdownPlugins() {
      return []
    },
    htmlPlugins() {
      return []
    },
    externalResources() {
      return {}
    },
   async markup(_ctx: any, data: QuartzPluginData)  { 
      // Load ordering file once on first run
      if (orderingData === null) {
        try {
          const orderingPath = path.join(_ctx.argv.directory, opts.orderingFile!)
          
          if (fs.existsSync(orderingPath)) {
            const fileContent = fs.readFileSync(orderingPath, "utf8")
            orderingData = yaml.load(fileContent) as OrderingStructure
            
            // Build the ordering map
            orderingMap = buildOrderingMap(orderingData)
            
            console.log(`✓ Loaded ordering from ${opts.orderingFile}`)
          } else {
            console.warn(`⚠ Ordering file not found: ${orderingPath}`)
            orderingData = {}
          }
        } catch (error) {
          console.error("Error loading ordering file:", error)
          orderingData = {}
        }
      }

      // Apply ordering data to this file
      if (data.slug && orderingMap.size > 0) {
        const filePath = data.slug
        const orderingInfo = findOrderingForPath(filePath, orderingMap)
        
        if (orderingInfo) {
          // Add ordering metadata to frontmatter
          if (!data.frontmatter) {
            data.frontmatter = {}
          }
          
          data.frontmatter._weight = orderingInfo.weight
          data.frontmatter._folderWeight = orderingInfo.folderWeight
          data.frontmatter._explicitOrder = orderingInfo.explicitOrder
        }
      }

      return data
    }
  }
}

/**
 * Build a map of file paths to their ordering information
 */
function buildOrderingMap(orderingData: OrderingStructure): Map<string, FileOrderingData> {
  const map = new Map<string, FileOrderingData>()
  const folderWeights = orderingData.folder_weights || {}

  function processItems(
    items: OrderItem[] | undefined,
    currentPath: string = "",
    startWeight: number = 0
  ): number {
    if (!items) return startWeight

    let weight = startWeight

    for (const item of items) {
      if (item.file) {
        // Handle file
        const filePath = path.join(currentPath, item.file).replace(/\\/g, "/")
        const normalizedPath = normalizeFilePath(filePath)
        
        map.set(normalizedPath, {
          weight: weight,
          folderWeight: folderWeights[currentPath] || 999,
          explicitOrder: true
        })
        
        weight += 10 // Increment by 10 to allow for insertions
      } else if (item.folder) {
        // Handle folder
        const folderPath = path.join(currentPath, item.folder).replace(/\\/g, "/")
        const folderWeight = folderWeights[item.folder] || folderWeights[folderPath] || 999
        
        // Process items within this folder
        if (item.order) {
          processItems(item.order, folderPath, 0)
        }
        
        // Store folder metadata (for index files)
        const folderIndexPath = normalizeFilePath(path.join(folderPath, "index.md"))
        if (!map.has(folderIndexPath)) {
          map.set(folderIndexPath, {
            weight: 0,
            folderWeight: folderWeight,
            explicitOrder: true
          })
        }
      }
    }

    return weight
  }

  processItems(orderingData.order)
  return map
}

/**
 * Normalize file path (remove .md extension, handle index files)
 */
function normalizeFilePath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, "/")
  
  // Remove leading slash
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  
  // Remove .md extension if present
  if (normalized.endsWith(".md")) {
    normalized = normalized.slice(0, -3)
  }
  
  return normalized
}

/**
 * Find ordering information for a given file path
 */
function findOrderingForPath(
  slugPath: string,
  orderingMap: Map<string, FileOrderingData>
): FileOrderingData | null {
  // Try exact match
  const normalized = normalizeFilePath(slugPath)
  
  if (orderingMap.has(normalized)) {
    return orderingMap.get(normalized)!
  }
  
  // Try with index
  const withIndex = path.join(normalized, "index").replace(/\\/g, "/")
  if (orderingMap.has(withIndex)) {
    return orderingMap.get(withIndex)!
  }
  
  // Try parent folder
  const parts = normalized.split("/")
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join("/")
    if (orderingMap.has(parentPath)) {
      const parentData = orderingMap.get(parentPath)!
      return {
        weight: 999, // Not explicitly ordered, so put at end
        folderWeight: parentData.folderWeight,
        explicitOrder: false
      }
    }
  }
  
  return null
}

// Export default for Quartz compatibility
export default ApplyOrdering