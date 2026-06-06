package main

import "fmt"

// banner is the launch wordmark shown once before the interactive wizard and
// the scan: the "sortronomy" ASCII art, the copyright line, and the project
// URL.
const banner = `
╔═╗╔═╗╦═╗╔╦╗╦═╗╔═╗╔╗╔╔═╗╔╦╗╦ ╦
╚═╗║ ║╠╦╝ ║ ╠╦╝║ ║║║║║ ║║║║╚╦╝
╚═╝╚═╝╩╚═ ╩ ╩╚═╚═╝╝╚╝╚═╝╩ ╩ ╩

  © 2026 DB Astro Suite
  https://dbastrosuite.com
`

// printBanner writes the launch banner to stdout, followed by a couple of
// blank lines so the wordmark has breathing room above the first question.
func printBanner() {
	fmt.Print(banner)
	fmt.Print("\n\n")
}
