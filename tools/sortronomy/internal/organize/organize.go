// Package organize implements the "organize images by date" pipeline.
// It walks an input directory, reads FITS headers, and copies files into a
// structured tree under the output directory.
//
// The pipeline is split into two phases so the wizard can present a review
// screen between them:
//
//  1. BuildPlan — walks the input dir, reads every header, computes
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
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/sidthesloth92/db-astro-suite/libs/capturetime"
	"github.com/sidthesloth92/db-astro-suite/libs/cliui"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fits"
	"github.com/sidthesloth92/db-astro-suite/tools/sortronomy/internal/fsutil"
)

// FilterTag is the user-supplied filter info written into copied FITS files
// when TagFilter is true. All three fields are usually identical, but Name
// goes into the FITS FILTER keyword value, Description goes into the FILTDESC
// keyword, and Type is used as the folder label.
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
	InputDir      string
	OutputDir     string
	GroupByFocal  bool
	GroupByFilter bool // when true, frames are filed into per-filter subfolders; when false, filter is ignored in the path
	TagFilter     bool
	Filter        FilterTag
	// GroupByDate opts into including the capture date as a folder level in the
	// destination tree. When false, frames land directly in the frameType folder
	// (or the filter subfolder if one is set), with no date component.
	GroupByDate bool
	// GroupSession opts into rolling late captures into the next day's session
	// folder (see sessionTimestamp). When false, frames are filed under their
	// literal DATE-OBS (UTC) capture day.
	GroupSession bool
	// SessionRolloverHour is the cutoff hour 0..23 (0 means "use default", 18).
	// Compared against the frame's LOCAL capture time (from the filename or
	// DATE-LOC, falling back to DATE-OBS). Only applies when GroupSession is true.
	SessionRolloverHour int
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
	OutputDir string
	Entries   []Entry
	Skips     []Skip
	// SoftwareSeen tallies the capture-software label (recognized program name,
	// or the raw creator string, or "Unknown") to file count, for the summary.
	SoftwareSeen map[string]int
	TotalFound   int
	// SessionUTCFallbacks counts session-grouped frames whose date had to fall
	// back to the UTC DATE-OBS header (no local capture time in the filename or
	// DATE-LOC). Their dated folder may be off by the observer's UTC offset.
	SessionUTCFallbacks int
	// SessionUTCFallbackSamples holds a few example base names for the warning.
	SessionUTCFallbackSamples []string
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

// softwareLabels formats a SoftwareSeen tally as "<label> (<count>)" entries,
// sorted by count descending then label ascending for stable output.
func softwareLabels(seen map[string]int) []string {
	type entry struct {
		label string
		count int
	}
	entries := make([]entry, 0, len(seen))
	for label, n := range seen {
		entries = append(entries, entry{label: label, count: n})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].count != entries[j].count {
			return entries[i].count > entries[j].count
		}
		return entries[i].label < entries[j].label
	})
	out := make([]string, len(entries))
	for i, e := range entries {
		out[i] = fmt.Sprintf("%s (%d)", e.label, e.count)
	}
	return out
}

// BuildPlan walks the input directory, reads each FITS header, and computes
// destination paths. It does not copy any files. The returned Plan can be
// shown to the user for review and then passed to ExecutePlan. Scan progress
// is reported as a live line on a terminal (silent when output is piped) so
// the header-reading phase isn't a blank wait.
func BuildPlan(opts Options, log *slog.Logger) (Plan, error) {
	if opts.SessionRolloverHour == 0 {
		opts.SessionRolloverHour = DefaultSessionRolloverHour
	}
	abs, err := filepath.Abs(opts.OutputDir)
	if err != nil {
		return Plan{}, err
	}
	opts.OutputDir = abs

	fmt.Printf("%s %s\n", cliui.Dim.Render("Scanning"), cliui.Value.Render(opts.InputDir)+cliui.Dim.Render(" …"))
	files, err := walkFITS(opts.InputDir)
	if err != nil {
		return Plan{}, err
	}

	plan := Plan{
		OutputDir:    opts.OutputDir,
		SoftwareSeen: map[string]int{},
		TotalFound:   len(files),
	}

	prog := newProgressReporter(os.Stdout, os.Stdout.Fd(), len(files))
	for i, src := range files {
		prog.update(i+1, filepath.Base(src))
		m, err := fits.ReadMetadata(src)
		if err != nil {
			plan.Skips = append(plan.Skips, Skip{Src: src, Reason: err.Error()})
			log.Warn("skipped: unreadable FITS", "file", src, "reason", err.Error())
			continue
		}
		plan.SoftwareSeen[m.SoftwareLabel()]++

		applyFilenameFallback(src, &m)

		sessionTime, source := sessionTimestamp(src, m, opts)
		dst, reason, ok := planDest(src, opts, m, sessionTime)
		if !ok {
			plan.Skips = append(plan.Skips, Skip{Src: src, Reason: reason})
			log.Warn("skipped: incomplete metadata", "file", src, "reason", reason)
			continue
		}
		if opts.GroupSession && source == sourceDateObs {
			plan.SessionUTCFallbacks++
			if len(plan.SessionUTCFallbackSamples) < 5 {
				plan.SessionUTCFallbackSamples = append(plan.SessionUTCFallbackSamples, filepath.Base(src))
			}
			log.Warn("session date fell back to DATE-OBS (UTC)",
				"file", src,
				"hint", "no local capture time in the filename or DATE-LOC; folder date may be off by the UTC offset")
		}
		log.Debug("planned", "file", src, "dst", dst)

		plan.Entries = append(plan.Entries, Entry{Src: src, Dst: dst, Metadata: m})
	}
	prog.clear()

	if opts.GroupSession && plan.SessionUTCFallbacks > 0 {
		printSessionUTCWarning(os.Stdout, plan.SessionUTCFallbacks, plan.SessionUTCFallbackSamples)
	}

	return plan, nil
}

