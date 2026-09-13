package organize

import (
	"math"
	"path/filepath"
)

// RoundFocalUp rounds the focal length up to the next multiple of 5 mm,
// matching the Python behavior.
func RoundFocalUp(mm float64) int {
	if mm <= 0 {
		return 0
	}
	return int(math.Ceil(mm/5.0)) * 5
}

// destPath builds the absolute destination directory for a single frame.
//
// Layout:
//
//	<out>/<camera>[/<focal>]/<target or "_Calibration Frames">/<frameType>[/<date|filter|date - filter>/]
//
// focalDir is included only when groupByFocal is true and focal > 0.
// When groupByDate is true the date (and filter, if set) forms the leaf folder.
// When groupByDate is false only the filter label is used as the leaf; if there
// is no filter either, files land directly in the frameType folder.
func destPath(
	out, camera string,
	focal int,
	groupByFocal bool,
	target, frameType string,
	groupByDate bool,
	date, filterLabel string,
) string {
	parts := []string{out, camera}
	if groupByFocal && focal > 0 {
		parts = append(parts, intStr(focal))
	}
	if target == "" {
		parts = append(parts, "_Calibration Frames")
	} else {
		parts = append(parts, target)
	}
	parts = append(parts, frameType)

	var leaf string
	if groupByDate && date != "" {
		if filterLabel != "" {
			leaf = date + " - " + filterLabel
		} else {
			leaf = date
		}
	} else if filterLabel != "" {
		leaf = filterLabel
	}
	if leaf != "" {
		parts = append(parts, leaf)
	}
	return filepath.Join(parts...)
}

// intStr renders an int without strconv to keep the helper file self-contained.
func intStr(i int) string {
	if i == 0 {
		return "0"
	}
	neg := i < 0
	if neg {
		i = -i
	}
	var buf [20]byte
	pos := len(buf)
	for i > 0 {
		pos--
		buf[pos] = byte('0' + i%10)
		i /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}
