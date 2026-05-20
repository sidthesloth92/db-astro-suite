package fits

import (
	"regexp"
	"strings"

	"github.com/astrogo/fitsio"
)

// Program identifies the capture software that produced a FITS file.
// Used to apply program-specific normalization where header conventions
// differ between tools.
type Program string

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

// detectProgram inspects the standard "who wrote this file" header keywords
// and returns a Program. Fallback is ProgramUnknown — ASIAIR conventions
// are assumed downstream when this is the case (dominant user base).
func detectProgram(hdr *fitsio.Header) Program {
	for _, key := range []string{"SWCREATE", "CREATOR", "PROGRAM"} {
		val := strings.ToLower(stringCard(hdr, key))
		if val == "" {
			continue
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
	}
	return ProgramUnknown
}

// normalizeFrameType collapses the casing/wording variants across programs.
// "Light", "LIGHT", "Light Frame" all become "Light".
func normalizeFrameType(s string) string {
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
	// Preserve unknown values as-is (capitalize first letter) so they
	// at least produce a folder rather than crash.
	return strings.ToUpper(s[:1]) + s[1:]
}

var (
	// Strip vendor prefixes.
	cameraVendorRe = regexp.MustCompile(`(?i)^\s*(zwo|qhy|atik|player\s*one|svbony)\s+`)
	// Strip ASI / model-line prefix so "ASI2600MM" -> "2600MM".
	cameraModelLineRe = regexp.MustCompile(`(?i)^(asi|qhy|atr)`)
	// Strip variant / form-factor suffixes.
	cameraSuffixRe = regexp.MustCompile(`(?i)[-_\s]+(pro|color|mono|cool|cooled|air|duo|mini|max)$`)
	nonAlnumRe     = regexp.MustCompile(`[^A-Za-z0-9]+`)
)

// normalizeCamera takes a raw INSTRUME value (e.g. "ZWO ASI2600MM Air") and
// returns the compact canonical label this tool uses for folder names
// (e.g. "2600MM"). The Python scripts use the same convention by parsing
// it out of the filename — header-derived normalization matches that.
func normalizeCamera(s string) string {
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