// fileErr records a per-file failure during ExecutePlan or ExecuteDryRun.
// Errors are collected and printed as a block after the run summary, rather
// than interleaved with the progress bar.
type fileErr struct {
	filename string // base name shown to the user
	path     string // full source (or directory) path for context
	reason   string // human-readable error description
}

// ExecutePlan performs the copies described by plan and (when TagFilter is
// true) writes the filter-tag headers into each copied file. Per-file errors are
// collected and printed as a formatted block after the summary line; the
// function returns an error only if any file failed.
func ExecutePlan(plan Plan, opts Options, log *slog.Logger) error {
	if len(plan.Entries) == 0 {
		fmt.Println(cliui.Dim.Render("Nothing to do."))
		return nil
	}
	log.Info("organize start",
		"input", opts.InputDir,
		"output", plan.OutputDir,
		"files", len(plan.Entries),
		"groupByFocal", opts.GroupByFocal,
		"groupSession", opts.GroupSession,
		"tagFilter", opts.TagFilter)
	fmt.Printf("%s %s %s %s\n\n",
		cliui.Dim.Render("Organizing"),
		cliui.OK.Render(fmt.Sprintf("%d file(s)", len(plan.Entries))),
		cliui.Dim.Render("under"),
		cliui.Value.Render(plan.OutputDir),
	)

	prog := newProgressReporter(os.Stdout, os.Stdout.Fd(), len(plan.Entries))
	var copied, alreadyExisted int
	var fileErrs []fileErr
	for i, e := range plan.Entries {
		prog.update(i+1, filepath.Base(e.Src))
		exists := fileExists(e.Dst)
		if err := fsutil.CopyFile(e.Src, e.Dst); err != nil {
			log.Error("copy failed", "file", e.Src, "dst", e.Dst, "err", err)
			fileErrs = append(fileErrs, fileErr{
				filename: filepath.Base(e.Src),
				path:     e.Src,
				reason:   err.Error(),
			})
			continue
		}
		if exists {
			// Counted in the summary; no per-file line so the bar stays compact.
			alreadyExisted++
			continue
		}
		// Tag-filter mode writes FILTER only on a fresh copy. Re-runs over
		// already-tagged destinations don't keep rewriting the header.
		if opts.TagFilter {
			if err := fits.WriteFilter(e.Dst, opts.Filter.Name, opts.Filter.Description); err != nil {
				log.Error("filter write failed", "file", e.Dst, "err", err)
				fileErrs = append(fileErrs, fileErr{
					filename: filepath.Base(e.Dst),
					path:     e.Dst,
					reason:   "FILTER header write failed: " + err.Error(),
				})
				copied++ // the file was copied; only the header write failed
				continue
			}
		}
		copied++
	}
	prog.clear()

	failed := len(fileErrs)
	log.Info("organize complete",
		"copied", copied,
		"alreadyExisted", alreadyExisted,
		"skipped", len(plan.Skips),
		"failed", failed)
	fmt.Println()
	fmt.Printf("%s   %s\n",
		cliui.Heading.Render("✦ Done"),
		strings.Join([]string{
			cliui.OK.Render(fmt.Sprintf("Copied %d", copied)),
			cliui.Dim.Render(fmt.Sprintf("Already existed %d", alreadyExisted)),
			cliui.Count("Skipped", len(plan.Skips), cliui.Warn),
			cliui.Count("Failed", failed, cliui.Fail),
		}, cliui.Dim.Render(" · ")),
	)
	if len(plan.SoftwareSeen) > 0 {
		fmt.Printf("%s %s\n",
			cliui.Dim.Render("Capture software detected:"),
			cliui.Value.Render(strings.Join(softwareLabels(plan.SoftwareSeen), ", ")))
		fmt.Println()
	}
	if failed > 0 {
		printFileErrors(os.Stderr, fileErrs, "could not be processed")
		return fmt.Errorf("%d file(s) failed", failed)
	}
	return nil
}

