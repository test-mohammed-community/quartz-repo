import { QuartzTransformerPlugin } from "../types"
import { QuartzPluginData } from "../vfile"
import path from "path"
import fs from "fs"
import yaml from "js-yaml"

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

let orderingData: OrderingStructure | null = null
let orderingMap: Map<string, FileOrderingData> = new Map()

export const ApplyOrdering: QuartzTransformerPlugin<OrderingConfig> = (userOpts) => {
  const opts = { orderingFile: "_ordering.yaml", ...userOpts }

  return {
    name: "ApplyOrdering",
    textTransform(ctx, src) {
      // Load ordering file once on first file
      if (orderingData === null) {
        try {
          const orderingPath = path.join(ctx.argv.directory, opts.orderingFile!)
          
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
      
      return src
    },
    markdownPlugins() {
      return [
        () => {
          return (tree, file) => {
            const data = file.data as QuartzPluginData
            
            if (data.slug && orderingMap.size > 0) {
              const orderingInfo = findOrderingForPath(data.slug, orderingMap)
              
              if (orderingInfo) {
                if (!data.frontmatter) {
                  data.frontmatter = {} as any
                }
                const fm = data.frontmatter as any
                fm._weight = orderingInfo.weight
                fm._folderWeight = orderingInfo.folderWeight
                fm._explicitOrder = orderingInfo.explicitOrder
                
                console.log(`✓ Applied to ${data.slug}: weight=${orderingInfo.weight}`)
              }
            }
          }
        }
      ]
    },
    htmlPlugins() {
      return []
    },
    externalResources() {
      return {}
    }
  }
}

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
        const filePath = path.join(currentPath, item.file).replace(/\\/g, "/")
        const normalizedPath = normalizeFilePath(filePath)
        
        map.set(normalizedPath, {
          weight: weight,
          folderWeight: folderWeights[currentPath] || 999,
          explicitOrder: true
        })
        
        weight += 10
      } else if (item.folder) {
        const folderPath = path.join(currentPath, item.folder).replace(/\\/g, "/")
        const folderWeight = folderWeights[item.folder] || folderWeights[folderPath] || 999
        console.log(`  Folder: ${item.folder}, folderWeight: ${folderWeight}`)
        // Store folder README (not index!)
        const folderReadmePath = normalizeFilePath(path.join(folderPath, "README.md"))
        map.set(folderReadmePath, {
          weight: weight,
          folderWeight: folderWeight,
          explicitOrder: true
        })
        
        console.log(`  Mapped: ${folderReadmePath}`)
        
        weight += 10
        
        // Process items within this folder
        if (item.order && item.order.length > 0) {
          processItems(item.order, folderPath, 0)
        }} else if (item.folder) {
  const folderPath = path.join(currentPath, item.folder).replace(/\\/g, "/")
  const folderWeight = folderWeights[item.folder] || folderWeights[folderPath] || 999
  
  // Store folder README
  const folderReadmePath = normalizeFilePath(path.join(folderPath, "README.md"))
  map.set(folderReadmePath, {
    weight: weight,
    folderWeight: folderWeight,  // Use the weight from folder_weights
    explicitOrder: true
  })
      }
    }

    return weight
  }

  processItems(orderingData.order)
  return map
}
function normalizeFilePath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, "/")
  
  if (normalized.startsWith("/")) {
    normalized = normalized.slice(1)
  }
  
  if (normalized.endsWith(".md")) {
    normalized = normalized.slice(0, -3)
  }
  
  return normalized
}

function findOrderingForPath(
  slugPath: string,
  orderingMap: Map<string, FileOrderingData>
): FileOrderingData | null {
  const normalized = normalizeFilePath(slugPath)
  
  console.log(`  Looking for: "${normalized}"`)
  
  if (orderingMap.has(normalized)) {
    console.log(`    Found exact match!`)
    return orderingMap.get(normalized)!
  }
  
  const withIndex = path.join(normalized, "index").replace(/\\/g, "/")
  console.log(`  Trying with index: "${withIndex}"`)
  if (orderingMap.has(withIndex)) {
    console.log(`    Found with index!`)
    return orderingMap.get(withIndex)!
  }
  
  const parts = normalized.split("/")
  if (parts.length > 1) {
    const parentPath = parts.slice(0, -1).join("/")
    console.log(`  Trying parent: "${parentPath}"`)
    if (orderingMap.has(parentPath)) {
      console.log(`    Found parent!`)
      const parentData = orderingMap.get(parentPath)!
      return {
        weight: 999,
        folderWeight: parentData.folderWeight,
        explicitOrder: false
      }
    }
  }
  
  console.log(`    Not found`)
  return null
}

export default ApplyOrdering