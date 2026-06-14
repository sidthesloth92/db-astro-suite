package model

// ObjectTimeline is one imaged target with its aggregated totals, per-filter
// integration, equipment cross-links, and per-night session timeline.
type ObjectTimeline struct {
	ID                      string              `json:"id"`
	DisplayName             string              `json:"displayName"`
	Designation             string              `json:"designation"`
	Aliases                 []string            `json:"aliases"`
	Type                    *string             `json:"type"`     // fine type; null if unresolved
	Category                string              `json:"category"` // coarse UI bucket; "Other" if unresolved
	TotalIntegrationSeconds float64             `json:"totalIntegrationSeconds"`
	LightFrameCount         int                 `json:"lightFrameCount"`
	NightCount              int                 `json:"nightCount"`
	FirstLight              string              `json:"firstLight"`
	LatestSession           string              `json:"latestSession"`
	RA                      *float64            `json:"ra,omitempty"`  // J2000 right ascension, decimal degrees; null if unknown
	Dec                     *float64            `json:"dec,omitempty"` // J2000 declination, decimal degrees; null if unknown
	Filters                 []FilterIntegration `json:"filters"`
	EquipmentIds            []string            `json:"equipmentIds"`
	Sessions                []Session           `json:"sessions"`
	Image                   *string             `json:"image"` // always null from the CLI; the website fills it
}