// ExecuteDryRun is the folders-only counterpart to ExecutePlan: it creates
// every distinct destination directory referenced by the plan so the user can
// inspect the resulting layout, but copies no files and writes no headers. The
// empty folders it leaves behind are harmless — a subsequent real run is
// idempotent and fills them in.
func ExecuteDryRun(plan Plan, opts Options, log *slog.Logger) error {
	if len(plan.Entries) == 0 {
		fmt.Println(cliui.Dim.Render("Nothing to do."))
		return nil
	}
	log.Info("dry run start",
		"input", opts.InputDir,
		"output", plan.OutputDir,
		"files", len(plan.Entries))
	fmt.Printf("%s %s %s %s\n\n",
		cliui.Warn.Render("Dry run"),
		cliui.Dim.Render("— creating folders only under"),
		cliui.Value.Render(plan.OutputDir),
		cliui.Dim.Render("(no files copied)"),
	)

	// Distinct destination directories, sorted for deterministic creation order.
	dirSet := map[string]struct{}{}
	for _, e := range plan.Entries {
		dirSet[filepath.Dir(e.Dst)] = struct{}{}
	}
	dirs := make([]string, 0, len(dirSet))
	for d := range dirSet {
		dirs = append(dirs, d)
	}
	sort.Strings(dirs)

	var created int
	var dirErrs []fileErr
	for _, dir := range dirs {
		if fileExists(dir) {
			continue
		}
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Error("mkdir failed", "dir", dir, "err", err)
			dirErrs = append(dirErrs, fileErr{
				filename: filepath.Base(dir),
				path:     dir,
				reason:   err.Error(),
			})
			continue
		}
		created++
	}

	failed := len(dirErrs)
	log.Info("dry run complete",
		"foldersCreated", created,
		"foldersTotal", len(dirs),
		"files", len(plan.Entries),
		"skipped", len(plan.Skips),
		"failed", failed)
	fmt.Println()
	fmt.Printf("%s   %s %s %s\n",
		cliui.Heading.Render("✦ Dry run complete"),
		cliui.OK.Render(fmt.Sprintf("Created %d folder(s)", created)),
		cliui.Dim.Render(fmt.Sprintf("for %d file(s) under", len(plan.Entries))),
		cliui.Value.Render(plan.OutputDir),
	)
	fmt.Println(cliui.Dim.Render("No files were copied."))
	if len(plan.SoftwareSeen) > 0 {
		fmt.Printf("%s %s\n",
			cliui.Dim.Render("Capture software detected:"),
			cliui.Value.Render(strings.Join(softwareLabels(plan.SoftwareSeen), ", ")))
		fmt.Println()
	}
	if failed > 0 {
		printFileErrors(os.Stderr, dirErrs, "could not be created")
	}
	if failed > 0 {
		return fmt.Errorf("%d folder(s) failed", failed)
	}
	return nil
}

// Run is the convenience wrapper for callers that don't need a review step.
// It is kept so existing tooling (cmd/inspect) continues to work; the
// wizard now calls BuildPlan + ExecutePlan directly.
func Run(opts Options, log *slog.Logger) error {
	plan, err := BuildPlan(opts, log)
	if err != nil {
		log.Error("scan failed", "input", opts.InputDir, "err", err)
		return err
	}
	if plan.TotalFound == 0 {
		log.Info("no FITS files found", "input", opts.InputDir)
		fmt.Println(cliui.Warn.Render("No FITS files found."))
		return nil
	}
	reportSkips(plan)
	return ExecutePlan(plan, opts, log)
}

// DryRun is the folders-only counterpart to Run: it builds the plan and creates
// the destination folder tree without copying any files. Backs the wizard's
// "Dry run" review option and the --dry-run CLI flag, so the user can inspect
// the resulting layout before moving any data.
func DryRun(opts Options, log *slog.Logger) error {
	plan, err := BuildPlan(opts, log)
	if err != nil {
		log.Error("scan failed", "input", opts.InputDir, "err", err)
		return err
	}
	if plan.TotalFound == 0 {
		log.Info("no FITS files found", "input", opts.InputDir)
		fmt.Println(cliui.Warn.Render("No FITS files found."))
		return nil
	}
	reportSkips(plan)
	return ExecuteDryRun(plan, opts, log)
}

