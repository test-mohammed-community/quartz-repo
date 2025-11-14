import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"
import { ApplyOrdering } from "./quartz/plugins/transformers/orderFromYAML"
/**
 * Quartz 4 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "Linux Wiki",
    pageTitleSuffix: "OSC",
    enableSPA: true,
    enablePopovers: true,
    analytics: {
      provider: "plausible",
    },
    locale: "en-US",
    baseUrl: "https://oscgeeks.org/",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "modified",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Schibsted Grotesk",
        body: "Source Sans Pro",
        code: "IBM Plex Mono",
      },
      colors: {
        lightMode: {
          light: "#eae7e7ff",
          lightgray: "#e5e5e5",
          gray: "#b8b8b8",
          darkgray: "#121111ff",
          dark: "#151515ff",
          secondary: "#284b63",
          tertiary: "#84a59d",
          highlight: "rgba(143, 159, 169, 0.15)",
          textHighlight: "#fff23688",
        },
darkMode: {
  light: "#030300",
  lightgray: "#1F1F1E",
  gray: "#56564C",
  darkgray: "#d9d6cfff",
  dark: "#e6e3d8ff",
  secondary: "#B9B09F",
  tertiary: "#cbcb5c7d",
  highlight: "rgba(185, 176, 159, 0.12)",
  textHighlight: "#B9B09F44",
},
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      ApplyOrdering(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "git", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({ markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.Favicon(),
      Plugin.NotFoundPage(),
      // Comment out CustomOgImages to speed up build time
       Plugin.CustomOgImages(),
    ],
  },
}

export default config
