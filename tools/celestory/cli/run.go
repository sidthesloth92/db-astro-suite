package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/astrofits"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/aggregate"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/cache"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/config"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/model"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/report"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/scan"
	"github.com/sidthesloth92/db-astro-suite/tools/celestory/cli/internal/wizard"
)

// run executes the full pipeline: resolve inputs → scan → aggregate → write
// ledger.json. The result is uploaded to the Celestory web app to visualise.
func run(f cliFlags) error {
	if f.showConfig {
		return showConfig(f)
	}

	interactive := f.input == "" && isInteractive()

	sourceDir := f.input
	baseOut := f.out
	cacheDir := resolveCacheDir()

	if interactive {
		cwd, _ := os.Getwd()
		choices, ok, err := wizard.Run(wizard.Choices{OutputDir: cwd, CacheDir: cacheDir})
		if err != nil {
			return err
		}
		if !ok {
			fmt.Println("Cancelled.")
			return nil
		}
		sourceDir = choices.SourceDir
		baseOut = choices.OutputDir
		if choices.CacheDir != "" {
			cacheDir = choices.CacheDir
		}
		_ = config.Save(config.Config{CacheDir: cacheDir})
	} else if sourceDir == "" {
		flagUsage()
		return errors.New("no folder given: pass -input <dir>, or run with no arguments for the guided wizard")
	}

	jsonPath, err := resolveOutputs(baseOut)
	if err != nil {
		return err
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	var c *cache.Cache
	if !f.noCache {
		c, err = cache.Open(cacheDir, sourceDir, f.verifyHash)
		if err != nil {
			return err
		}
		if f.rebuildCache {
			c.Clear()
		}
	}

	reader := func(p string) (astrofits.Metadata, error) { return astrofits.ReadMetadata(p) }

	res, err := scan.Scan(ctx, scan.Options{
		Root:       sourceDir,
		Reader:     reader,
		Cache:      asScanCache(c),
		OnProgress: makeProgressPrinter(),
	})
	if err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Println("\nCancelled.")
			return nil
		}
		return err
	}
	if res.Total == 0 {
		fmt.Println("No FITS files found under", sourceDir)
		return nil
	}

	ledger := aggregate.Build(res.Frames, res.Skipped, model.ToolInfo{Name: "celestory", Version: version})

	if err := report.WriteFile(jsonPath, ledger); err != nil {
		return err
	}
	printRunSummary(ledger, jsonPath, c)
	saveCache(c)
	return nil
}

func asScanCache(c *cache.Cache) scan.Cache {
	if c == nil {
		return nil
	}
	return c
}

func saveCache(c *cache.Cache) {
	if c == nil {
		return
	}
	if err := c.Save(); err != nil {
		fmt.Fprintln(os.Stderr, "warning: could not write cache:", err)
	}
}

func resolveCacheDir() string {
	if c, err := config.Load(); err == nil && c.CacheDir != "" {
		return c.CacheDir
	}
	return defaultCacheDir()
}

func defaultCacheDir() string {
	if d, err := cache.DefaultDir(); err == nil {
		return d
	}
	return ".celestory-cache"
}

// isInteractive reports whether stdin is a terminal (so the wizard is usable).
func isInteractive() bool {
	fi, err := os.Stdin.Stat()
	if err != nil {
		return false
	}
	return fi.Mode()&os.ModeCharDevice != 0
}

// makeProgressPrinter returns a throttled progress callback for the scan.
func makeProgressPrinter() func(done, total int) {
	var last time.Time
	return func(done, total int) {
		now := time.Now()
		if done < total && now.Sub(last) < 150*time.Millisecond {
			return
		}
		last = now
		fmt.Fprintf(os.Stderr, "\rScanning… %d/%d files", done, total)
		if done >= total {
			fmt.Fprintln(os.Stderr)
		}
	}
}

func showConfig(f cliFlags) error {
	cfgPath, _ := config.Path()
	out := f.out
	if out == "" {
		cwd, _ := os.Getwd()
		out = cwd + "  (current directory — override with -out)"
	}
	fmt.Println("Output location:", out)
	fmt.Println("Cache directory:", resolveCacheDir())
	fmt.Println("Config file:    ", cfgPath)
	return nil
}
