// Package organize implements the "organize images by date" pipeline.
// It walks a source directory, reads FITS headers, and copies files into a
// structured tree under the output directory.
//
// The pipeline is split into two phases so the wizard can present a review
// screen between them:
//
//  1. BuildPlan — walks the source dir, reads every header, computes
//     destination paths, and returns a Plan describing exactly what would
//     happen if the user confirms.
//  2. ExecutePlan — performs the actual copies + optional FITS FILTER writes
//     using a previously-built Plan.
//
// Run is a convenience wrapper that calls BuildPlan + ExecutePlan in
// sequence for callers that don't need the review step.
package organize

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fsutil"
)

// FilterTag is the user-supplied filter info written into copied FITS files
// when TagFilter is true. All three fields are usually identical, but Name
// goes into the FITS FILTER keyword value, Description goes into the comment,
// and Type is used as the folder label.
type FilterTag struct {
	Type        string
	Name        string
	Description string
}

// DefaultSessionRolloverHour is the original Python behavior: any UTC capture
// at or after 18:00 rolls into the following day's folder. Used as the
// fallback when callers don't set SessionRolloverHour explicitly.
const DefaultSessionRolloverHour = 18

// Options is the full set of user choices collected by the wizard.
type Options struct {
	SourceDir           string
	OutputDir           string
	GroupByFocal        bool
	TagFilter           bool
	Filter              FilterTag
	SessionRolloverHour int // UTC hour, 0..23; 0 means "use default" (18)
	Confirmed           bool
}

// Entry is a single planned src → dst mapping plus the metadata used to
// derive it. ExecutePlan consumes these in order.
type Entry struct {
	Src      string
	Dst      string
	Metadata fits.Metadata
}

// Skip records a file that won't be copied, with a human-readable reason.
type Skip struct {
	Src    string
	Reason string
}

// Plan is the output of BuildPlan: an ordered list of files to copy, files
// to skip with reasons, and aggregate diagnostics for the review screen.
type Plan struct {
	OutputDir  string
	Entries    []Entry
	Skips      []Skip
	Programs   map[fits.Program]int
	TotalFound int
}

// FolderSummary aggregates Entry counts by destination directory for the
// review preview.
type FolderSummary struct {
	Dir   string
	Count int
}

