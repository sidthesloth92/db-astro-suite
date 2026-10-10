package astrofits

import (
	"regexp"
	"strings"
)

// Program identifies the capture software that produced a FITS file. Used to
// apply program-specific normalization where header conventions differ.
type Program string

// Known capture programs. ProgramUnknown is the resilient fallback — the
// reader still extracts whatever standard keywords are present.
const (
	ProgramUnknown  Program = "unknown"
	ProgramASIAIR   Program = "asiair"
	ProgramNINA     Program = "nina"
	ProgramSharpCap Program = "sharpcap"
	ProgramEkos     Program = "ekos"
	ProgramSGP      Program = "sgp"
	ProgramVoyager  Program = "voyager"
	ProgramAPT      Program = "apt"
)

// DisplayName returns a human-friendly label for the program.
func (p Program) DisplayName() string {
	switch p {
	case ProgramASIAIR:
		return "ASIAIR"
	case ProgramNINA:
		return "N.I.N.A."
	case ProgramSharpCap:
		return "SharpCap"
	case ProgramEkos:
		return "Ekos / KStars"
	case ProgramSGP:
		return "Sequence Generator Pro"
	case ProgramVoyager:
		return "Voyager"
	case ProgramAPT:
		return "APT"
	}
	return "Unknown"
}

// detectProgram inspects the "who wrote this file" header keywords across all
// HDUs and returns a Program, falling back to ProgramUnknown.
func detectProgram(src cardSource) Program {
	val := strings.ToLower(src.str("SWCREATE", "CREATOR", "PROGRAM"))
	if val == "" {
		return ProgramUnknown
	}
	switch {
	case strings.Contains(val, "asiair"):
		return ProgramASIAIR
	case strings.Contains(val, "nina"), strings.Contains(val, "n.i.n.a"):
		return ProgramNINA
	case strings.Contains(val, "sharpcap"):
		return ProgramSharpCap
	case strings.Contains(val, "kstars"), strings.Contains(val, "ekos"):
		return ProgramEkos
	case strings.Contains(val, "sequence generator"), strings.Contains(val, "sgpro"):
		return ProgramSGP
	case strings.Contains(val, "voyager"):
		return ProgramVoyager
	case strings.Contains(val, "astro photography tool"), strings.HasPrefix(val, "apt "):
		return ProgramAPT
	}
	return ProgramUnknown
}

// NormalizeFrameType collapses casing/wording variants across programs:
// "Light", "LIGHT", "Light Frame" all become "Light". Exported so analyzers
// can normalize frame types read elsewhere.
func NormalizeFrameType(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
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
	if s == "" {
		return ""
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

// IsCalibration reports whether a normalized frame type is a calibration frame
// (Flat / Dark / Bias) rather than a Light.
func IsCalibration(frameType string) bool {
	switch frameType {
	case "Flat", "Dark", "Bias":
		return true
	}
	return false
}

var (
	cameraVendorRe    = regexp.MustCompile(`(?i)^\s*(zwo|qhy|atik|player\s*one|svbony)\s+`)
	cameraModelLineRe = regexp.MustCompile(`(?i)^(asi|qhy|atr)`)
	cameraSuffixRe    = regexp.MustCompile(`(?i)[-_\s]+(pro|color|mono|cool|cooled|air|duo|mini|max)$`)
	nonAlnumRe        = regexp.MustCompile(`[^A-Za-z0-9]+`)
)

// NormalizeCamera takes a raw INSTRUME value (e.g. "ZWO ASI2600MM Air") and
// returns the compact canonical label (e.g. "2600MM").
func NormalizeCamera(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	s = cameraVendorRe.ReplaceAllString(s, "")
	s = cameraSuffixRe.ReplaceAllString(s, "")
	s = cameraModelLineRe.ReplaceAllString(s, "")
	s = nonAlnumRe.ReplaceAllString(s, "")
	return s
}
