package model

// EquipmentItem is a distinct, listable piece of gear (a camera, a telescope, or
// a mount) with aggregate stats and a reverse index of the objects shot with it.
type EquipmentItem struct {
	ID                      string   `json:"id"`
	Kind                    string   `json:"kind"`    // "camera" | "telescope" | "mount"
	Subtype                 string   `json:"subtype"` // e.g. mono/colour/dslr, harmonic/equatorial/tracker, refractor/sct/…; "" when unknown
	DisplayName             string   `json:"displayName"`
	FocalLengthMm           *float64 `json:"focalLengthMm"` // telescopes only; null for cameras/mounts
	FRatio                  *float64 `json:"fRatio"`        // telescopes only; null for cameras/mounts
	TotalIntegrationSeconds float64  `json:"totalIntegrationSeconds"`
	LightFrameCount         int      `json:"lightFrameCount"`
	ObjectCount             int      `json:"objectCount"`
	FirstLight              string   `json:"firstLight"`
	LatestSession           string   `json:"latestSession"`
	ObjectIds               []string `json:"objectIds"`
}