// FolderSummary returns the destination directories sorted by file count
// descending. Used by the wizard to render the "top folders" preview.
func (p Plan) FolderSummary() []FolderSummary {
	byDir := map[string]int{}
	for _, e := range p.Entries {
		byDir[filepath.Dir(e.Dst)]++
	}
	out := make([]FolderSummary, 0, len(byDir))
	for d, n := range byDir {
		out = append(out, FolderSummary{Dir: d, Count: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Dir < out[j].Dir
	})
	return out
}

// BuildPlan walks the source directory, reads each FITS header, and computes
// destination paths. It does not copy any files. The returned Plan can be
// shown to the user for review and then passed to ExecutePlan.
func BuildPlan(opts Options) (Plan, error) {
	if opts.SessionRolloverHour == 0 {
		opts.SessionRolloverHour = DefaultSessionRolloverHour
	}
	abs, err := filepath.Abs(opts.OutputDir)
	if err != nil {
		return Plan{}, err
	}
	opts.OutputDir = abs

	files, err := walkFITS(opts.SourceDir)
	if err != nil {
		return Plan{}, err
	}

	plan := Plan{
		OutputDir:  opts.OutputDir,
		Programs:   map[fits.Program]int{},
		TotalFound: len(files),
	}

	for _, src := range files {
		m, err := fits.ReadMetadata(src)
		if err != nil {
			plan.Skips = append(plan.Skips, Skip{Src: src, Reason: err.Error()})
			continue
		}
		plan.Programs[m.Program]++

		applyFilenameFallback(src, &m)

		dst, reason, ok := planDest(src, opts, m)
		if !ok {
			plan.Skips = append(plan.Skips, Skip{Src: src, Reason: reason})
			continue
		}

		plan.Entries = append(plan.Entries, Entry{Src: src, Dst: dst, Metadata: m})
	}

	return plan, nil
}

// ExecutePlan performs the copies described by plan and (when TagFilter is
// true) writes the FILTER keyword into each copied file. Errors during
// per-file copy are surfaced inline and counted; the function returns an
// error only if any file failed.
func ExecutePlan(plan Plan, opts Options) error {
	if len(plan.Entries) == 0 {
		fmt.Println("Nothing to do.")
		return nil
	}
	fmt.Printf("Organizing %d file(s) under %s\n\n", len(plan.Entries), plan.OutputDir)

	var copied, alreadyExisted, failed int
	for i, e := range plan.Entries {
		exists := fileExists(e.Dst)
		if err := fsutil.CopyFile(e.Src, e.Dst); err != nil {
			fmt.Fprintf(os.Stderr, "  [%d/%d] %s — copy error: %v\n",
				i+1, len(plan.Entries), filepath.Base(e.Src), err)
			failed++
			continue
		}
		if exists {
			fmt.Printf("  [%d/%d] %s — already at %s, left alone\n",
				i+1, len(plan.Entries), filepath.Base(e.Src),
				displayDest(plan.OutputDir, e.Dst))
			alreadyExisted++
			continue
		}
		// Tag-filter mode writes FILTER only on a fresh copy. Re-runs over
		// already-tagged destinations don't keep rewriting the header.
		if opts.TagFilter {
			if err := fits.WriteFilter(e.Dst, opts.Filter.Name, opts.Filter.Description); err != nil {
				fmt.Fprintf(os.Stderr, "  [%d/%d] %s — FILTER write error: %v\n",
					i+1, len(plan.Entries), filepath.Base(e.Dst), err)
				copied++
				failed++
				continue
			}
		}
		fmt.Printf("  [%d/%d] %s → %s\n",
			i+1, len(plan.Entries), filepath.Base(e.Src),
			displayDest(plan.OutputDir, e.Dst))
		copied++
	}

	fmt.Println()
	fmt.Printf("Done. Copied: %d   Already existed: %d   Skipped: %d   Failed: %d\n",
		copied, alreadyExisted, len(plan.Skips), failed)
	if len(plan.Programs) > 0 {
		var labels []string
		for p, n := range plan.Programs {
			labels = append(labels, fmt.Sprintf("%s (%d)", p.DisplayName(), n))
		}
		fmt.Printf("Capture software seen: %s\n", strings.Join(labels, ", "))
	}
	if failed > 0 {
		return fmt.Errorf("%d file(s) failed", failed)
	}
	return nil
}

// Run is the convenience wrapper for callers that don't need a review step.
// It is kept so existing tooling (cmd/inspect) continues to work; the
// wizard now calls BuildPlan + ExecutePlan directly.
func Run(opts Options) error {
	plan, err := BuildPlan(opts)
	if err != nil {
		return err
	}
	if plan.TotalFound == 0 {
		fmt.Println("No FITS files found.")
		return nil
	}
	for _, s := range plan.Skips {
		fmt.Fprintf(os.Stderr, "  %s — skipped: %s\n", filepath.Base(s.Src), s.Reason)
	}
	return ExecutePlan(plan, opts)
}

// applyFilenameFallback mutates m to fill in missing header fields from
// filename parsing. Header values, if present, always take precedence.
func applyFilenameFallback(src string, m *fits.Metadata) {
	if !(m.Target == "" && !isCalibFrame(m.FrameType) ||
		m.Camera == "" ||
		m.DateObs.IsZero() ||
		m.FrameType == "") {
		return
	}
	tok := ParseFilename(filepath.Base(src))
	if m.FrameType == "" {
		m.FrameType = normalizeFrameTypeFromTok(tok.FrameType)
	}
	if m.Target == "" && !isCalibFrame(m.FrameType) {
		m.Target = tok.Target
	}
	if m.Camera == "" {
		m.Camera = tok.Camera
	}
	if m.Filter == "" {
		m.Filter = tok.Filter
	}
	if m.DateObs.IsZero() {
		m.DateObs = tok.DateObs
	}
}

// planDest returns the absolute destination path for src, or (path, reason, false)
// if it should be skipped. Reasons are surfaced in the review screen.
func planDest(src string, opts Options, m fits.Metadata) (string, string, bool) {
	if m.FrameType == "" {
		return "", "missing IMAGETYP", false
	}
	if m.Camera == "" {
		return "", "missing INSTRUME", false
	}
	if m.DateObs.IsZero() {
		return "", "missing or unparseable DATE-OBS", false
	}

	// Filter label for the folder:
	//   - OSC mode (TagFilter): use the user's Type (folder label)
	//   - Otherwise: the FILTER keyword from the header
	var filterLabel string
	if opts.TagFilter {
		filterLabel = opts.Filter.Type
	} else {
		filterLabel = m.Filter
	}
	focalRounded := RoundFocalUp(m.Focal)
	if opts.GroupByFocal && !m.HasFocal {
		return "", "FOCALLEN missing (required for focal-length grouping)", false
	}

	dir := destPath(
		opts.OutputDir,
		m.Camera,
		focalRounded,
		opts.GroupByFocal,
		m.Target,
		m.FrameType,
		AdjustDate(m.DateObs, opts.SessionRolloverHour),
		filterLabel,
	)

	name := filepath.Base(src)
	if opts.TagFilter {
		name = applyFilterSuffix(name, opts.Filter.Name)
	}

	return filepath.Join(dir, name), "", true
}

// fitsExtRe matches the trailing .fit or .fits, case-insensitive.
var fitsExtRe = regexp.MustCompile(`(?i)\.(fits?)$`)

// filterSuffixRe captures the trailing "_f_<anything>" suffix on a basename.
var filterSuffixRe = regexp.MustCompile(`(?i)_f_[^_]+$`)

// applyFilterSuffix appends or replaces the `_f_<filter>` suffix on a FITS
// filename. Matches the Python OSC behavior.
func applyFilterSuffix(name, filter string) string {
	ext := ""
	if loc := fitsExtRe.FindStringIndex(name); loc != nil {
		ext = name[loc[0]:]
		name = name[:loc[0]]
	}
	name = filterSuffixRe.ReplaceAllString(name, "")
	return name + "_f_" + filter + ext
}

func walkFITS(root string) ([]string, error) {
	if info, err := os.Stat(root); err != nil {
		return nil, err
	} else if !info.IsDir() {
		return nil, errors.New("source is not a directory")
	}
	var paths []string
	err := filepath.WalkDir(root, func(p string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		if fits.IsFITS(p) {
			paths = append(paths, p)
		}
		return nil
	})
	return paths, err
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
}

func displayDest(outRoot, full string) string {
	rel, err := filepath.Rel(outRoot, full)
	if err != nil {
		return full
	}
	return rel
}

func isCalibFrame(t string) bool {
	switch t {
	case "Flat", "Dark", "Bias":
		return true
	}
	return false
}

func normalizeFrameTypeFromTok(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	switch {
	case strings.HasPrefix(s, "light"):
		return "Light"
	case strings.HasPrefix(s, "flat"):
		return "Flat"
	case strings.HasPrefix(s, "dark"):
		return "Dark"
	case strings.HasPrefix(s, "bias"), strings.HasPrefix(s, "offset"):
		return "Bias"
	}
	return ""
}
