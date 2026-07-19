package main

import (
	"fmt"

	"github.com/sidthesloth92/db-astro-suite/libs/cliui"
)

// bannerArt is the "sortronomy" ASCII wordmark, one row per slice element so
// each row can be tinted along the shared brand gradient.
var bannerArt = []string{
	"╔═╗╔═╗╦═╗╔╦╗╦═╗╔═╗╔╗╔╔═╗╔╦╗╦ ╦",
	"╚═╗║ ║╠╦╝ ║ ╠╦╝║ ║║║║║ ║║║║╚╦╝",
	"╚═╝╚═╝╩╚═ ╩ ╩╚═╚═╝╝╚╝╚═╝╩ ╩ ╩",
}

// printBanner writes the launch wordmark — the tinted "sortronomy" ASCII art
// plus a dimmed copyright and project URL — followed by blank lines so the
// wordmark has breathing room above the first question.
func printBanner() {
	fmt.Println()
	fmt.Println(cliui.RenderWordmark(bannerArt))
	fmt.Println()
	fmt.Println("  " + cliui.BannerFooter.Render("© 2026 DB Astro Suite"))
	fmt.Println("  " + cliui.BannerFooter.Render("https://dbastrosuite.com"))
	fmt.Print("\n\n")
}