// reportSkips prints each planned skip to stderr. Shared by Run and DryRun.
func reportSkips(plan Plan) {
	for _, s := range plan.Skips {
		fmt.Fprintf(os.Stderr, "  %s %s %s\n",
			cliui.Warn.Render(filepath.Base(s.Src)),
			cliui.Dim.Render("— skipped:"),
			cliui.Dim.Render(s.Reason))
	}
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

// sessionTimestamp picks the timestamp used to compute a frame's session date.
//
// Plain date grouping keeps using DATE-OBS. With session grouping on, the cutoff
// must be compared against the observer's LOCAL clock, so the choice is
// delegated to the shared capturetime.PickSessionTime priority chain:
// (1) the local capture time decoded from the filename, (2) the DATE-LOC header
// (local time, written by N.I.N.A.), (3) DATE-OBS (UTC) as a last resort. The
// returned dateSource lets BuildPlan warn when it lands on DATE-OBS.
func sessionTimestamp(src string, m fits.Metadata, opts Options) (time.Time, dateSource) {
	if !opts.GroupSession {
		return m.DateObs, sourceDateObs
	}
	return capturetime.PickSessionTime(src, m.DateLoc, m.DateObs)
}

// printSessionUTCWarning tells the user that some session-grouped frames were
// dated from the UTC DATE-OBS header because no local capture time could be read
// from their filename or DATE-LOC, so their dated folder may be off by the UTC
// offset. Printed once after the scan; details are also in the log file.
func printSessionUTCWarning(w io.Writer, n int, samples []string) {
	fmt.Fprintf(w, "%s %s\n",
		cliui.Warn.Render("⚠"),
		cliui.Warn.Render(fmt.Sprintf("%d file(s): no local capture time in the filename or DATE-LOC — used DATE-OBS (UTC).", n)),
	)
	fmt.Fprintln(w, cliui.Dim.Render("  Their session date may be off by your local UTC offset."))
	if len(samples) > 0 {
		fmt.Fprintln(w, cliui.Dim.Render("  e.g. "+strings.Join(samples, ", ")))
	}
}

// planDest returns the absolute destination path for src, or (path, reason, false)
// if it should be skipped. sessionTime is the timestamp chosen for the dated
// folder (see sessionTimestamp). Reasons are surfaced in the review screen.
func planDest(src string, opts Options, m fits.Metadata, sessionTime time.Time) (string, string, bool) {
	if m.FrameType == "" {
		return "", "missing IMAGETYP", false
	}
	if m.Camera == "" {
		return "", "missing INSTRUME", false
	}
	if sessionTime.IsZero() {
		return "", "missing or unparseable capture date", false
	}

	// Filter label for the folder:
	//   - OSC mode (TagFilter): use the user's Type (folder label)
	//   - Otherwise: the FILTER keyword from the header
	// When GroupByFilter is off the label is discarded so all frames for a
	// target/frameType land in one folder regardless of filter.
	var filterLabel string
	if opts.GroupByFilter {
		if opts.TagFilter {
			filterLabel = opts.Filter.Type
		} else {
			filterLabel = m.Filter
		}
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
		opts.GroupByDate,
		capturetime.SessionDate(sessionTime, opts.GroupSession, opts.SessionRolloverHour),
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
	// Idempotent: if the name already ends with exactly this filter suffix,
	// leave it as-is rather than stripping and re-appending the same token.
	// This also avoids duplicating a suffix whose filter contains an underscore
	// (e.g. "SV_220"), which filterSuffixRe's [^_]+ cannot strip.
	if strings.HasSuffix(name, "_f_"+filter) {
		return name + ext
	}
	name = filterSuffixRe.ReplaceAllString(name, "")
	return name + "_f_" + filter + ext
}

func walkFITS(root string) ([]string, error) {
	if info, err := os.Stat(root); err != nil {
		return nil, err
	} else if !info.IsDir() {
		return nil, errors.New("input is not a directory")
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

// printFileErrors writes a formatted error block to w. Each entry is rendered
// as the filename on one line, followed by indented path and error lines, so
// the output is easy to scan and copy into a bug report.
//
//	2 file(s) could not be processed:
//
//	  frame_0001.fit
//	    Path:  /Volumes/Data/raw/frame_0001.fit
//	    Error: permission denied
func printFileErrors(w io.Writer, errs []fileErr, verb string) {
	fmt.Fprintf(w, "\n%s\n", cliui.Fail.Render(fmt.Sprintf("%d file(s) %s:", len(errs), verb)))
	for _, e := range errs {
		fmt.Fprintf(w, "\n  %s\n", cliui.Value.Render(e.filename))
		fmt.Fprintf(w, "    %s %s\n", cliui.Dim.Render("Path: "), cliui.Dim.Render(e.path))
		fmt.Fprintf(w, "    %s %s\n", cliui.Dim.Render("Error:"), cliui.Fail.Render(e.reason))
	}
}

func fileExists(p string) bool {
	_, err := os.Stat(p)
	return err == nil
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
