package main

import (
	"fmt"
	"os"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/wizard"
)

var version = "dev"

func main() {
	if len(os.Args) > 1 && (os.Args[1] == "-v" || os.Args[1] == "--version") {
		fmt.Printf("sortronomy %s\n", version)
		return
	}
	if err := wizard.Run(); err != nil {
		fmt.Fprintln(os.Stderr, "sortronomy:", err)
		os.Exit(1)
	}
}
