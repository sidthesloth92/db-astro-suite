package identity

import "strings"

// Coarse UI categories. Targets filter by these in the web UI.
const (
	CategoryGalaxy          = "Galaxy"
	CategoryNebula          = "Nebula"
	CategoryPlanetaryNebula = "Planetary Nebula"
	CategorySupernova       = "Supernova Remnant"
	CategoryOpenCluster     = "Open Cluster"
	CategoryGlobularCluster = "Globular Cluster"
	CategoryStar            = "Star"
	CategoryOther           = "Other"
)

// categoryForDesignation makes a best-effort category guess for a recognized
// but un-seeded designation, based on its catalog. Sharpless / LBN / LDN
// targets are nebulae; everything else is Other (we don't guess Galaxy/cluster
// from a bare NGC/IC number, which could be anything).
func categoryForDesignation(canon string) string {
	switch {
	case strings.HasPrefix(canon, "Sh2-"),
		strings.HasPrefix(canon, "LBN "),
		strings.HasPrefix(canon, "LDN "):
		return CategoryNebula
	default:
		return CategoryOther
	}
}
