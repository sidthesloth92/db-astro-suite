// Command inspect is a developer-only smoke tool.
// Usage:
//
//	go run ./cmd/inspect read <file.fit>                              # print parsed metadata
//	go run ./cmd/inspect organize <src> <out> [rolloverHour]          # run organize w/o tag-filter
//	go run ./cmd/inspect organize-osc <src> <out> [rolloverHour]      # run organize w/ filter tagging
//
// Not shipped to end users.
package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/organize"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: inspect (read <file>|organize <src> <out> [rolloverHour])")
		os.Exit(2)
	}
	switch os.Args[1] {
	case "read":
		if len(os.Args) < 3 {
			fmt.Fprintln(os.Stderr, "usage: inspect read <file>")
			os.Exit(2)
		}
		m, err := fits.ReadMetadata(os.Args[2])
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		_ = enc.Encode(m)
	case "organize":
		if len(os.Args) < 4 {
			fmt.Fprintln(os.Stderr, "usage: inspect organize <src> <out> [rolloverHour]")
			os.Exit(2)
		}
		err := organize.Run(organize.Options{
			SourceDir:           os.Args[2],
			OutputDir:           os.Args[3],
			GroupByFocal:        true,
			SessionRolloverHour: optionalRollover(4),
			Confirmed:           true,
		})
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	case "organize-osc":
		if len(os.Args) < 4 {
			fmt.Fprintln(os.Stderr, "usage: inspect organize-osc <src> <out>")
			os.Exit(2)
		}
		err := organize.Run(organize.Options{
			SourceDir:    os.Args[2],
			OutputDir:    os.Args[3],
			GroupByFocal: true,
			TagFilter:    true,
			Filter: organize.FilterTag{
				Type:        "UVIR",
				Name:        "UVIR",
				Description: "UV/IR cut",
			},
			Confirmed: true,
		})
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
	default:
		fmt.Fprintln(os.Stderr, "unknown subcommand:", os.Args[1])
		os.Exit(2)
	}
}

// optionalRollover reads an optional integer at os.Args[idx] and returns it,
// or 0 to use the package default (18). Exits if the arg is present but
// not a 0..23 integer.
func optionalRollover(idx int) int {
	if len(os.Args) <= idx {
		return 0
	}
	n, err := strconv.Atoi(os.Args[idx])
	if err != nil || n < 0 || n > 23 {
		fmt.Fprintln(os.Stderr, "rolloverHour must be an integer 0..23")
		os.Exit(2)
	}
	return n
}
